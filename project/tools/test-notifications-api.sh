#!/usr/bin/env bash
# Smoke-test для сервиса notifications.
# Требует: notifications на :3004, MailHog на :8026 и users на :3005.
#
# Запуск:  bash tools/test-notifications-api.sh
# Переменные:  NOTIFICATIONS_URL, MAILHOG_URL, USERS_URL
set -u
NOTIFICATIONS_URL="${NOTIFICATIONS_URL:-http://localhost:3004}"
MAILHOG_URL="${MAILHOG_URL:-http://localhost:8026}"
USERS_URL="${USERS_URL:-http://localhost:3005}"

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
    echo "    haystack: $(echo "$hay" | head -c 500)"
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

# --- MailHog helpers ------------------------------------------------------
mailhog_clear() {
  curl -s -X DELETE "$MAILHOG_URL/api/v1/messages" > /dev/null 2>&1 || true
}

mailhog_count() {
  curl -s "$MAILHOG_URL/api/v2/messages" 2>/dev/null \
  | python3 -c "import json,sys; print(json.load(sys.stdin).get('total', 0))" 2>/dev/null \
  || echo 0
}

mailhog_dump() {
  curl -s "$MAILHOG_URL/api/v2/messages" 2>/dev/null | python3 -c '
import json, sys
from email import message_from_string
from email.header import decode_header, make_header
try:
  data = json.load(sys.stdin)
except Exception:
  print("")
  sys.exit(0)
out = []
for item in data.get("items", []):
  content = item.get("Content", {})
  headers = content.get("Headers", {})
  mime_lines = []
  for k, v in headers.items():
    val = v[0] if isinstance(v, list) and v else v
    mime_lines.append(f"{k}: {val}")
  mime_str = "\r\n".join(mime_lines) + "\r\n\r\n" + (content.get("Body", "") or "")
  try:
    msg = message_from_string(mime_str)
  except Exception:
    out.append(content.get("Body", "") or "")
    out.append("---END---")
    continue
  for k, v in headers.items():
    val = v[0] if isinstance(v, list) and v else v
    if k.lower() == "subject":
      try:
        val = str(make_header(decode_header(val)))
      except Exception:
        pass
    out.append(f"{k}: {val}")
  for part in msg.walk():
    if part.get_content_type() in ("text/plain", "text/html"):
      payload = part.get_payload(decode=True)
      if payload:
        charset = part.get_content_charset() or "utf-8"
        try:
          out.append(payload.decode(charset, errors="replace"))
        except Exception:
          out.append(payload.decode("utf-8", errors="replace"))
  out.append("---END---")
print("\n".join(out))
'
}

wait_for_mail() {
  local expected="$1" timeout="${2:-15}"
  local i=0
  while [ "$i" -lt "$((timeout * 2))" ]; do
    local total
    total=$(mailhog_count)
    if [ "$total" -ge "$expected" ]; then return 0; fi
    sleep 0.5
    i=$((i+1))
  done
  return 1
}

# --- 0. доступность --------------------------------------------------------
bold "▶ Доступность сервисов"
http_call "$NOTIFICATIONS_URL/api"
check "notifications Swagger доступен" 200 "$HTTP_CODE" "$(echo "$BODY" | head -c 120)"
if [ "$HTTP_CODE" != "200" ]; then
  red "notifications недоступен. Запусти: npx nx run notifications:serve"
  exit 1
fi

http_call "$MAILHOG_URL/api/v2/messages"
check "MailHog API доступен" 200 "$HTTP_CODE" "$(echo "$BODY" | head -c 120)"
if [ "$HTTP_CODE" != "200" ]; then
  red "MailHog недоступен. Запусти: docker compose -f apps/notifications/docker-compose.yml up -d"
  exit 1
fi

# --- 1. OpenAPI ------------------------------------------------------------
bold "▶ OpenAPI"
http_call "$NOTIFICATIONS_URL/api-json"
check "OpenAPI JSON доступен" 200 "$HTTP_CODE" ""
check_contains "Есть /notifications/send" "/notifications/send" "$BODY"

# --- 2. валидация ---------------------------------------------------------
bold "▶ Валидация"
http_call -X POST "$NOTIFICATIONS_URL/notifications/send" \
  -H "Content-Type: application/json" -d '{}'
