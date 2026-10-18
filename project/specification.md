# Readme — Simple Blog Engine

Микросервисный бэкенд для многопользовательского блога на Nest.js + NX.

## Требования

- **Node.js** — актуальный LTS (≥ 20.x)
- **npm** — 10.x или новее
- **bash** — для smoke-тестов

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
│   └── shared-types/     # общие интерфейсы и DTO
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

Каждый сервис запускается отдельно (в своём терминале):

```bash
npx nx run users:serve
npx nx run content:serve
npx nx run files:serve
```

Или все сразу:

```bash
npx nx run-many --target=serve --projects=users,content,files --parallel=3
```

После запуска Swagger каждого сервиса доступен по адресу `http://localhost:<PORT>/api`:

| Сервис | Swagger |
|---|---|
| users | http://localhost:3005/api |
| content | http://localhost:3001/api |
| files | http://localhost:3002/api |

## Переменные окружения

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `JWT_SECRET` | `dev-secret` | Секрет подписи JWT (должен быть одинаковым во всех сервисах) |
| `PORT` | порт сервиса | Переопределение порта |

Пример `.env` (создать в корне `project/`):

```bash
JWT_SECRET=change-me-in-production
```

> В коде не хранятся реальные секреты. Все секреты задаются через переменные окружения.

## Smoke-тесты

Для каждого сервиса есть bash-скрипт, который проходит все ключевые сценарии.

### Запуск одного сервиса

```bash
npm run test:users     # требует users на :3005
npm run test:content   # требует users на :3005 и content на :3001
npm run test:files     # требует users на :3005 и files на :3002
```

### Полный прогон

```bash
# в отдельных терминалах
npx nx run users:serve
npx nx run content:serve
npx nx run files:serve

# в четвёртом
npm run test:all
```

Ожидаемый результат:

```
✓ Все тесты прошли: 48/48    (users)
✓ Все тесты прошли: 73/73    (content)
✓ Все тесты прошли: 26/26    (files)
```

## Реализованные сценарии

### users (`:3005`)

- Регистрация (email уникален, пароль bcrypt-хеш, аватар опционально).
- JWT-авторизация (payload: `sub`, `email`, `firstName`, `lastName`).
- Детальная информация о пользователе (без `passwordHash`).
- Смена пароля с проверкой текущего.
- Swagger / OpenAPI.

### content (`:3001`)

- Создание публикаций 5 типов: `video`, `text`, `quote`, `photo`, `link`.
- Валидация полей по ТЗ (длины, YouTube, URL, теги).
- Список с пагинацией (`limit` ≤ 25, `offset`), фильтрами (`type`, `tag`), сортировкой (`date`, `likes`, `comments`).
- Детали, редактирование (только автор), удаление (только автор).
- Репост (с `isRepost: true`, `originalPostId`, защита от повторного).
- Черновики (только автор).
- Поиск по заголовку.
- Комментарии (создание, список, удаление только своего).
- Лайки (один на пользователя, toggle, подсчёт).
- Каскадное удаление комментариев и лайков при удалении поста.

### files (`:3002`)

- Загрузка аватара (≤ 500 КБ, jpeg/png).
- Загрузка фото (≤ 1 МБ, jpg/png).
- Получение файла (bin).
- Удаление (только владелец).
- Валидация mime-типа и размера.

## Документация

- **Swagger UI**: `/api` каждого сервиса.
- **OpenAPI JSON**: `/api-json` каждого сервиса.
- Общие типы: `libs/shared-types/src`.

## Заметки

- Репозитории — **in-memory** (для учебного проекта). При перезапуске сервиса данные очищаются.
- `notifications` и `gateway` — не входят в текущий этап ДЗ, оставлены как заготовки.
- `JWT_SECRET` должен быть одинаковым во всех сервисах, иначе cross-service проверки токена не пройдут.
