# Создание локальной БД для разработки

## Шаг 1: Создать базу данных

Откройте pgAdmin или выполните в командной строке:

```sql
CREATE DATABASE itgrads_dev;
```

Или через psql:
```bash
psql -U postgres
CREATE DATABASE itgrads_dev;
\q
```

## Шаг 2: Обновите пароль в .env.local

Откройте файл `.env.local` и измените пароль PostgreSQL на ваш локальный:

```env
DATABASE_URL=postgres://postgres:ВАШ_ПАРОЛЬ@localhost:5432/itgrads_dev
```

## Шаг 3: Запустить миграции

```bash
npm run db:sync
```

## Шаг 4: Создать тестовых пользователей

```bash
node create-test-users.js
```

## Шаг 5: Запустить сервер

```bash
npm start
```