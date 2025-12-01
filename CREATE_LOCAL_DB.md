# Создание локальной БД для разработки

## ВАЖНО: Разделение окружений

- **Локальная разработка** → `localhost:5432/it_grads_local`
- **Продакшн (itgrads.ru)** → `185.55.56.52:5432/it-connect`

Локальная БД **НЕ влияет** на продакшн!

---

## Шаг 1: Создать базу данных

Откройте pgAdmin или выполните в командной строке:

```sql
CREATE DATABASE it_grads_local;
```

Или через psql:
```bash
psql -U postgres
CREATE DATABASE it_grads_local;
\q
```

## Шаг 2: Настроить .env

Файл `.env` уже настроен на локальную БД:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/it_grads_local
```

Если у вас другой пароль PostgreSQL, измените `postgres:postgres` на `postgres:ВАШ_ПАРОЛЬ`.

## Шаг 3: Запустить миграции

```bash
npx sequelize-cli db:migrate
```

## Шаг 4: Создать тестовых пользователей (опционально)

```bash
node create-test-users.js
```

## Шаг 5: Запустить сервер

```bash
npm start
```

---

## Проверка подключения

```bash
node -e "require('./db/models').sequelize.authenticate().then(() => console.log('OK')).catch(console.error)"
```

## Сброс БД (при необходимости)

```bash
# Откат всех миграций
npx sequelize-cli db:migrate:undo:all

# Применить миграции заново
npx sequelize-cli db:migrate
```