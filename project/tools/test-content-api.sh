#!/usr/bin/env bash
# Smoke-test для сервиса content.
# Требует: users на :3005 (для получения JWT) и content на :3001.
#
# Запуск:  bash tools/test-content-api.sh
# Переменные:  USERS_URL, CONTENT_URL

set -u

USERS_URL="${USERS_URL:-http://localhost:3005}"
CONTENT_URL="${CONTENT_URL:-http://localhost:3001}"

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
    green "  ✓ $name (HTTP $actual)"
    PASS=$((PASS+1))
  else
    red   "  ✗ $name (ожидалось $expect, получено $actual)"
    [ -n "$body" ] && echo "    body: $(echo "$body" | head -c 300)"
    FAIL=$((FAIL+1)); FAILED_TESTS+=("$name")
  fi
}

check_contains() {  # check_contains <name> <substring> <string>
  local name="$1" needle="$2" hay="$3"
  if echo "$hay" | grep -qF "$needle"; then
    green "  ✓ $name"
    PASS=$((PASS+1))
  else
    red   "  ✗ $name (не найдено: $needle)"
    echo "    haystack: $(echo "$hay" | head -c 200)"
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

http_call "$CONTENT_URL/api"
check "content Swagger доступен" 200 "$HTTP_CODE" "$(echo "$BODY" | head -c 80)"
if [ "$HTTP_CODE" != "200" ]; then
  red "content недоступен. Запусти: npx nx run content:serve"
  exit 1
fi

# --- 1. токен --------------------------------------------------------------

bold "▶ Получение JWT"

EMAIL="content-smoke-$(date +%s)-$RANDOM@example.com"
PASSWORD="secret123"

http_call -X POST "$USERS_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"firstName\":\"Content\",\"lastName\":\"Tester\",\"password\":\"$PASSWORD\"}"
check "Регистрация пользователя → 201" 201 "$HTTP_CODE" "$BODY"
AUTHOR_ID=$(extract_json "id" "$BODY")
if [ -z "$AUTHOR_ID" ]; then red "Не удалось получить id автора"; exit 1; fi
green "  → author id = $AUTHOR_ID"

http_call -X POST "$USERS_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
check "Логин → 200" 200 "$HTTP_CODE" "$BODY"
TOKEN=$(extract_json "accessToken" "$BODY")
[ -z "$TOKEN" ] && { red "Нет accessToken"; exit 1; }
green "  → токен получен (${#TOKEN} символов)"

AUTH_HEADER="Authorization: Bearer $TOKEN"

# --- 2. OpenAPI ------------------------------------------------------------

bold "▶ OpenAPI content"

http_call "$CONTENT_URL/api-json"
check "OpenAPI JSON доступен" 200 "$HTTP_CODE" ""
check_contains "Есть /posts" "/posts" "$BODY"
check_contains "Есть /posts/{id}" "/posts/{id}" "$BODY"
check_contains "Есть /posts/{postId}/comments" "/posts/{postId}/comments" "$BODY"
check_contains "Есть /posts/{postId}/likes" "/posts/{postId}/likes" "$BODY"

# --- 3. создание постов всех типов ---------------------------------------

bold "▶ Создание постов"

# text
TEXT_TITLE="Текстовый пост для smoke-теста"
http_call -X POST "$CONTENT_URL/posts" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "{\"type\":\"text\",\"title\":\"$TEXT_TITLE\",\"announcement\":\"$(printf 'a%.0s' {1..60})\",\"text\":\"$(printf 'a%.0s' {1..150})\",\"tags\":[\"intro\",\"first\"]}"
check "POST /posts (text) → 201" 201 "$HTTP_CODE" "$BODY"
TEXT_ID=$(extract_json "id" "$BODY")
check_contains "type=text"        '"type":"text"'        "$BODY"
check_contains "status=published" '"status":"published"' "$BODY"
check_contains "authorId совпадает" "\"authorId\":\"$AUTHOR_ID\"" "$BODY"
check_contains "tags сохранены"   '"tags":["intro","first"]' "$BODY"

# video
http_call -X POST "$CONTENT_URL/posts" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "{\"type\":\"video\",\"title\":\"$(printf 'a%.0s' {1..25})\",\"videoUrl\":\"https://www.youtube.com/watch?v=dQw4w9WgXcQ\"}"
check "POST /posts (video) → 201" 201 "$HTTP_CODE" "$BODY"
VIDEO_ID=$(extract_json "id" "$BODY")
check_contains "type=video" '"type":"video"' "$BODY"

# quote
http_call -X POST "$CONTENT_URL/posts" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "{\"type\":\"quote\",\"quoteText\":\"$(printf 'a%.0s' {1..50})\",\"quoteAuthor\":\"Author\"}"
check "POST /posts (quote) → 201" 201 "$HTTP_CODE" "$BODY"
check_contains "type=quote" '"type":"quote"' "$BODY"

# photo
http_call -X POST "$CONTENT_URL/posts" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "{\"type\":\"photo\",\"photoId\":\"file-photo-123\"}"
check "POST /posts (photo) → 201" 201 "$HTTP_CODE" "$BODY"
check_contains "type=photo" '"type":"photo"' "$BODY"

# link
http_call -X POST "$CONTENT_URL/posts" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "{\"type\":\"link\",\"url\":\"https://example.com\",\"description\":\"Test link\"}"
check "POST /posts (link) → 201" 201 "$HTTP_CODE" "$BODY"
check_contains "type=link" '"type":"link"' "$BODY"

# --- 4. валидация ---------------------------------------------------------

bold "▶ Валидация создания"

# text: title < 20
http_call -X POST "$CONTENT_URL/posts" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "{\"type\":\"text\",\"title\":\"short\",\"announcement\":\"$(printf 'a%.0s' {1..60})\",\"text\":\"$(printf 'a%.0s' {1..150})\"}"
check "title < 20 → 400" 400 "$HTTP_CODE" "$BODY"

# text: announcement < 50
http_call -X POST "$CONTENT_URL/posts" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "{\"type\":\"text\",\"title\":\"$(printf 'a%.0s' {1..25})\",\"announcement\":\"short\",\"text\":\"$(printf 'a%.0s' {1..150})\"}"
check "announcement < 50 → 400" 400 "$HTTP_CODE" "$BODY"

# text: text < 100
http_call -X POST "$CONTENT_URL/posts" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "{\"type\":\"text\",\"title\":\"$(printf 'a%.0s' {1..25})\",\"announcement\":\"$(printf 'a%.0s' {1..60})\",\"text\":\"short\"}"
check "text < 100 → 400" 400 "$HTTP_CODE" "$BODY"

# video: не YouTube
http_call -X POST "$CONTENT_URL/posts" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "{\"type\":\"video\",\"title\":\"$(printf 'a%.0s' {1..25})\",\"videoUrl\":\"https://vimeo.com/12345\"}"
check "video не YouTube → 400" 400 "$HTTP_CODE" "$BODY"

# quote: quoteText < 20
http_call -X POST "$CONTENT_URL/posts" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "{\"type\":\"quote\",\"quoteText\":\"short\",\"quoteAuthor\":\"Author\"}"
check "quoteText < 20 → 400" 400 "$HTTP_CODE" "$BODY"

# link: не URL
http_call -X POST "$CONTENT_URL/posts" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "{\"type\":\"link\",\"url\":\"not-a-url\"}"
check "url не URL → 400" 400 "$HTTP_CODE" "$BODY"

# теги: > 8
http_call -X POST "$CONTENT_URL/posts" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "{\"type\":\"link\",\"url\":\"https://example.com\",\"tags\":[\"a1a\",\"b2b\",\"c3c\",\"d4d\",\"e5e\",\"f6f\",\"g7g\",\"h8h\",\"i9i\"]}"
check "9 тегов → 400" 400 "$HTTP_CODE" "$BODY"

# тег с пробелом
http_call -X POST "$CONTENT_URL/posts" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "{\"type\":\"link\",\"url\":\"https://example.com\",\"tags\":[\"bad tag\"]}"
check "тег с пробелом → 400" 400 "$HTTP_CODE" "$BODY"

# неизвестный type
http_call -X POST "$CONTENT_URL/posts" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "{\"type\":\"podcast\",\"title\":\"$(printf 'a%.0s' {1..25})\"}"
check "неизвестный type → 400" 400 "$HTTP_CODE" "$BODY"

# без токена
http_call -X POST "$CONTENT_URL/posts" -H "Content-Type: application/json" \
  -d "{\"type\":\"link\",\"url\":\"https://example.com\"}"
check "без токена → 401" 401 "$HTTP_CODE" "$BODY"

# --- 5. список и пагинация ------------------------------------------------

bold "▶ Список и пагинация"

http_call "$CONTENT_URL/posts?limit=5&offset=0&sortBy=date"
check "GET /posts → 200" 200 "$HTTP_CODE" ""
check_contains "Есть items" '"items"' "$BODY"
check_contains "Есть total" '"total"' "$BODY"

# limit > 25 → 400 (Max(25))
http_call "$CONTENT_URL/posts?limit=100"
check "limit=100 → 400" 400 "$HTTP_CODE" "$BODY"

# отрицательный offset
http_call "$CONTENT_URL/posts?offset=-1"
check "offset=-1 → 400" 400 "$HTTP_CODE" "$BODY"

# фильтр по типу
http_call "$CONTENT_URL/posts?type=text"
check "Фильтр type=text → 200" 200 "$HTTP_CODE" ""
check_contains "Есть items" '"items"' "$BODY"

# фильтр по тегу
http_call "$CONTENT_URL/posts?tag=intro"
check "Фильтр tag=intro → 200" 200 "$HTTP_CODE" ""

# сортировка likes / comments (пока просто проверяем, что не падает)
http_call "$CONTENT_URL/posts?sortBy=likes"
check "sortBy=likes → 200" 200 "$HTTP_CODE" ""
http_call "$CONTENT_URL/posts?sortBy=comments"
check "sortBy=comments → 200" 200 "$HTTP_CODE" ""

# --- 6. детали / update / delete -----------------------------------------

bold "▶ Детали / Update / Delete"

http_call "$CONTENT_URL/posts/$TEXT_ID"
check "GET /posts/:id → 200" 200 "$HTTP_CODE" ""
check_contains "Тот самый title" "$TEXT_TITLE" "$BODY"

http_call "$CONTENT_URL/posts/00000000-0000-0000-0000-000000000000"
check "GET несуществующего → 404" 404 "$HTTP_CODE" "$BODY"

# update
http_call -X PATCH "$CONTENT_URL/posts/$TEXT_ID" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"title":"Обновлённый заголовок поста"}'
check "PATCH /posts/:id → 200" 200 "$HTTP_CODE" "$BODY"
check_contains "title обновился" "Обновлённый заголовок поста" "$BODY"

