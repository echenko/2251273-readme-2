#!/usr/bin/env bash
# Smoke-test для сервиса content.
# Запуск:  bash tools/test-content-api.sh

set -u

USERS_URL="${USERS_URL:-http://localhost:3005}"
CONTENT_URL="${CONTENT_URL:-http://localhost:3001}"

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

bold "▶ Доступность"
http_call "$USERS_URL/api"
check "users Swagger" 200 "$HTTP_CODE" ""
[ "$HTTP_CODE" != "200" ] && { red "users недоступен"; exit 1; }

http_call "$CONTENT_URL/api"
check "content Swagger" 200 "$HTTP_CODE" ""
[ "$HTTP_CODE" != "200" ] && { red "content недоступен"; exit 1; }

# --- 1. токен --------------------------------------------------------------

bold "▶ JWT"

EMAIL="content-smoke-$(date +%s)-$RANDOM@example.com"
PASSWORD="secret123"

http_call -X POST "$USERS_URL/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"firstName\":\"Content\",\"lastName\":\"Tester\",\"password\":\"$PASSWORD\"}"
check "Регистрация → 201" 201 "$HTTP_CODE" "$BODY"
AUTHOR_ID=$(extract_json "id" "$BODY")

http_call -X POST "$USERS_URL/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
check "Логин → 200" 200 "$HTTP_CODE" "$BODY"
TOKEN=$(extract_json "accessToken" "$BODY")
[ -z "$TOKEN" ] && { red "Нет токена"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"

# --- 2. OpenAPI ------------------------------------------------------------

bold "▶ OpenAPI content"
http_call "$CONTENT_URL/api-json"
check "OpenAPI JSON" 200 "$HTTP_CODE" ""
check_contains "Есть /posts" "/posts" "$BODY"
check_contains "Есть /posts/feed" "/posts/feed" "$BODY"
check_contains "Есть /posts/{postId}/comments" "/posts/{postId}/comments" "$BODY"
check_contains "Есть /posts/{postId}/likes" "/posts/{postId}/likes" "$BODY"

# --- 3. создание постов --------------------------------------------------

bold "▶ Создание постов"

TITLE="Текстовый пост для smoke-теста $(date +%s)"
http_call -X POST "$CONTENT_URL/posts" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"type\":\"text\",\"title\":\"$TITLE\",\"announcement\":\"$(printf 'a%.0s' {1..60})\",\"text\":\"$(printf 'a%.0s' {1..150})\",\"tags\":[\"intro\",\"first\"]}"
check "POST /posts (text) → 201" 201 "$HTTP_CODE" "$BODY"
TEXT_ID=$(extract_json "id" "$BODY")
[ -z "$TEXT_ID" ] && { red "Нет TEXT_ID"; exit 1; }
green "  → post id = $TEXT_ID"

check_contains "type=text" '"type":"text"' "$BODY"
check_contains "status=published" '"status":"published"' "$BODY"

http_call -X POST "$CONTENT_URL/posts" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"type\":\"link\",\"url\":\"https://example.com\",\"description\":\"Test\"}"
check "POST /posts (link) → 201" 201 "$HTTP_CODE" "$BODY"

# --- 4. валидация --------------------------------------------------------

bold "▶ Валидация"

http_call -X POST "$CONTENT_URL/posts" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"type\":\"text\",\"title\":\"short\",\"announcement\":\"$(printf 'a%.0s' {1..60})\",\"text\":\"$(printf 'a%.0s' {1..150})\"}"
check "title < 20 → 400" 400 "$HTTP_CODE" "$BODY"

http_call -X POST "$CONTENT_URL/posts" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"type\":\"link\",\"url\":\"not-url\"}"
check "url не URL → 400" 400 "$HTTP_CODE" "$BODY"

http_call -X POST "$CONTENT_URL/posts" -H "Content-Type: application/json" \
  -d '{"type":"link","url":"https://example.com"}'
check "Без токена → 401" 401 "$HTTP_CODE" "$BODY"

# --- 5. список и пагинация -----------------------------------------------

bold "▶ Список и пагинация"
http_call "$CONTENT_URL/posts?limit=5&offset=0&sortBy=date"
check "GET /posts → 200" 200 "$HTTP_CODE" ""
check_contains "Есть items" '"items"' "$BODY"
check_contains "Есть total" '"total"' "$BODY"
check_contains "Есть totalPages" '"totalPages"' "$BODY"
check_contains "Есть hasNext" '"hasNext"' "$BODY"

http_call "$CONTENT_URL/posts?limit=100"
check "limit=100 → 400" 400 "$HTTP_CODE" "$BODY"

# --- 6. сортировка -------------------------------------------------------

bold "▶ Сортировка"

http_call "$CONTENT_URL/posts?sortBy=likes&limit=5"
check "sortBy=likes → 200" 200 "$HTTP_CODE" ""
check_contains "Есть items" '"items"' "$BODY"

http_call "$CONTENT_URL/posts?sortBy=comments&limit=5"
check "sortBy=comments → 200" 200 "$HTTP_CODE" ""
check_contains "Есть items" '"items"' "$BODY"

# --- 7. feed и authorId --------------------------------------------------

bold "▶ Feed и authorId"

http_call "$CONTENT_URL/posts/feed?authorIds=$AUTHOR_ID&limit=5"
check "GET /posts/feed → 200" 200 "$HTTP_CODE" ""
check_contains "Есть items" '"items"' "$BODY"
check_contains "total > 0" '"total":' "$BODY"

http_call "$CONTENT_URL/posts?authorId=$AUTHOR_ID&limit=1"
check "GET /posts?authorId= → 200" 200 "$HTTP_CODE" ""
check_contains "Есть total" '"total"' "$BODY"

# Пустой authorIds → total: 0 (фикс ревью)
http_call "$CONTENT_URL/posts/feed?authorIds=&limit=5"
check "feed с пустым authorIds → 200" 200 "$HTTP_CODE" ""
check_contains "Пустой authorIds → total:0" '"total":0' "$BODY"

# --- 8. детали / update / delete -----------------------------------------

bold "▶ Детали / Update / Delete"

http_call "$CONTENT_URL/posts/$TEXT_ID"
check "GET /posts/:id → 200" 200 "$HTTP_CODE" ""
check_contains "Тот самый title" "$TITLE" "$BODY"

http_call "$CONTENT_URL/posts/00000000-0000-0000-0000-000000000000"
check "Несуществующий → 404" 404 "$HTTP_CODE" "$BODY"

http_call -X PATCH "$CONTENT_URL/posts/$TEXT_ID" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"title":"Обновлённый заголовок поста"}'
check "PATCH /posts/:id → 200" 200 "$HTTP_CODE" "$BODY"

