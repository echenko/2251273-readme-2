#!/usr/bin/env bash
# Smoke-test для API Gateway.
# Запуск:  bash tools/test-gateway-api.sh

set -u

GATEWAY_URL="${GATEWAY_URL:-http://localhost:3003}"
USERS_URL="${USERS_URL:-http://localhost:3005}"
CONTENT_URL="${CONTENT_URL:-http://localhost:3001}"
FILES_URL="${FILES_URL:-http://localhost:3002}"

PASS=0
FAIL=0
FAILED_TESTS=()

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

# --- 0. доступность -------------------------------------------------------

bold "▶ Доступность сервисов"
for pair in "users:$USERS_URL" "content:$CONTENT_URL" "files:$FILES_URL" "gateway:$GATEWAY_URL"; do
  name="${pair%%:*}"
  url="${pair#*:}"
  http_call "$url/api"
  check "$name Swagger" 200 "$HTTP_CODE" ""
  [ "$HTTP_CODE" != "200" ] && { red "$name недоступен"; exit 1; }
done

# --- 1. OpenAPI -----------------------------------------------------------

bold "▶ OpenAPI Gateway"
http_call "$GATEWAY_URL/api-json"
check "OpenAPI JSON" 200 "$HTTP_CODE" ""
check_contains "Есть /auth/register" "/auth/register" "$BODY"
check_contains "Есть /auth/login" "/auth/login" "$BODY"
check_contains "Есть /auth/refresh" "/auth/refresh" "$BODY"
check_contains "Есть /users/{id}" "/users/{id}" "$BODY"
check_contains "Есть /posts" "/posts" "$BODY"
check_contains "Есть /feed" "/feed" "$BODY"
check_contains "Есть /users/me/subscriptions" "/users/me/subscriptions" "$BODY"

# --- 2. JWT ---------------------------------------------------------------

bold "▶ JWT через Gateway"

EMAIL="gw-smoke-$(date +%s)-$RANDOM@example.com"
PASSWORD="secret123"

http_call -X POST "$GATEWAY_URL/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"firstName\":\"Gateway\",\"lastName\":\"Tester\",\"password\":\"$PASSWORD\"}"
check "POST /auth/register → 201" 201 "$HTTP_CODE" "$BODY"
USER_ID=$(extract_json "id" "$BODY")

http_call -X POST "$GATEWAY_URL/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
check "POST /auth/login → 200" 200 "$HTTP_CODE" "$BODY"
check_contains "accessToken" '"accessToken"' "$BODY"
check_contains "refreshToken" '"refreshToken"' "$BODY"
TOKEN=$(extract_json "accessToken" "$BODY")
[ -z "$TOKEN" ] && { red "Нет токена"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"

REFRESH=$(extract_json "refreshToken" "$BODY")
http_call -X POST "$GATEWAY_URL/auth/refresh" -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH\"}"
check "POST /auth/refresh → 200" 200 "$HTTP_CODE" "$BODY"

# --- 3. Users -------------------------------------------------------------

bold "▶ Users proxy"

http_call "$GATEWAY_URL/users/$USER_ID"
check "GET /users/:id → 200" 200 "$HTTP_CODE" "$BODY"
check_not_contains "Без passwordHash" "passwordHash" "$BODY"
check_not_contains "Без refreshTokenHash" "refreshTokenHash" "$BODY"

http_call "$GATEWAY_URL/users/not-a-valid-id"
check "GET /users/not-valid → 400" 400 "$HTTP_CODE" "$BODY"

# --- 4. Posts -------------------------------------------------------------

bold "▶ Posts proxy"

TITLE="Пост через GW $(date +%s)"
http_call -X POST "$GATEWAY_URL/posts" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"type\":\"text\",\"title\":\"$TITLE\",\"announcement\":\"$(printf 'a%.0s' {1..60})\",\"text\":\"$(printf 'a%.0s' {1..150})\"}"
check "POST /posts → 201" 201 "$HTTP_CODE" "$BODY"
POST_ID=$(extract_json "id" "$BODY")
[ -z "$POST_ID" ] && { red "Нет POST_ID"; exit 1; }

# --- 5. Агрегация --------------------------------------------------------

bold "▶ Агрегация"

http_call "$GATEWAY_URL/posts/$POST_ID"
check "GET /posts/:id → 200" 200 "$HTTP_CODE" "$BODY"
check_contains "Есть author" '"author"' "$BODY"
check_contains "author.id" "\"authorId\":\"$USER_ID\"" "$BODY"
check_contains "author.email" "\"email\":\"$EMAIL\"" "$BODY"
check_contains "likesCount" '"likesCount"' "$BODY"
check_contains "commentsCount" '"commentsCount"' "$BODY"

http_call "$GATEWAY_URL/posts?limit=5"
check "GET /posts → 200" 200 "$HTTP_CODE" "$BODY"
check_contains "Есть items" '"items"' "$BODY"
check_contains "Есть author" '"author"' "$BODY"
check_contains "Есть likesCount" '"likesCount"' "$BODY"

# --- 6. Лайки и комментарии ----------------------------------------------

bold "▶ Likes / Comments"

http_call -X POST "$GATEWAY_URL/posts/$POST_ID/likes" -H "$AUTH"
check "POST like → 201" 201 "$HTTP_CODE" "$BODY"

http_call -X POST "$GATEWAY_URL/posts/$POST_ID/comments" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"text":"Комментарий через Gateway"}'
check "POST comment → 201" 201 "$HTTP_CODE" "$BODY"