# update чужого (создадим второго пользователя? — упростим: без токена)
http_call -X PATCH "$CONTENT_URL/posts/$TEXT_ID" -H "Content-Type: application/json" \
  -d '{"title":"Hack"}'
check "PATCH без токена → 401" 401 "$HTTP_CODE" "$BODY"

# --- 7. репост ------------------------------------------------------------

bold "▶ Репост"

http_call -X POST "$CONTENT_URL/posts/$VIDEO_ID/repost" -H "$AUTH_HEADER"
check "POST /posts/:id/repost → 200" 200 "$HTTP_CODE" "$BODY"
check_contains "isRepost=true" '"isRepost":true' "$BODY"
check_contains "originalPostId задан" "\"originalPostId\":\"$VIDEO_ID\"" "$BODY"

# повторный репост того же поста — ожидаем 4xx
http_call -X POST "$CONTENT_URL/posts/$VIDEO_ID/repost" -H "$AUTH_HEADER"
if [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "409" ]; then
  green "  ✓ Повторный репост отклонён (HTTP $HTTP_CODE)"; PASS=$((PASS+1))
else
  red "  ✗ Повторный репост должен быть 403/409, получено $HTTP_CODE"
  FAIL=$((FAIL+1)); FAILED_TESTS+=("repost twice")
