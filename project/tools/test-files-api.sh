#!/usr/bin/env bash
# Smoke-test для сервиса files.
# Требует: users на :3005 (для JWT) и files на :3002.
#
# Запуск:  bash tools/test-files-api.sh
# Переменные:  USERS_URL, FILES_URL

set -u

USERS_URL="${USERS_URL:-http://localhost:3005}"
FILES_URL="${FILES_URL:-http://localhost:3002}"

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
    echo "    haystack: $(echo "$hay" | head -c 300)"
    FAIL=$((FAIL+1)); FAILED_TESTS+=("$name")
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

# --- 0. доступность --------------------------------------------------------

bold "▶ Доступность сервисов"

http_call "$USERS_URL/api"
check "users Swagger доступен" 200 "$HTTP_CODE" "$(echo "$BODY" | head -c 80)"
if [ "$HTTP_CODE" != "200" ]; then
  red "users недоступен. Запусти: npx nx run users:serve"
  exit 1
fi

http_call "$FILES_URL/api"
check "files Swagger доступен" 200 "$HTTP_CODE" "$(echo "$BODY" | head -c 80)"
if [ "$HTTP_CODE" != "200" ]; then
  red "files недоступен. Запусти: npx nx run files:serve"
  exit 1
fi

# --- 1. JWT ---------------------------------------------------------------

bold "▶ Получение JWT"

EMAIL="files-smoke-$(date +%s)-$RANDOM@example.com"
PASSWORD="secret123"

http_call -X POST "$USERS_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"firstName\":\"Files\",\"lastName\":\"Tester\",\"password\":\"$PASSWORD\"}"
check "Регистрация → 201" 201 "$HTTP_CODE" "$BODY"

http_call -X POST "$USERS_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
check "Логин → 200" 200 "$HTTP_CODE" "$BODY"
TOKEN=$(extract_json "accessToken" "$BODY")
[ -z "$TOKEN" ] && { red "Не удалось получить accessToken"; exit 1; }
AUTH_HEADER="Authorization: Bearer $TOKEN"
green "  → токен получен (${#TOKEN} символов)"

# --- 2. OpenAPI -----------------------------------------------------------

bold "▶ OpenAPI files"

http_call "$FILES_URL/api-json"
check "OpenAPI JSON → 200" 200 "$HTTP_CODE" ""
check_contains "Есть /files/avatar" "/files/avatar" "$BODY"
check_contains "Есть /files/photo"  "/files/photo"  "$BODY"
check_contains "Есть /files/{id}"   "/files/{id}"   "$BODY"

# --- 3. подготовка тестовых файлов ---------------------------------------

# 1×1 PNG
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82' > /tmp/test-files-1x1.png

# текстовый файл (для проверки mime)
echo "hello" > /tmp/test-files.txt

# большой файл > 1 MB (для проверки размера)
head -c 1200000 /dev/zero > /tmp/test-files-big.png 2>/dev/null || dd if=/dev/zero of=/tmp/test-files-big.png bs=1024 count=1200 status=none

# --- 4. валидация --------------------------------------------------------

bold "▶ Валидация"

# не картинка
http_call -X POST "$FILES_URL/files/avatar" -H "$AUTH_HEADER" \
  -F "file=@/tmp/test-files.txt;type=text/plain"
check "не картинка → 400" 400 "$HTTP_CODE" "$BODY"

# без файла
http_call -X POST "$FILES_URL/files/avatar" -H "$AUTH_HEADER"
check "без файла → 400" 400 "$HTTP_CODE" "$BODY"

# без токена
http_call -X POST "$FILES_URL/files/avatar" \
  -F "file=@/tmp/test-files-1x1.png;type=image/png"
check "без токена → 401" 401 "$HTTP_CODE" "$BODY"

# большой файл как avatar (> 500 KB)
http_call -X POST "$FILES_URL/files/avatar" -H "$AUTH_HEADER" \
  -F "file=@/tmp/test-files-big.png;type=image/png"
check "avatar > 500KB → 400" 400 "$HTTP_CODE" "$BODY"

# большой файл как photo (> 1 MB)
head -c 1500000 /dev/zero > /tmp/test-files-huge.png 2>/dev/null || dd if=/dev/zero of=/tmp/test-files-huge.png bs=1024 count=1500 status=none
http_call -X POST "$FILES_URL/files/photo" -H "$AUTH_HEADER" \
  -F "file=@/tmp/test-files-huge.png;type=image/png"
check "photo > 1MB → 400" 400 "$HTTP_CODE" "$BODY"

# --- 5. аватар -----------------------------------------------------------

bold "▶ Аватар"

http_call -X POST "$FILES_URL/files/avatar" -H "$AUTH_HEADER" \
  -F "file=@/tmp/test-files-1x1.png;type=image/png"
check "avatar → 201" 201 "$HTTP_CODE" "$BODY"
AVATAR_ID=$(extract_json "id" "$BODY")
green "  → avatar id = $AVATAR_ID"
check_contains "kind=avatar" '"kind":"avatar"' "$BODY"
check_contains "mimeType image/png" '"mimeType":"image/png"' "$BODY"
check_contains "url присутствует" '/files/' "$BODY"
check_contains "ownerId присутствует" '"ownerId"' "$BODY"

# --- 6. фото -------------------------------------------------------------

bold "▶ Фото"

http_call -X POST "$FILES_URL/files/photo" -H "$AUTH_HEADER" \
  -F "file=@/tmp/test-files-1x1.png;type=image/png"
check "photo → 201" 201 "$HTTP_CODE" "$BODY"
PHOTO_ID=$(extract_json "id" "$BODY")
green "  → photo id = $PHOTO_ID"
check_contains "kind=photo" '"kind":"photo"' "$BODY"

# --- 7. получение -------------------------------------------------------

bold "▶ Получение файла"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FILES_URL/files/$AVATAR_ID")
check "GET /files/:id → 200" 200 "$CODE" ""
# content-type должен быть image/png — но http_call не сохраняет заголовки,
# поэтому проверяем через отдельный curl -I
CT=$(curl -s -o /dev/null -w "%{content_type}" "$FILES_URL/files/$AVATAR_ID")
if echo "$CT" | grep -qF "image/png"; then
  green "  ✓ Content-Type: $CT"; PASS=$((PASS+1))
else
  red "  ✗ Content-Type ожидался image/png, получено: $CT"
  FAIL=$((FAIL+1)); FAILED_TESTS+=("Content-Type")
fi

http_call "$FILES_URL/files/00000000-0000-0000-0000-000000000000"
check "GET несуществующего → 404" 404 "$HTTP_CODE" "$BODY"

# --- 8. удаление --------------------------------------------------------

bold "▶ Удаление"

http_call -X DELETE "$FILES_URL/files/$PHOTO_ID" -H "$AUTH_HEADER"
check "DELETE /files/:id → 200" 200 "$HTTP_CODE" "$BODY"

http_call "$FILES_URL/files/$PHOTO_ID"
check "GET после DELETE → 404" 404 "$HTTP_CODE" "$BODY"

http_call -X DELETE "$FILES_URL/files/$AVATAR_ID"
check "DELETE без токена → 401" 401 "$HTTP_CODE" "$BODY"

# --- 9. итог ------------------------------------------------------------

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
