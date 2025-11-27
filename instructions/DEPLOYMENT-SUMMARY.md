# IT-Grads Deployment - Итоговая информация

## ✅ Что было сделано

### 1. Конфигурация базы данных
- ✅ Обновлен [server/it-grads-server/db/config/database.js](server/it-grads-server/db/config/database.js)
- ✅ Добавлены настройки pool connections
- ✅ Настроены параметры для production (БД на 185.55.56.52)

### 2. Автоматическая синхронизация БД
- ✅ Создан скрипт [server/it-grads-server/db/sync-database.js](server/it-grads-server/db/sync-database.js)
- ✅ Добавлена команда `npm run db:sync` в [server/it-grads-server/package.json](server/it-grads-server/package.json)
- ✅ Скрипт автоматически применяет изменения схемы БД без потери данных

### 3. CORS и домены
- ✅ Server уже настроен для работы с https://itgrads.ru в [server/it-grads-server/server.js](server/it-grads-server/server.js:44-63)
- ✅ Настроена конфигурация для клиента [client/it-grads-client/.env.production](client/it-grads-client/.env.production)

### 4. Скрипты деплоя

#### [deploy.sh](deploy.sh) - Полный деплой
- Первоначальная установка и настройка
- Установка Nginx, PM2, Certbot
- Получение SSL сертификатов
- Настройка автозапуска

#### [update-deployment.sh](update-deployment.sh) - Быстрое обновление
- Сборка и деплой нового кода
- Автоматическая синхронизация БД
- Перезапуск backend

#### [generate-ssl.sh](generate-ssl.sh) - SSL сертификаты
- Получение Let's Encrypt сертификатов
- Настройка автообновления

#### [check-deployment.sh](check-deployment.sh) - Проверка статуса
- Проверка всех компонентов системы
- Мониторинг статуса сервисов

### 5. Документация
- ✅ [DEPLOYMENT-README.md](DEPLOYMENT-README.md) - Быстрый старт
- ✅ [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) - Полное руководство
- ✅ [server/it-grads-server/.env.production.template](server/it-grads-server/.env.production.template) - Шаблон конфигурации

## 🚀 Как запустить деплой

### Первый запуск:

```bash
# 1. Проверить подключение к серверам
./check-deployment.sh

# 2. Выполнить полный деплой
./deploy.sh
```

При запуске `deploy.sh` вам нужно будет указать:
- **Пароль от базы данных** для пользователя `itgrads`

### Обновление после изменений:

```bash
./update-deployment.sh
```

## 📋 Важные моменты

### 1. Переменные окружения на сервере

При деплое автоматически создается файл `.env.production` на сервере со следующими переменными:

```env
NODE_ENV=production
PORT=5001
DATABASE_URL=postgres://itgrads:ВАШ_ПАРОЛЬ@185.55.56.52:5432/it-connect
JWT_SECRET=super_secret_access_key
JWT_REFRESH_SECRET=super_secret_refresh_key
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
```

⚠️ **После первого деплоя обязательно измените JWT секреты!**

```bash
ssh root@185.55.56.201
cd /var/www/it-grads/server
nano .env.production
# Измените JWT_SECRET и JWT_REFRESH_SECRET на случайные строки
pm2 restart it-grads-api
```

### 2. Автоматическая синхронизация базы данных

**Скрипт синхронизации автоматически запускается при каждом деплое!**

Это означает:
- ✅ Новые таблицы создаются автоматически
- ✅ Новые колонки добавляются автоматически
- ✅ Существующие колонки обновляются
- ✅ **Данные НЕ удаляются** (используется `alter: true`)

**Ручной запуск синхронизации:**
```bash
ssh root@185.55.56.201
cd /var/www/it-grads/server
NODE_ENV=production npm run db:sync
```

### 3. Текущий статус

На момент подготовки деплоя:

**App Server (185.55.56.201):**
- ✅ Доступен
- ✅ Nginx работает
- ✅ PM2 запущен (it-grads-api)
- ⚠️ Есть проблема подключения к БД (нужно проверить пароль)

**DB Server (185.55.56.52):**
- ✅ Доступен
- ⚠️ Нужно проверить настройки PostgreSQL

### 4. Проверка после деплоя

```bash
# Проверить статус PM2
ssh root@185.55.56.201 "pm2 status"

# Проверить логи
ssh root@185.55.56.201 "pm2 logs it-grads-api --lines 20"

# Проверить HTTPS
curl -Ik https://itgrads.ru

# Проверить API
curl -Ik https://itgrads.ru/api
```

## 🔧 Troubleshooting

### Проблема: Backend не подключается к БД

**Ошибка:** `password authentication failed for user "itgrads"`

**Решение:**
1. Проверьте правильность пароля в `.env.production`
2. Проверьте, что пользователь `itgrads` существует в PostgreSQL
3. Проверьте права доступа в `pg_hba.conf`

```bash
# На DB сервере
ssh root@185.55.56.52
sudo -u postgres psql
\du  # Список пользователей
\l   # Список баз данных

# Если пользователь не существует:
CREATE USER itgrads WITH PASSWORD 'ваш_пароль';
GRANT ALL PRIVILEGES ON DATABASE "it-connect" TO itgrads;
```

### Проблема: SSL сертификаты не работают

**Решение:**
```bash
./generate-ssl.sh
```

### Проблема: Frontend не отображается

**Решение:**
```bash
ssh root@185.55.56.201
ls -la /var/www/it-grads/client/
nginx -t
systemctl reload nginx
```

## 📁 Структура файлов на сервере

```
/var/www/it-grads/
├── server/                      # Backend
│   ├── server.js
│   ├── .env.production         # ⚠️ Содержит пароли!
│   ├── package.json
│   ├── db/
│   │   ├── config/database.js
│   │   ├── sync-database.js    # Авто-синхронизация БД
│   │   └── models/
│   ├── routes/
│   └── middleware/
│
└── client/                      # Frontend (static files)
    ├── index.html
    ├── assets/
    └── ...
```

## 🌐 Endpoints

- **Frontend:** https://itgrads.ru
- **Backend API:** https://itgrads.ru/api
- **Auth:** https://itgrads.ru/auth
- **User:** https://itgrads.ru/user
- **Cookies:** https://itgrads.ru/cookies

## 🔐 Безопасность

После деплоя:

1. ✅ Измените JWT секреты в `.env.production`
2. ✅ Настройте firewall (ufw)
3. ✅ Регулярно обновляйте систему
4. ✅ Мониторьте логи

```bash
# Настройка firewall
ssh root@185.55.56.201
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

## 📞 Контакты

**Серверы:**
- App Server: 185.55.56.201
- DB Server: 185.55.56.52

**Domain:** https://itgrads.ru

**PM2 App:** it-grads-api

---

## Следующие шаги

1. ✅ Выполните `./deploy.sh` для первого деплоя
2. ⚠️ Проверьте и исправьте подключение к базе данных
3. ⚠️ Измените JWT секреты в production
4. ✅ Проверьте работу сайта на https://itgrads.ru
5. ✅ Настройте автоматический деплой через CI/CD (опционально)

**Удачного деплоя! 🚀**