fi

# --- 8. комментарии -------------------------------------------------------

bold "▶ Комментарии"

http_call -X POST "$CONTENT_URL/posts/$TEXT_ID/comments" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"text":"Это тестовый комментарий к посту"}'
check "POST comment → 201" 201 "$HTTP_CODE" "$BODY"
COMMENT_ID=$(extract_json "id" "$BODY")

http_call "$CONTENT_URL/posts/$TEXT_ID/comments"
check "GET comments → 200" 200 "$HTTP_CODE" ""
check_contains "items есть" '"items"' "$BODY"
check_contains "total есть" '"total"' "$BODY"

# валидация: короткий комментарий
http_call -X POST "$CONTENT_URL/posts/$TEXT_ID/comments" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"text":"short"}'
check "comment < 10 → 400" 400 "$HTTP_CODE" "$BODY"

# удаление своего
http_call -X DELETE "$CONTENT_URL/comments/$COMMENT_ID" -H "$AUTH_HEADER"
check "DELETE comment → 200" 200 "$HTTP_CODE" "$BODY"

# удаление несуществующего
http_call -X DELETE "$CONTENT_URL/comments/00000000-0000-0000-0000-000000000000" -H "$AUTH_HEADER"
check "DELETE несуществующего → 404" 404 "$HTTP_CODE" "$BODY"

