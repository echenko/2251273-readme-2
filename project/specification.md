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

## Заметки

- `users` использует MongoDB (Mongoose), `content` и `files` — in-memory (для учебного проекта).
- `notifications` и `gateway` — не входят в текущий этап ДЗ.
- `JWT_SECRET` должен быть одинаковым во всех сервисах.
- `USE_MONGODB=false` переключает users на in-memory (fallback для отладки).
