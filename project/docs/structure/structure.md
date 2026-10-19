# Структура проекта «Readme»

* Яндекс доска: [«Readme»](https://boards.yandex.ru/whiteboard/?hash=e870f6afb3b730bca0e793f78234f93e).

## apps - (приложения).

### gateway - (точка входа).
PORT: 3003

### users - (пользователи).
PORT: 3005

Метод	Маршрут	Назначение	Доступ
POST	/auth/register	Регистрация	Аноним
POST	/auth/login	Авторизация, выдача JWT	Аноним
GET	/users/:id	Детальная информация о пользователе	Аноним
PATCH	/users/password	Смена пароля	Авторизован
POST	/users/:id/subscribe	Подписаться	Авторизован
DELETE	/users/:id/subscribe	Отписаться	Авторизован
GET	/users/:id/subscribers	Список подписчиков	Аноним
GET	/users/:id/subscriptions	Список подписок	Аноним

### content - (публикации, комментарии, лайки).
PORT: 3001

Метод	Маршрут	Назначение	Доступ
Публикации:
POST	/posts	Создать публикацию (5 типов)	Авторизован
GET	/posts	Список публикаций (пагинация, сортировка, фильтры)	Аноним
GET	/posts/:id	Детальная информация	Аноним
PATCH	/posts/:id	Редактировать	Автор
DELETE	/posts/:id	Удалить (каскад комментариев)	Автор
POST	/posts/:id/repost	Репост	Авторизован
GET	/posts/drafts	Черновики пользователя	Автор
GET	/posts/search?q=	Поиск по заголовку	Аноним
GET	/feed	Моя лента	Авторизован
GET	/tags/:tag/posts	Публикации по тегу	Аноним
Комментарии:
POST	/posts/:postId/comments	Создать комментарий	Авторизован
GET	/posts/:postId/comments	Список комментариев (50, пагинация)	Аноним
DELETE	/comments/:id	Удалить свой комментарий	Автор
Лайки:
POST	/posts/:postId/likes	Поставить лайк	Авторизован
DELETE	/posts/:postId/likes	Убрать лайк	Авторизован
GET	/posts/:postId/likes	Количество лайков	Аноним

### notifications - (уведомления).
PORT: 3004

### files - (файлы).
PORT: 3002

Метод	Маршрут	Назначение	Доступ
POST	/files/avatar	Загрузка аватара (≤500 КБ, jpeg/png)	Авторизован
POST	/files/photo	Загрузка фото для публикации (≤1 МБ, jpg/png)	Авторизован
GET	/files/:id	Получить файл	Аноним
DELETE	/files/:id	Удалить файл	Автор

## libs - (библиотеки).

## infra - (конфиги).

## tools - (автоматизация).

## docs - (документация).
