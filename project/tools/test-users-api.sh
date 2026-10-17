#!/usr/bin/env bash
# Smoke-test для сервиса users (расширенный).
# Запуск:  bash tools/test-users-api.sh
# Переменные:  BASE_URL (default http://localhost:3005)

set -u

BASE_URL="${BASE_URL:-http://localhost:3005}"
PASS=0
FAIL=0
FAILED_TESTS=()

# --- helpers ---------------------------------------------------------------

green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
red()   { printf '\033[0;31m%s\033[0m\n' "$*"; }
yellow(){ printf '\033[0;33m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }

check() {
  local name="$1" expect="$2" actual="$3" body="${4:-}"
  if [ "$expect" = "$actual" ]; then
    green "  ✓ $name (HTTP $actual)"
    PASS=$((PASS+1))
  else
    red   "  ✗ $name (ожидалось $expect, получено $actual)"
    [ -n "$body" ] && echo "    body: $body"
    FAIL=$((FAIL+1))
    FAILED_TESTS+=("$name")
  fi
}

check_contains() {  # check_contains <name> <substring> <string>
  local name="$1" needle="$2" hay="$3"
  if echo "$hay" | grep -q "$needle"; then
    green "  ✓ $name"
    PASS=$((PASS+1))
  else
    red   "  ✗ $name (не найдено: $needle)"
    echo "    haystack: $(echo "$hay" | head -c 200)"
    FAIL=$((FAIL+1)); FAILED_TESTS+=("$name")
  fi
}

check_not_contains() {
  local name="$1" needle="$2" hay="$3"
  if echo "$hay" | grep -q "$needle"; then
    red   "  ✗ $name (найдено лишнее: $needle)"
    FAIL=$((FAIL+1)); FAILED_TESTS+=("$name")
  else
    green "  ✓ $name"
    PASS=$((PASS+1))
  fi
}

extract_json() {
  echo "$2" | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\\([^\"]*\\)\".*/\\1/p" | head -n1
}

HTTP_CODE=""
BODY=""
http_call() {
  local out
  out=$(curl -s -o /tmp/resp.$$ -w "%{http_code}" "$@")
  HTTP_CODE="$out"
  BODY=$(cat /tmp/resp.$$ 2>/dev/null || true)
  rm -f /tmp/resp.$$
}

# --- 0. Swagger ------------------------------------------------------------

bold "▶ Доступность и Swagger"
http_call "$BASE_URL/api"
check "Swagger /api отвечает" 200 "$HTTP_CODE" "$(echo "$BODY" | head -c 120)"
if [ "$HTTP_CODE" != "200" ]; then
  red "Сервис недоступен. Запусти: npx nx run users:serve"
  exit 1
fi

http_call "$BASE_URL/api-json"
check "OpenAPI JSON /api-json отвечает" 200 "$HTTP_CODE" "$(echo "$BODY" | head -c 120)"
check_contains "OpenAPI содержит /auth/register" "/auth/register" "$BODY"
check_contains "OpenAPI содержит /auth/login"    "/auth/login"    "$BODY"
check_contains "OpenAPI содержит /users/{id}"    "/users/{id}"    "$BODY"
check_contains "OpenAPI содержит /users/password" "/users/password" "$BODY"

# --- 1. регистрация --------------------------------------------------------

EMAIL="smoke-$(date +%s)-$RANDOM@example.com"
PASSWORD="secret123"
FIRST="Smoke"
LAST="Tester"

bold "▶ Регистрация ($EMAIL)"
http_call -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"firstName\":\"$FIRST\",\"lastName\":\"$LAST\",\"password\":\"$PASSWORD\"}"
check "POST /auth/register → 201" 201 "$HTTP_CODE" "$BODY"
USER_ID=$(extract_json "id" "$BODY")
if [ -z "$USER_ID" ]; then red "Не удалось извлечь id"; exit 1; fi
green "  → user id = $USER_ID"

check_not_contains "Ответ без passwordHash" "passwordHash" "$BODY"
check_contains     "Ответ содержит id"        '"id"'        "$BODY"
check_contains     "Ответ содержит email"     '"email"'     "$BODY"
check_contains     "Ответ содержит registeredAt" '"registeredAt"' "$BODY"

# --- 2. регистрация с аватаром (опционально) -------------------------------

EMAIL_AV="smoke-av-$(date +%s)-$RANDOM@example.com"
http_call -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL_AV\",\"firstName\":\"$FIRST\",\"lastName\":\"$LAST\",\"password\":\"$PASSWORD\",\"avatarId\":\"file-123\"}"
check "Регистрация с avatarId → 201" 201 "$HTTP_CODE" "$BODY"
check_contains "avatarId сохранён" '"avatarId":"file-123"' "$BODY"

# --- 3. дубликат email -----------------------------------------------------

bold "▶ Дубликат email"
http_call -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"firstName\":\"$FIRST\",\"lastName\":\"$LAST\",\"password\":\"$PASSWORD\"}"
check "Дубликат → 409" 409 "$HTTP_CODE" "$BODY"
check_contains "Сообщение про email" "Email already in use" "$BODY"

# --- 4. валидация регистрации ---------------------------------------------

bold "▶ Валидация регистрации"

# пустое тело
http_call -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" -d '{}'
check "Пустое тело → 400" 400 "$HTTP_CODE" "$BODY"

# невалидный email
http_call -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","firstName":"Ivan","lastName":"Ivanov","password":"secret123"}'
check "Плохой email → 400" 400 "$HTTP_CODE" "$BODY"

# имя 2 символа
http_call -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL-2@example.com\",\"firstName\":\"Iv\",\"lastName\":\"Ivanov\",\"password\":\"$PASSWORD\"}"
check "firstName 2 символа → 400" 400 "$HTTP_CODE" "$BODY"

# имя 51 символ
LONG=$(printf 'a%.0s' {1..51})
http_call -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL-3@example.com\",\"firstName\":\"$LONG\",\"lastName\":\"Ivanov\",\"password\":\"$PASSWORD\"}"
check "firstName 51 символ → 400" 400 "$HTTP_CODE" "$BODY"

# пароль 5 символов
http_call -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL-4@example.com\",\"firstName\":\"Ivan\",\"lastName\":\"Ivanov\",\"password\":\"12345\"}"
check "password 5 символов → 400" 400 "$HTTP_CODE" "$BODY"

# пароль 13 символов
http_call -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL-5@example.com\",\"firstName\":\"Ivan\",\"lastName\":\"Ivanov\",\"password\":\"1234567890123\"}"
check "password 13 символов → 400" 400 "$HTTP_CODE" "$BODY"

# лишнее поле
http_call -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL-6@example.com\",\"firstName\":\"Ivan\",\"lastName\":\"Ivanov\",\"password\":\"$PASSWORD\",\"isAdmin\":true}"
check "Лишнее поле → 400" 400 "$HTTP_CODE" "$BODY"
check_contains "Жалуется на isAdmin" "isAdmin should not exist" "$BODY"

# неверный Content-Type
http_call -X POST "$BASE_URL/auth/register" -H "Content-Type: text/plain" -d 'hello'
check "Неправильный Content-Type → 4xx" 400 "$HTTP_CODE" "$BODY"

# --- 5. логин -------------------------------------------------------------

bold "▶ Логин"
http_call -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
check "Логин → 200" 200 "$HTTP_CODE" "$BODY"
TOKEN=$(extract_json "accessToken" "$BODY")
[ -z "$TOKEN" ] && { red "Не удалось извлечь accessToken"; exit 1; }
green "  → токен получен (${#TOKEN} символов)"

# идемпотентность
http_call -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
check "Повторный логин → 200" 200 "$HTTP_CODE" "$BODY"

# JWT — три сегмента, разделённых точкой
SEG=$(echo "$TOKEN" | awk -F. '{print NF}')
if [ "$SEG" = "3" ]; then
  green "  ✓ JWT имеет 3 сегмента"; PASS=$((PASS+1))
else
  red "  ✗ JWT не похож на JWT (сегментов: $SEG)"
  FAIL=$((FAIL+1)); FAILED_TESTS+=("JWT format")
fi

# payload содержит нужные ключи — декодируем через Node (base64url, без проблем с padding)
PAYLOAD_JSON=$(node -e '
const t = process.argv[1];
const p = t.split(".")[1];
const s = Buffer.from(p.replace(/-/g,"+").replace(/_/g,"/"), "base64").toString("utf8");
process.stdout.write(s);
' "$TOKEN" 2>/dev/null || echo "")

if [ -z "$PAYLOAD_JSON" ]; then
  red "  ✗ не удалось декодировать JWT payload"
  FAIL=$((FAIL+1)); FAILED_TESTS+=("JWT payload decode")
else
  check_contains "JWT payload содержит sub"        '"sub"'        "$PAYLOAD_JSON"
  check_contains "JWT payload содержит email"      '"email"'      "$PAYLOAD_JSON"
  check_contains "JWT payload содержит firstName"  '"firstName"'  "$PAYLOAD_JSON"
  check_contains "JWT payload содержит lastName"   '"lastName"'   "$PAYLOAD_JSON"
fi

# --- 6. негативные логины ------------------------------------------------

bold "▶ Негативные логины"
http_call -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"wrong\"}"
check "Неверный пароль → 401" 401 "$HTTP_CODE" "$BODY"

http_call -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"nobody@example.com","password":"secret123"}'
check "Несуществующий email → 401" 401 "$HTTP_CODE" "$BODY"

http_call -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d '{}'
check "Пустой логин → 400" 400 "$HTTP_CODE" "$BODY"

# --- 7. детали -----------------------------------------------------------

bold "▶ Детали пользователя"
http_call "$BASE_URL/users/$USER_ID"
check "GET /users/:id → 200" 200 "$HTTP_CODE" "$BODY"
check_not_contains "Без passwordHash" "passwordHash" "$BODY"
check_contains "Есть registeredAt"    '"registeredAt"'  "$BODY"
check_contains "Есть postsCount"      '"postsCount"'    "$BODY"
check_contains "Есть subscribersCount" '"subscribersCount"' "$BODY"

http_call "$BASE_URL/users/00000000-0000-0000-0000-000000000000"
check "Несуществующий → 404" 404 "$HTTP_CODE" "$BODY"

# --- 8. защита эндпоинтов ------------------------------------------------

bold "▶ Защита PATCH /users/password"

http_call -X PATCH "$BASE_URL/users/password" -H "Content-Type: application/json" \
  -d "{\"currentPassword\":\"$PASSWORD\",\"newPassword\":\"newsecret1\"}"
check "Без токена → 401" 401 "$HTTP_CODE" "$BODY"

http_call -X PATCH "$BASE_URL/users/password" \
  -H "Authorization: Bearer garbage" -H "Content-Type: application/json" \
  -d "{\"currentPassword\":\"$PASSWORD\",\"newPassword\":\"newsecret1\"}"
check "Битый токен → 401" 401 "$HTTP_CODE" "$BODY"

http_call -X PATCH "$BASE_URL/users/password" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
check "Пустое тело с токеном → 400" 400 "$HTTP_CODE" "$BODY"

# --- 9. смена пароля ------------------------------------------------------

bold "▶ Смена пароля"
NEW_PASSWORD="newsecret1"

http_call -X PATCH "$BASE_URL/users/password" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"currentPassword\":\"$PASSWORD\",\"newPassword\":\"$NEW_PASSWORD\"}"
check "Смена с валидным токеном → 200" 200 "$HTTP_CODE" "$BODY"

http_call -X PATCH "$BASE_URL/users/password" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"currentPassword\":\"$PASSWORD\",\"newPassword\":\"$NEW_PASSWORD\"}"
check "Повторно со старым паролем → 401" 401 "$HTTP_CODE" "$BODY"
check_contains "Сообщение про currentPassword" "Current password is incorrect" "$BODY"

# --- 10. логин с новым паролем -------------------------------------------

bold "▶ Логин с новым паролем"
http_call -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$NEW_PASSWORD\"}"
check "Логин с новым паролем → 200" 200 "$HTTP_CODE" "$BODY"

http_call -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
check "Логин со старым паролем после смены → 401" 401 "$HTTP_CODE" "$BODY"

# --- 11. итог -----------------------------------------------------------

echo
bold "═══════════════════════════════════════════"
TOTAL=$((PASS+FAIL))
if [ "$FAIL" -eq 0 ]; then
  green "✓ Все тесты прошли: $PASS/$TOTAL"
  exit 0
else
  red "✗ Провалено: $FAIL, успешно: $PASS (из $TOTAL)"
  red "Список провалов:"
  for t in "${FAILED_TESTS[@]}"; do red "  - $t"; done
  exit 1
fi