# --- 9. лайки -------------------------------------------------------------

bold "▶ Лайки"

http_call -X POST "$CONTENT_URL/posts/$TEXT_ID/likes" -H "$AUTH_HEADER"
check "POST like → 201" 201 "$HTTP_CODE" "$BODY"

http_call "$CONTENT_URL/posts/$TEXT_ID/likes"
check "GET likes → 200" 200 "$HTTP_CODE" "$BODY"
check_contains "count=1" '"count":1' "$BODY"

# повторный лайк → 409
http_call -X POST "$CONTENT_URL/posts/$TEXT_ID/likes" -H "$AUTH_HEADER"
check "Повторный like → 409" 409 "$HTTP_CODE" "$BODY"

http_call -X DELETE "$CONTENT_URL/posts/$TEXT_ID/likes" -H "$AUTH_HEADER"
check "DELETE like → 200" 200 "$HTTP_CODE" "$BODY"

http_call "$CONTENT_URL/posts/$TEXT_ID/likes"
check "GET likes → 200" 200 "$HTTP_CODE" "$BODY"
check_contains "count=0" '"count":0' "$BODY"

# --- 10. каскадное удаление ----------------------------------------------

bold "▶ Каскадное удаление"

# создадим отдельный пост
http_call -X POST "$CONTENT_URL/posts" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "{\"type\":\"link\",\"url\":\"https://example.com/cascade\",\"description\":\"Cascade\"}"
CASCADE_ID=$(extract_json "id" "$BODY")
green "  → cascade post id = $CASCADE_ID"

# добавим комментарий и лайк
http_call -X POST "$CONTENT_URL/posts/$CASCADE_ID/comments" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"text":"Комментарий, который должен исчезнуть"}'
check "Создание комментария для каскада → 201" 201 "$HTTP_CODE" "$BODY"

http_call -X POST "$CONTENT_URL/posts/$CASCADE_ID/likes" -H "$AUTH_HEADER"
check "Создание лайка для каскада → 201" 201 "$HTTP_CODE" "$BODY"

# удаляем пост
http_call -X DELETE "$CONTENT_URL/posts/$CASCADE_ID" -H "$AUTH_HEADER"
check "DELETE post → 200" 200 "$HTTP_CODE" "$BODY"

# комментов нет
http_call "$CONTENT_URL/posts/$CASCADE_ID/comments"
check "GET comments после удаления поста → 200" 200 "$HTTP_CODE" ""
check_contains "items пустой" '"items":[]' "$BODY"

# лайков нет
http_call "$CONTENT_URL/posts/$CASCADE_ID/likes"
check "GET likes после удаления поста → 200" 200 "$HTTP_CODE" ""
check_contains "count=0" '"count":0' "$BODY"

# --- 11. итог -------------------------------------------------------------

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