http_call "$GATEWAY_URL/posts/$POST_ID"
check_contains "likesCount=1" '"likesCount":1' "$BODY"
check_contains "commentsCount=1" '"commentsCount":1' "$BODY"

# --- 7. Подписки ---------------------------------------------------------

bold "▶ Подписки через Gateway"

EMAIL2="gw-sub-$(date +%s)-$RANDOM@example.com"
http_call -X POST "$GATEWAY_URL/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL2\",\"firstName\":\"Sub\",\"lastName\":\"Two\",\"password\":\"$PASSWORD\"}"
check "Регистрация USER2 → 201" 201 "$HTTP_CODE" "$BODY"
USER2_ID=$(extract_json "id" "$BODY")
[ -z "$USER2_ID" ] && { red "Нет USER2_ID"; exit 1; }

http_call -X POST "$GATEWAY_URL/users/$USER2_ID/subscribe" -H "$AUTH"
check "Подписка → 201" 201 "$HTTP_CODE" "$BODY"
check_contains "success=true" '"success":true' "$BODY"

http_call "$GATEWAY_URL/users/me/subscriptions" -H "$AUTH"
check "GET /users/me/subscriptions → 200" 200 "$HTTP_CODE" "$BODY"
check_contains "USER2 в подписках" "\"$USER2_ID\"" "$BODY"

http_call "$GATEWAY_URL/users/me/feed-author-ids" -H "$AUTH"
check "GET /users/me/feed-author-ids → 200" 200 "$HTTP_CODE" "$BODY"
check_contains "USER1 в feed" "\"$USER_ID\"" "$BODY"
check_contains "USER2 в feed" "\"$USER2_ID\"" "$BODY"

# --- 8. Feed --------------------------------------------------------------

bold "▶ Feed через Gateway"

http_call "$GATEWAY_URL/feed?limit=5" -H "$AUTH"
check "GET /feed → 200" 200 "$HTTP_CODE" "$BODY"
check_contains "Есть items" '"items"' "$BODY"
check_contains "Есть author" '"author"' "$BODY"
check_contains "Есть likesCount" '"likesCount"' "$BODY"

http_call "$GATEWAY_URL/feed"
check "GET /feed без токена → 401" 401 "$HTTP_CODE" "$BODY"

# Отписка
http_call -X DELETE "$GATEWAY_URL/users/$USER2_ID/subscribe" -H "$AUTH"
check "Отписка → 200" 200 "$HTTP_CODE" "$BODY"

# --- 9. Очистка ----------------------------------------------------------

bold "▶ Очистка"
http_call -X DELETE "$GATEWAY_URL/posts/$POST_ID" -H "$AUTH"
check "DELETE /posts/:id → 200" 200 "$HTTP_CODE" "$BODY"

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
