# IT-Grads Deployment - Quick Start

## Быстрый старт для деплоя на https://itgrads.ru/

### 1. Проверка подключения к серверам

```bash
./check-deployment.sh
```

### 2. Первый деплой (выполнить один раз)

```bash
./deploy.sh
```

При запуске скрипт запросит пароль от базы данных для пользователя `itgrads`.

**Что делает скрипт:**
- ✅ Собирает frontend и backend
- ✅ Развертывает на сервер 185.55.56.201
- ✅ Настраивает Nginx для домена itgrads.ru
- ✅ Получает SSL сертификаты (Let's Encrypt)
- ✅ Настраивает PM2 для автозапуска backend
- ✅ Синхронизирует базу данных
- ✅ Запускает приложение

**Время выполнения:** ~5-10 минут

### 3. Обновление кода (быстрый деплой)

После внесения изменений в код:

```bash
./update-deployment.sh
```

**Что делает скрипт:**
- Собирает новый код
- Развертывает изменения
- Синхронизирует БД (автоматически применяет изменения схемы)
- Перезапускает backend

**Время выполнения:** ~2-3 минуты

### 4. Автоматическая синхронизация базы данных

**При каждом деплое автоматически запускается:**
```bash
npm run db:sync
```

Этот скрипт:
- ✅ Анализирует модели Sequelize
- ✅ Применяет изменения схемы (ALTER TABLE)
- ✅ Добавляет новые таблицы и колонки
- ✅ **НЕ удаляет данные** (использует `alter: true`, а не `force: true`)

**Ручной запуск синхронизации на сервере:**
```bash
ssh root@185.55.56.201
cd /var/www/it-grads/server
NODE_ENV=production npm run db:sync
```

### 5. Полезные команды

#### Проверка статуса:
```bash
ssh root@185.55.56.201 "pm2 status && pm2 logs it-grads-api --lines 10 --nostream"
```

#### Просмотр логов:
```bash
ssh root@185.55.56.201 "pm2 logs it-grads-api"
```

#### Перезапуск backend:
```bash
ssh root@185.55.56.201 "pm2 restart it-grads-api"
```

#### Проверка HTTPS:
```bash
curl -Ik https://itgrads.ru
```

### 6. Структура проекта

```
.
├── deploy.sh                    # Полный деплой
├── update-deployment.sh         # Быстрое обновление
├── check-deployment.sh          # Проверка статуса
├── generate-ssl.sh              # Настройка SSL
├── .deployment-vars             # Переменные деплоя
│
├── client/it-grads-client/      # Frontend (React)
│   ├── .env.production          # API: https://itgrads.ru/api
│   └── dist/                    # Собранные файлы
│
└── server/it-grads-server/      # Backend (Node.js)
    ├── .env.production          # DB: 185.55.56.52
    ├── server.js
    └── db/
        ├── config/database.js   # Конфигурация БД
        └── sync-database.js     # Авто-синхронизация
```

### 7. Архитектура

```
User → https://itgrads.ru
         ↓
    Nginx (App Server: 185.55.56.201)
         ├─→ Frontend (Static files)
         └─→ Backend (PM2 → Node.js :5001)
                ↓
           PostgreSQL (DB Server: 185.55.56.52)
```

### 8. API Endpoints

**Frontend:** https://itgrads.ru
**Backend API:** https://itgrads.ru/api
**Auth:** https://itgrads.ru/auth
**User:** https://itgrads.ru/user

### 9. Мониторинг

После деплоя проверьте:
1. Frontend: https://itgrads.ru
2. Backend health: `curl https://itgrads.ru/api`
3. PM2 status: `ssh root@185.55.56.201 "pm2 status"`

### 10. Troubleshooting

#### Backend не запускается:
```bash
ssh root@185.55.56.201
cd /var/www/it-grads/server
pm2 logs it-grads-api --err
cat .env.production
```

#### Проблемы с БД:
```bash
# Проверить соединение
ssh root@185.55.56.201
cd /var/www/it-grads/server
NODE_ENV=production npm run db:sync
```

#### SSL не работает:
```bash
./generate-ssl.sh
```

### 11. Переменные окружения

**Server (.env.production):**
```env
NODE_ENV=production
PORT=5001
DATABASE_URL=postgres://itgrads:PASSWORD@185.55.56.52:5432/it-connect
```

**Client (.env.production):**
```env
VITE_API_URL=https://itgrads.ru/api
```

### 12. Безопасность

- ✅ HTTPS включен (Let's Encrypt)
- ✅ База данных на отдельном сервере
- ✅ Автоматическое обновление SSL (каждые 90 дней)
- ✅ PM2 автозапуск при перезагрузке сервера

### Дополнительная информация

Подробное руководство: [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)

---

**Контакты:**
- Domain: https://itgrads.ru
- App Server: 185.55.56.201
- DB Server: 185.55.56.52