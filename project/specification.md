# Readme — Simple Blog Engine

Микросервисный бэкенд для многопользовательского блога на Nest.js + NX.

## Требования

- **Node.js** — актуальный LTS (≥ 20.x)
- **npm** — 10.x или новее
- **bash** — для smoke-тестов
- **Docker** — для MongoDB (сервис users)

## Структура проекта

```
project/
├── apps/
│   ├── gateway/          # точка входа (API Gateway)      :3003
│   ├── users/            # пользователи, авторизация       :3005
│   ├── content/          # публикации, комментарии, лайки  :3001
│   ├── notifications/    # email-уведомления (позже)       :3004
│   └── files/            # файлы (аватары, фото)           :3002
├── libs/
│   └── shared-types/     # общие интерфейсы, DTO, константы
├── tools/
│   ├── test-users-api.sh
│   ├── test-content-api.sh
│   └── test-files-api.sh
├── specification.md
└── package.json
```

## Установка

```bash
cd project
npm install
```

## Запуск сервисов

### Предварительно: MongoDB для users

```bash
cd apps/users
docker compose up -d
cd ../..
```

Подробнее — в разделе «Запуск MongoDB (users)».

### Сервисы

```bash
npx nx run users:serve    # требует MongoDB (:27018)
npx nx run content:serve  # in-memory
npx nx run files:serve    # in-memory
```

Или все сразу:

```bash
npx nx run-many --target=serve --projects=users,content,files --parallel=3
```

Swagger: `http://localhost:<PORT>/api`:

| Сервис | Swagger |
|---|---|
| users | http://localhost:3005/api |
| content | http://localhost:3001/api |
| files | http://localhost:3002/api |

## Переменные окружения

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `JWT_SECRET` | `dev-secret` | Секрет подписи JWT (одинаковый во всех сервисах) |
| `JWT_REFRESH_SECRET` | `dev-refresh-secret` | Секрет подписи refresh-токенов |
| `PORT` | порт сервиса | Переопределение порта |
| `MONGODB_URI` | — | Строка подключения к MongoDB (только users) |
| `USE_MONGODB` | `false` | `true` — MongoDB, `false` — in-memory (только users) |

## Запуск MongoDB (users)

Сервис `users` использует MongoDB. Для локального запуска — Docker Compose.

### 1. Запуск контейнеров

```bash
cd apps/users
docker compose up -d
docker compose ps
```

Ожидаемо — два контейнера `Up`:

| Контейнер | Порт |
|---|---|
| `readme-users-mongo` | `27018` (наружу), `27017` (внутри) |
| `readme-users-mongo-express` | `8082` (веб-интерфейс) |

### 2. Настройка .env

```bash
cd apps/users
cp .env.example .env
```

Ключевые переменные:

| Переменная | Назначение |
|---|---|
| `MONGODB_URI` | строка подключения к MongoDB |
| `USE_MONGODB` | `true` — MongoDB, `false` — in-memory fallback |

**Важно:** `MONGODB_URI` должен содержать готовые значения, а не `${MONGO_USER}`. `@nestjs/config` не раскрывает `${}` из `.env`.

### 3. Администрирование

Веб-интерфейс Mongo Express: http://localhost:8082

### 4. Переключение на in-memory

Установи `USE_MONGODB=false` в `apps/users/.env` — сервис будет использовать `InMemoryUsersRepository`. Smoke-тесты проходят в обоих режимах: 48/48.

### 5. Остановка

```bash
cd apps/users
docker compose down
```

Данные сохраняются в `apps/users/mongo-data/` (в `.gitignore`).

## Smoke-тесты

### Запуск одного сервиса

```bash
npm run test:users     # требует users на :3005 и MongoDB
npm run test:content   # требует users на :3005 и content на :3001
npm run test:files     # требует users на :3005 и files на :3002
```

### Полный прогон

```bash
npm run test:all
```

Ожидаемый результат:

```
✓ Все тесты прошли: 48/48    (users)
✓ Все тесты прошли: 73/73    (content)
✓ Все тесты прошли: 26/26    (files)
```

## Реализованные сценарии

### users (:3005) — с MongoDB

- Регистрация (email уникален, пароль bcrypt-хеш, аватар опционально).
- JWT-авторизация (payload: sub, email, firstName, lastName).
- Детальная информация о пользователе (без passwordHash).
- Смена пароля с проверкой текущего.
- Переключение репозитория через `USE_MONGODB`.
- Swagger / OpenAPI.

### content (:3001) — in-memory

- Создание публикаций 5 типов: video, text, quote, photo, link.
- Валидация полей по ТЗ (длины, YouTube, URL, теги).
- Список с пагинацией, фильтрами (type, tag), сортировкой (date, likes, comments).
- Детали, редактирование, удаление (только автор).
- Репост (isRepost, originalPostId, защита от повторного).
- Черновики, поиск по заголовку.
- Комментарии (создание, список, удаление своего).
- Лайки (toggle, подсчёт).
- Каскадное удаление комментариев и лайков.

### files (:3002) — in-memory

