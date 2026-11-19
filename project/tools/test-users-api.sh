#!/usr/bin/env bash
# Smoke-test для сервиса users.
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
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }

check() {
  local name="$1" expect="$2" actual="$3" body="${4:-}"
  if [ "$expect" = "$actual" ]; then
    green "  ✓ $name (HTTP $actual)"; PASS=$((PASS+1))
  else
    red "  ✗ $name (ожидалось $expect, получено $actual)"
    [ -n "$body" ] && echo "    body: $(echo "$body" | head -c 300)"
    FAIL=$((FAIL+1)); FAILED_TESTS+=("$name")
  fi
}

check_contains() {
  local name="$1" needle="$2" hay="$3"
  if echo "$hay" | grep -qF "$needle"; then
    green "  ✓ $name"; PASS=$((PASS+1))
  else
    red "  ✗ $name (не найдено: $needle)"
    echo "    haystack: $(echo "$hay" | head -c 400)"
    FAIL=$((FAIL+1)); FAILED_TESTS+=("$name")
  fi
}

check_not_contains() {
  local name="$1" needle="$2" hay="$3"
  if echo "$hay" | grep -qF "$needle"; then
    red "  ✗ $name (найдено лишнее: $needle)"
    FAIL=$((FAIL+1)); FAILED_TESTS+=("$name")
  else
    green "  ✓ $name"; PASS=$((PASS+1))
  fi
}

