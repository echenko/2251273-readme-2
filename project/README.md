# Readme — микросервисный проект «Readme» (NestJS + Nx)

| Сервис        | Порт | Swagger |
|---------------|------|---------|
| users         | 3005 | http://localhost:3005/api |
| content       | 3001 | http://localhost:3001/api |
| files         | 3002 | http://localhost:3002/api |
| notifications | 3004 | http://localhost:3004/api |
| gateway       | 3003 | http://localhost:3003/api |

Инфраструктура: MongoDB, PostgreSQL, RabbitMQ, MailHog (UI: http://localhost:8026).
Требования: Node.js 20+, Docker, ~4 ГБ RAM.

## Быстрый старт

### 1. Инфраструктура
```bash
docker compose -f apps/users/docker-compose.yml up -d
docker compose -f apps/content/docker-compose.yml up -d
docker compose -f apps/notifications/docker-compose.yml up -d
```

### 2. Файлы окружения (обязательны все 5)
Должны существовать:
- `apps/users/.env`
- `apps/content/.env`
- `apps/files/.env`
- `apps/notifications/.env`
- `apps/gateway/.env`

Создание из готовых примеров (все dev-значения уже внутри):
```bash
for app in users content files notifications gateway; do
  cp "apps/$app/.env.example" "apps/$app/.env"
done
```

**Единственная ручная правка:** в `apps/users/.env` и `apps/notifications/.env`
задайте одинаковый непустой `INTERNAL_TOKEN` (например `dev-internal-token-123`).
В `.env.example` он пустой намеренно (секреты не в репозитории).

Ключевые переменные по файлам (полный список — в `.env.example`):

| Файл | Ключевые переменные |
|------|---------------------|
| users | `PORT=3005`, `MONGO_*`, `JWT_*_SECRET`, `INTERNAL_TOKEN=` (заполнить) |
| content | `PORT=3001`, `DATABASE_URL=postgresql://readme:readme_password@localhost:5433/readme_content?schema=public`, `JWT_ACCESS_SECRET` |
| files | `PORT=3002`, `JWT_ACCESS_SECRET`, лимиты/хранилище |
| notifications | `PORT=3004`, `RABBITMQ_URL`, `SMTP_*`, `USERS_URL`, `CONTENT_URL`, `INTERNAL_TOKEN=` (заполнить) |
| gateway | `PORT=3003`, `USERS_URL`, `CONTENT_URL`, `FILES_URL`, `JWT_ACCESS_SECRET` |

### 3. Зависимости
```bash
npm install
```

### 4. Сборка
```bash
npx prisma generate
npx nx run-many -t build
```

### 5. Запуск (5 терминалов)
```bash
npx nx serve users
npx nx serve content
npx nx serve files
npx nx serve notifications
npx nx serve gateway
```

### 6. Smoke-тесты
```bash
npm run test:all
```

## Частые проблемы
- `@prisma/client did not initialize yet` → созданы ли все 5 `.env`? Затем `npx prisma generate` и пересборка.
- `Missing ... DATABASE_URL` при generate → нет `apps/content/.env` (шаг 2).
- Порт занят / сервис не отвечает → `pkill -f "nx serve"`, освободить 3001–3005.
- Странный путь к `main.js` → распакуйте проект в путь без пробелов и скобок.

## Структура
- `apps/` — микросервисы и шлюз
- `libs/shared-types` — общие DTO и типы
- `tools/` — bash smoke-тесты
- `prisma/` — схема PostgreSQL (content)