- Загрузка аватара (≤ 500 КБ, jpeg/png).
- Загрузка фото (≤ 1 МБ, jpg/png).
- Получение файла (bin).
- Удаление (только владелец).
- Валидация mime-типа и размера.

## Документация

- Swagger UI: /api каждого сервиса.
- OpenAPI JSON: /api-json каждого сервиса.
- Общие типы и константы: `libs/shared-types/src`.



## Refresh-токены

Сервис `users` выдаёт **пару токенов** при логине:
- `accessToken` — живёт 15 минут, используется для авторизации.
- `refreshToken` — живёт 7 дней, хранится хешем (bcrypt) в MongoDB.

### Получение пары

```bash
curl -X POST http://localhost:3005/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"password\":\"secret123\"}"
```

Ответ:

```json
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

### Обновление пары

```bash
curl -X POST http://localhost:3005/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"eyJ...\"}"
```

Ответ — новая пара. Старый refresh-токен **инвалидируется** (rotation).

### Env

```env
JWT_SECRET=dev-secret
JWT_REFRESH_SECRET=dev-refresh-secret
```

> Оба секрета должны быть одинаковыми на всех сервисах (сейчас используется только в `users`).



## Notifications (RabbitMQ + MailHog)

Сервис `notifications` (:3004) принимает HTTP-запрос на рассылку, ставит задачи в RabbitMQ, а consumer асинхронно отправляет письма через SMTP (MailHog).

### 1. Запуск контейнеров

```bash
cd apps/notifications
docker compose up -d
docker compose ps
```

| Контейнер | Порт | Назначение |
|---|---|---|
| `readme-notifications-rabbitmq` | `5673` (AMQP), `15673` (UI) | Брокер сообщений |
| `readme-notifications-mailhog` | `1026` (SMTP), `8026` (UI) | Fake SMTP |
| `readme-notifications-mongo` | `27019` | MongoDB (для будущих задач) |

### 2. Запуск сервиса

```bash
npx nx run notifications:serve
```

Лог:
```
🚀 Notifications service on http://localhost:3004/api
📥 RabbitMQ consumer on queue: readme_notifications
```

### 3. Отправка письма

```bash
curl -X POST http://localhost:3004/notifications/send \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"posts\":[{\"id\":\"1\",\"title\":\"Test\"}]}"
```

Ответ: `{"enqueued":1}`. Письмо появится в MailHog UI: http://localhost:8026

### 4. RabbitMQ Management

http://localhost:15673 — `readme` / `readme_password`. Queue: `readme_notifications`.

### 5. Env

```env
RABBITMQ_URI=amqp://readme:readme_password@localhost:5673
RABBITMQ_QUEUE=readme_notifications
SMTP_HOST=localhost
SMTP_PORT=1026
SMTP_FROM=noreply@readme.local
```

### 6. Архитектура

```
POST /notifications/send
        ↓
NotificationsService.enqueue()
        ↓ (client.emit)
RabbitMQ queue: readme_notifications
        ↓ (@EventPattern)
NotificationsConsumer.handleSendEmail()
        ↓
MailService.sendNewPostsEmail() → SMTP → MailHog
```

## Заметки

- `users` использует MongoDB (Mongoose), `content` и `files` — in-memory (для учебного проекта).
- `notifications` и `gateway` — не входят в текущий этап ДЗ.
- `JWT_SECRET` должен быть одинаковым во всех сервисах.
- `USE_MONGODB=false` переключает users на in-memory (fallback для отладки).


## Запуск PostgreSQL (content)

Сервис `content` использует PostgreSQL 14 + Prisma ORM (в режиме `USE_PRISMA=true`).

### 1. Запуск контейнеров

```bash
cd apps/content
docker compose up -d
docker compose ps
```

Ожидаемо — `readme-content-postgres Up (healthy)` и `readme-content-pgadmin Up (healthy)`.

| Контейнер | Порт |
|---|---|
| `readme-content-postgres` | `5433` (наружу), `5432` (внутри) |
| `readme-content-pgadmin` | `8083` (веб-интерфейс) |

### 2. Настройка .env

`apps/content/.env` содержит:
- `POSTGRES_*` — для docker-compose;
- `DATABASE_URL` — для Prisma;
- `USE_PRISMA` — `true` (Prisma) / `false` (in-memory).

### 3. Prisma-команды

```bash
npx nx run content:db-validate   # проверка схемы
npx nx run content:db-generate   # генерация Prisma Client
npx nx run content:db-migrate    # миграции
npx nx run content:db-reset      # сброс БД
npx nx run content:db-fill       # seed (2 поста)
```

### 4. PgAdmin

http://localhost:8083 — `admin@readme.local` / `admin`.
При подключении к серверу: host `postgres`, port `5432`, user `readme`, password `readme_password`, db `readme_content`.

### 5. Переключение режимов

- `USE_PRISMA=false` — in-memory (по умолчанию, smoke-тесты 73/73).
- `USE_PRISMA=true` — Prisma + Postgres (базовый CRUD, без сортировки по likes/comments).
