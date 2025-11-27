# IT-Grads Deployment Guide

Полное руководство по деплою проекта IT-Grads на https://itgrads.ru/

## Архитектура

- **App Server**: 185.55.56.201 - Nginx, Frontend, Backend (Node.js + PM2)
- **DB Server**: 185.55.56.52 - PostgreSQL база данных
- **Domain**: itgrads.ru, www.itgrads.ru
- **Protocol**: HTTPS (Let's Encrypt SSL)

## Предварительные требования

### На вашем локальном компьютере:
- Git
- Node.js (v16+)
- npm
- SSH доступ к серверам (ключи настроены)
- rsync (для синхронизации файлов)

### На App Server (185.55.56.201):
- Ubuntu/Debian Linux
- Node.js (v16+)
- npm
- Nginx
- PM2 (будет установлен автоматически)
- Certbot (будет установлен автоматически)

### На DB Server (185.55.56.52):
- PostgreSQL
- База данных: `it-connect`
- Пользователь: `itgrads`

## Структура файлов деплоя

```
.
├── .deployment-vars          # Переменные для деплоя
├── deploy.sh                 # Полный деплой (первый запуск)
├── update-deployment.sh      # Быстрое обновление
├── generate-ssl.sh           # Настройка SSL сертификатов
└── server/it-grads-server/
    └── db/
        └── sync-database.js  # Автосинхронизация БД
```

## Шаг 1: Проверка подключения к серверам

Убедитесь, что вы можете подключиться к обоим серверам:

```bash
ssh root@185.55.56.201
ssh root@185.55.56.52
```

## Шаг 2: Настройка переменных окружения

Файл `.deployment-vars` уже настроен с необходимыми переменными:
- APP_SERVER_IP=185.55.56.201
- DB_SERVER_IP=185.55.56.52
- DOMAIN=www.itgrads.ru
- DB_NAME=it-connect
- DB_USER=itgrads

## Шаг 3: Первый деплой (полная установка)

Выполните полный деплой:

```bash
./deploy.sh
```

Скрипт запросит:
- **Пароль от базы данных** для пользователя `itgrads`

Скрипт автоматически:
1. ✅ Соберет frontend (npm run build)
2. ✅ Подготовит backend
3. ✅ Развернет код на сервер через rsync
4. ✅ Установит зависимости
5. ✅ Настроит PM2 для запуска backend
6. ✅ Настроит Nginx для домена itgrads.ru
7. ✅ Получит SSL сертификаты от Let's Encrypt
8. ✅ Синхронизирует схему базы данных
9. ✅ Запустит приложение

## Шаг 4: Обновление при изменениях кода

Для быстрых обновлений без полной переустановки:

```bash
./update-deployment.sh
```

Этот скрипт:
- Соберет и развернет новый код
- Установит зависимости
- Синхронизирует БД (автоматически применит изменения схемы)
- Перезапустит backend

## Автоматическая синхронизация базы данных

### Как это работает

При каждом деплое автоматически вызывается скрипт `npm run db:sync`, который:

1. Подключается к базе данных
2. Анализирует все модели Sequelize
3. Применяет изменения схемы (ALTER TABLE) без потери данных
4. Добавляет новые таблицы и колонки
5. Обновляет существующие колонки

### Ручная синхронизация

На сервере:
```bash
ssh root@185.55.56.201
cd /var/www/it-grads/server
NODE_ENV=production npm run db:sync
```

Локально (для разработки):
```bash
cd server/it-grads-server
npm run db:sync
```

### Важные замечания:
- ⚠️ Скрипт использует `alter: true` - изменяет таблицы без удаления данных
- ⚠️ НЕ использует `force: true` - данные сохраняются
- ✅ Безопасно для production
- ✅ Автоматически применяет изменения при обновлении моделей

## Конфигурация базы данных

Файл [server/it-grads-server/db/config/database.js](server/it-grads-server/db/config/database.js:1) настроен для:

- **Development**: локальная БД
- **Production**: удаленная БД на 185.55.56.52
  - Pool connections: 2-10 подключений
  - Таймаут: 60 секунд
  - Без логирования запросов

## Настройка SSL сертификатов

Если SSL не был настроен при первом деплое, выполните:

```bash
./generate-ssl.sh
```

Сертификаты будут:
- Получены от Let's Encrypt
- Настроены для itgrads.ru и www.itgrads.ru
- Автоматически обновляться каждые 90 дней

## Мониторинг и управление

### Проверка статуса backend:

```bash
ssh root@185.55.56.201 "pm2 status && pm2 logs it-grads-api --lines 10 --nostream"
```

### Просмотр логов:

```bash
ssh root@185.55.56.201 "pm2 logs it-grads-api"
```

### Перезапуск backend:

```bash
ssh root@185.55.56.201 "pm2 restart it-grads-api"
```

### Проверка Nginx:

```bash
ssh root@185.55.56.201 "nginx -t && systemctl status nginx"
```

### Проверка HTTPS:

```bash
curl -Ik https://itgrads.ru
curl -Ik https://www.itgrads.ru
```

## Структура на сервере

```
/var/www/it-grads/
├── server/               # Backend (Node.js)
│   ├── server.js
│   ├── .env.production
│   ├── db/
│   ├── routes/
│   └── middleware/
└── client/               # Frontend (static files)
    ├── index.html
    ├── assets/
    └── ...
```

## Nginx конфигурация

- **Frontend**: Статические файлы из `/var/www/it-grads/client`
- **Backend API**: Проксируется на `localhost:5001`
- **Routes**:
  - `/` → Frontend
  - `/api/*` → Backend
  - `/auth/*` → Backend
  - `/user/*` → Backend
  - `/cookies/*` → Backend

## CORS настройка

Server уже настроен для работы с доменом [server/it-grads-server/server.js:44-63]:
- https://itgrads.ru
- https://www.itgrads.ru
- Локальные адреса для разработки

## Troubleshooting

### Backend не запускается:

```bash
ssh root@185.55.56.201
cd /var/www/it-grads/server
pm2 logs it-grads-api --err
```

### Не работает соединение с БД:

Проверьте .env.production и DATABASE_URL:
```bash
ssh root@185.55.56.201
cat /var/www/it-grads/server/.env.production
```

Проверьте подключение к БД:
```bash
ssh root@185.55.56.52
sudo -u postgres psql
\l  # список баз данных
\du # список пользователей
```

### SSL проблемы:

Перегенерируйте сертификаты:
```bash
./generate-ssl.sh
```

### Frontend не отображается:

Проверьте Nginx:
```bash
ssh root@185.55.56.201
nginx -t
systemctl reload nginx
ls -la /var/www/it-grads/client/
```

## Откат к предыдущей версии

При необходимости отката:

```bash
ssh root@185.55.56.201
cd /var/www/it-grads
# Восстановите из бэкапа или git
pm2 restart it-grads-api
```

## Автоматизация

Для настройки автоматического деплоя при push в git:

1. Настройте GitHub Actions или GitLab CI/CD
2. Используйте `update-deployment.sh` в pipeline
3. Добавьте SSH ключи в CI/CD secrets

## Безопасность

- ✅ HTTPS включен (Let's Encrypt)
- ✅ Файлы .env не копируются на сервер
- ✅ Node.js запускается через PM2 (auto-restart)
- ✅ Nginx настроен с security headers
- ✅ База данных на отдельном сервере
- ⚠️ Не забудьте настроить firewall (ufw)
- ⚠️ Регулярно обновляйте систему (apt update && apt upgrade)

## Контакты и поддержка

При возникновении проблем:
1. Проверьте логи PM2 и Nginx
2. Убедитесь в доступности БД
3. Проверьте .env переменные
4. Обратитесь к команде разработки

## Полезные команды

```bash
# Быстрый статус всего приложения
ssh root@185.55.56.201 'curl -Ik https://localhost 2>&1 | head -15'

# Проверка всех сервисов
ssh root@185.55.56.201 "pm2 status && nginx -t"

# Полный перезапуск
ssh root@185.55.56.201 "pm2 restart all && systemctl reload nginx"

# Просмотр использования ресурсов
ssh root@185.55.56.201 "pm2 monit"
```

---

**Дата последнего обновления**: 2025-11-27
**Версия документа**: 1.0