# --- 9. комментарии — проверка поста ------------------------------------

bold "▶ Комментарии"

# Комментарий к несуществующему посту → 404 (фикс ревью)
http_call -X POST "$CONTENT_URL/posts/00000000-0000-0000-0000-000000000000/comments" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"text":"Комментарий к несуществующему"}'
check "Comment к несуществующему → 404" 404 "$HTTP_CODE" "$BODY"

# Комментарий к существующему → 201
http_call -X POST "$CONTENT_URL/posts/$TEXT_ID/comments" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"text":"Это тестовый комментарий к посту"}'
check "POST comment → 201" 201 "$HTTP_CODE" "$BODY"
COMMENT_ID=$(extract_json "id" "$BODY")

http_call "$CONTENT_URL/posts/$TEXT_ID/comments"
check "GET comments → 200" 200 "$HTTP_CODE" ""
check_contains "Есть items" '"items"' "$BODY"
check_contains "Есть total" '"total"' "$BODY"

# Валидация
http_call -X POST "$CONTENT_URL/posts/$TEXT_ID/comments" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"text":"short"}'
check "comment < 10 → 400" 400 "$HTTP_CODE" "$BODY"

# Удаление
http_call -X DELETE "$CONTENT_URL/comments/$COMMENT_ID" -H "$AUTH"
check "DELETE comment → 200" 200 "$HTTP_CODE" "$BODY"

# --- 10. лайки — проверка поста -----------------------------------------

bold "▶ Лайки"

# Лайк к несуществующему → 404 (фикс ревью)
http_call -X POST "$CONTENT_URL/posts/00000000-0000-0000-0000-000000000000/likes" -H "$AUTH"
check "Like к несуществующему → 404" 404 "$HTTP_CODE" "$BODY"

# Лайк к существующему → 201
http_call -X POST "$CONTENT_URL/posts/$TEXT_ID/likes" -H "$AUTH"
check "POST like → 201" 201 "$HTTP_CODE" "$BODY"

http_call "$CONTENT_URL/posts/$TEXT_ID/likes"
check "GET likes → 200" 200 "$HTTP_CODE" "$BODY"
check_contains "count=1" '"count":1' "$BODY"

http_call -X POST "$CONTENT_URL/posts/$TEXT_ID/likes" -H "$AUTH"
check "Повторный like → 409" 409 "$HTTP_CODE" "$BODY"

http_call -X DELETE "$CONTENT_URL/posts/$TEXT_ID/likes" -H "$AUTH"
check "DELETE like → 200" 200 "$HTTP_CODE" "$BODY"

http_call "$CONTENT_URL/posts/$TEXT_ID/likes"
check "count=0" 200 "$HTTP_CODE" ""
check_contains "count=0" '"count":0' "$BODY"

# --- 11. каскадное удаление ---------------------------------------------

bold "▶ Каскад"

http_call -X POST "$CONTENT_URL/posts" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"type\":\"link\",\"url\":\"https://example.com/cascade\"}"
CASCADE_ID=$(extract_json "id" "$BODY")

http_call -X POST "$CONTENT_URL/posts/$CASCADE_ID/comments" -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"text":"Комментарий, который должен исчезнуть"}'
check "Comment для каскада → 201" 201 "$HTTP_CODE" "$BODY"

http_call -X POST "$CONTENT_URL/posts/$CASCADE_ID/likes" -H "$AUTH"
check "Like для каскада → 201" 201 "$HTTP_CODE" "$BODY"

http_call -X DELETE "$CONTENT_URL/posts/$CASCADE_ID" -H "$AUTH"
check "DELETE post → 200" 200 "$HTTP_CODE" "$BODY"

http_call "$CONTENT_URL/posts/$CASCADE_ID/comments"
check "Comments после удаления → 200" 200 "$HTTP_CODE" ""
check_contains "items=[]" '"items":[]' "$BODY"

http_call "$CONTENT_URL/posts/$CASCADE_ID/likes"
check "Likes после удаления → 200" 200 "$HTTP_CODE" ""
check_contains "count=0" '"count":0' "$BODY"

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
