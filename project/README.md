# Readme — микросервисный проект (NestJS + Nx)

5 сервисов: users, content, files, notifications, gateway.

## Запуск с нуля

### 1. Инфраструктура
docker compose -f apps/users/docker-compose.yml up -d
docker compose -f apps/content/docker-compose.yml up -d
docker compose -f apps/notifications/docker-compose.yml up -d

### 2. Зависимости
npm install

### 3. Окружение
for app in users content files notifications gateway; do
  cp "apps/$app/.env.example" "apps/$app/.env"
done

ВАЖНО: в apps/users/.env и apps/notifications/.env задайте одинаковый
непустой INTERNAL_TOKEN (например INTERNAL_TOKEN=dev-internal-token-123).

### 4. Сборка
npx nx run-many -t build

### 5. Запуск (5 терминалов)
npx nx serve users
npx nx serve content
npx nx serve files
npx nx serve notifications
npx nx serve gateway

### 6. Smoke-тесты
npm run test:all
Ожидаемо: 202/202 зелёных.