extract_json() {
  echo "$2" | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\\([^\"]*\\)\".*/\\1/p" | head -n1
}

HTTP_CODE=""
BODY=""
http_call() {
  local response
  response=$(curl -s --max-time 10 -w "\n%{http_code}" "$@" 2>/dev/null)
  HTTP_CODE=$(echo "$response" | tail -n1)
  BODY=$(echo "$response" | sed '$d')
  [ -z "$HTTP_CODE" ] && HTTP_CODE="000"
}

# --- 0. Swagger ------------------------------------------------------------

bold "▶ Доступность и Swagger"
http_call "$BASE_URL/api"
check "Swagger /api отвечает" 200 "$HTTP_CODE" ""
if [ "$HTTP_CODE" != "200" ]; then
  red "Сервис недоступен. Запусти: npx nx run users:serve"
  exit 1
fi

http_call "$BASE_URL/api-json"
check "OpenAPI JSON /api-json" 200 "$HTTP_CODE" ""
check_contains "OpenAPI содержит /auth/register" "/auth/register" "$BODY"
check_contains "OpenAPI содержит /auth/refresh" "/auth/refresh" "$BODY"
check_contains "OpenAPI содержит /users/{id}" "/users/{id}" "$BODY"
check_contains "OpenAPI содержит /users/me/subscriptions" "/users/me/subscriptions" "$BODY"

# --- 1. регистрация --------------------------------------------------------

EMAIL="smoke-$(date +%s)-$RANDOM@example.com"
PASSWORD="secret123"

bold "▶ Регистрация ($EMAIL)"
http_call -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"firstName\":\"Smoke\",\"lastName\":\"Tester\",\"password\":\"$PASSWORD\"}"
check "POST /auth/register → 201" 201 "$HTTP_CODE" "$BODY"
USER_ID=$(extract_json "id" "$BODY")
[ -z "$USER_ID" ] && { red "Нет USER_ID"; exit 1; }
green "  → user id = $USER_ID"

check_not_contains "Без passwordHash" "passwordHash" "$BODY"
check_contains "Есть email" '"email"' "$BODY"
check_contains "Есть registeredAt" '"registeredAt"' "$BODY"

# --- 2. дубликат email ----------------------------------------------------

bold "▶ Дубликат email"
http_call -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"firstName\":\"Smoke\",\"lastName\":\"Tester\",\"password\":\"$PASSWORD\"}"
check "Дубликат → 409" 409 "$HTTP_CODE" "$BODY"

# --- 3. валидация ----------------------------------------------------------

bold "▶ Валидация регистрации"
http_call -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" -d '{}'
check "Пустое тело → 400" 400 "$HTTP_CODE" "$BODY"

http_call -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" \
  -d '{"email":"bad","firstName":"Iv","lastName":"Test","password":"123"}'
check "Невалидные поля → 400" 400 "$HTTP_CODE" "$BODY"

# --- 4. логин -------------------------------------------------------------

bold "▶ Логин"
http_call -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
check "POST /auth/login → 200" 200 "$HTTP_CODE" "$BODY"
TOKEN=$(extract_json "accessToken" "$BODY")
REFRESH_TOKEN=$(extract_json "refreshToken" "$BODY")
[ -z "$TOKEN" ] && { red "Нет токена"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"
green "  → токен получен (${#TOKEN} символов)"

check_contains "Есть refreshToken" '"refreshToken"' "$BODY"

http_call -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"wrong\"}"
check "Неверный пароль → 401" 401 "$HTTP_CODE" "$BODY"

# --- 5. refresh ------------------------------------------------------------

bold "▶ Refresh"

http_call -X POST "$BASE_URL/auth/refresh" -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
check "POST /auth/refresh → 200" 200 "$HTTP_CODE" "$BODY"
check_contains "Новая пара: accessToken" '"accessToken"' "$BODY"

http_call -X POST "$BASE_URL/auth/refresh" -H "Content-Type: application/json" \
  -d '{"refreshToken":"garbage"}'
check "Битый refresh → 401" 401 "$HTTP_CODE" "$BODY"

http_call -X POST "$BASE_URL/auth/refresh" -H "Content-Type: application/json" -d '{}'
check "Пустой refresh → 400" 400 "$HTTP_CODE" "$BODY"

# --- 6. детали ------------------------------------------------------------

bold "▶ Детали пользователя"

http_call "$BASE_URL/users/$USER_ID"
check "GET /users/:id → 200" 200 "$HTTP_CODE" "$BODY"
check_not_contains "Без passwordHash" "passwordHash" "$BODY"
check_not_contains "Без refreshTokenHash" "refreshTokenHash" "$BODY"
check_contains "Есть postsCount" '"postsCount"' "$BODY"
check_contains "Есть subscribersCount" '"subscribersCount"' "$BODY"

http_call "$BASE_URL/users/not-a-valid-id"
check "Невалидный ObjectId → 400" 400 "$HTTP_CODE" "$BODY"

http_call "$BASE_URL/users/000000000000000000000000"
check "Несуществующий → 404" 404 "$HTTP_CODE" "$BODY"

# --- 7. подписки ---------------------------------------------------------

bold "▶ Подписки"

# Второй пользователь
EMAIL2="sub-$(date +%s)-$RANDOM@example.com"
http_call -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL2\",\"firstName\":\"Sub\",\"lastName\":\"Target\",\"password\":\"$PASSWORD\"}"
check "Регистрация USER2 → 201" 201 "$HTTP_CODE" "$BODY"
USER2_ID=$(extract_json "id" "$BODY")
[ -z "$USER2_ID" ] && { red "Нет USER2_ID"; exit 1; }

# Подписка на себя → 400
http_call -X POST "$BASE_URL/users/$USER_ID/subscribe" -H "$AUTH"
check "Подписка на себя → 400" 400 "$HTTP_CODE" "$BODY"

# Подписка на USER2 → 200
http_call -X POST "$BASE_URL/users/$USER2_ID/subscribe" -H "$AUTH"
check "Подписка на USER2 → 201" 201 "$HTTP_CODE" "$BODY"
check_contains "success=true" '"success":true' "$BODY"

# Мои подписки
http_call "$BASE_URL/users/me/subscriptions" -H "$AUTH"
check "GET /users/me/subscriptions → 200" 200 "$HTTP_CODE" "$BODY"
check_contains "USER2 в подписках" "\"$USER2_ID\"" "$BODY"

# Подписчики USER2
http_call "$BASE_URL/users/$USER2_ID/subscribers"
check "GET /users/:id/subscribers → 200" 200 "$HTTP_CODE" "$BODY"
check_contains "USER1 в подписчиках" "\"$USER_ID\"" "$BODY"

# Feed-author-ids
http_call "$BASE_URL/users/me/feed-author-ids" -H "$AUTH"
check "GET /users/me/feed-author-ids → 200" 200 "$HTTP_CODE" "$BODY"
check_contains "USER1 в feed" "\"$USER_ID\"" "$BODY"
check_contains "USER2 в feed" "\"$USER2_ID\"" "$BODY"

# subscribersCount в деталях USER2
http_call "$BASE_URL/users/$USER2_ID"
check "GET /users/:id (USER2) → 200" 200 "$HTTP_CODE" "$BODY"
check_contains "subscribersCount=1" '"subscribersCount":1' "$BODY"

# Отписка
http_call -X DELETE "$BASE_URL/users/$USER2_ID/subscribe" -H "$AUTH"
check "Отписка → 200" 200 "$HTTP_CODE" "$BODY"

http_call "$BASE_URL/users/me/subscriptions" -H "$AUTH"
check "После отписки → 200" 200 "$HTTP_CODE" ""
check_contains "пустой массив" '[]' "$BODY"

# --- 8. смена пароля -----------------------------------------------------

bold "▶ Смена пароля"
NEW_PASSWORD="newsecret1"

http_call -X PATCH "$BASE_URL/users/password" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"currentPassword\":\"$PASSWORD\",\"newPassword\":\"$NEW_PASSWORD\"}"
check "Смена пароля → 200" 200 "$HTTP_CODE" "$BODY"

http_call -X PATCH "$BASE_URL/users/password" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"currentPassword\":\"$PASSWORD\",\"newPassword\":\"$NEW_PASSWORD\"}"
check "Повтор со старым → 401" 401 "$HTTP_CODE" "$BODY"

http_call -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$NEW_PASSWORD\"}"
check "Логин с новым паролем → 200" 200 "$HTTP_CODE" "$BODY"

# --- итог ----------------------------------------------------------------

echo
bold "═══════════════════════════════════════════"
TOTAL=$((PASS+FAIL))
if [ "$FAIL" -eq 0 ]; then
  green "✓ Все тесты прошли: $PASS/$TOTAL"
  exit 0
else
  red "✗ Провалено: $FAIL, успешно: $PASS (из $TOTAL)"
  for t in "${FAILED_TESTS[@]}"; do red "  - $t"; done
  exit 1
fi