check "Пустое тело → 400" 400 "$HTTP_CODE" "$BODY"

http_call -X POST "$NOTIFICATIONS_URL/notifications/send" \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","posts":[{"id":"1","title":"Test"}]}'
check "Невалидный email → 400" 400 "$HTTP_CODE" "$BODY"

http_call -X POST "$NOTIFICATIONS_URL/notifications/send" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","posts":"not-an-array"}'
check "posts не массив → 400" 400 "$HTTP_CODE" "$BODY"

# --- 3. отправка одному адресату -----------------------------------------
bold "▶ Отправка одному адресату"
mailhog_clear
sleep 0.3
check "MailHog очищен" "0" "$(mailhog_count)" ""

TARGET_EMAIL="smoke-$(date +%s)-$RANDOM@example.com"
http_call -X POST "$NOTIFICATIONS_URL/notifications/send" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TARGET_EMAIL\",\"posts\":[{\"id\":\"post-1\",\"title\":\"Первый пост\"},{\"id\":\"post-2\",\"title\":\"Второй пост\"}]}"

check "POST /notifications/send → 200" 200 "$HTTP_CODE" "$BODY"
check_contains "Ответ enqueued=1" '"enqueued":1' "$BODY"

if wait_for_mail 1 15; then
  green "  ✓ Письмо появилось в MailHog"; PASS=$((PASS+1))
else
  red "  ✗ Письмо не появилось за 15s"
  FAIL=$((FAIL+1)); FAILED_TESTS+=("mail appeared")
fi

MAIL_DUMP=$(mailhog_dump)
check_contains "Письмо для $TARGET_EMAIL" "$TARGET_EMAIL" "$MAIL_DUMP"
check_contains "Subject содержит посты" "2 новых публикаций" "$MAIL_DUMP"
check_contains "HTML содержит первый пост" "Первый пост" "$MAIL_DUMP"
check_contains "HTML содержит второй пост" "Второй пост" "$MAIL_DUMP"
check_contains "From = noreply@readme.local" "noreply@readme.local" "$MAIL_DUMP"

# --- 4. рассылка всем (РЕАЛЬНАЯ ЛОГИКА) ----------------------------------
bold "▶ Рассылка всем (без email)"
mailhog_clear
sleep 0.3

# Создаем реального пользователя, чтобы в базе был получатель для broadcast
BROADCAST_USER_EMAIL="broadcast-user-$(date +%s)-$RANDOM@example.com"
http_call -X POST "$USERS_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$BROADCAST_USER_EMAIL\",\"firstName\":\"Broadcast\",\"lastName\":\"User\",\"password\":\"secret123\"}" >/dev/null 2>&1

# Делаем запрос на рассылку БЕЗ поля email (триггерит реальное получение списка из users)
http_call -X POST "$NOTIFICATIONS_URL/notifications/send" \
  -H "Content-Type: application/json" \
  -d '{"posts":[{"id":"p1","title":"Broadcast post"}]}'

check "POST /notifications/send (без email) → 200" 200 "$HTTP_CODE" "$BODY"

# Проверяем, что enqueued > 0 (реальное количество пользователей в БД, а не захардкоженная 2)
if echo "$BODY" | grep -qE '"enqueued":[1-9]'; then
  green "  ✓ Ответ enqueued > 0 (реальное количество)"; PASS=$((PASS+1))
else
  red "  ✗ Ответ enqueued должен быть > 0"
  echo "    haystack: $BODY"
  FAIL=$((FAIL+1)); FAILED_TESTS+=("Ответ enqueued > 0")
fi

# Ожидаем минимум 1 письмо
if wait_for_mail 1 15; then
  green "  ✓ Письма появились в MailHog"; PASS=$((PASS+1))
else
  red "  ✗ Письма не появились за 15s"
  FAIL=$((FAIL+1)); FAILED_TESTS+=("broadcast mail appeared")
fi

MAIL_DUMP=$(mailhog_dump)
check_contains "HTML содержит Broadcast post" "Broadcast post" "$MAIL_DUMP"

# --- 5. итог --------------------------------------------------------------
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
