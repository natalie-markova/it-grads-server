# IT-Grads Project

Платформа для поиска работы и проведения интервью для IT специалистов.

## 🚀 Быстрый старт для участников команды

### 1. Клонирование репозитория

```bash
git clone YOUR_REPO_URL
cd it-grads
git checkout deploy
```

### 2. Автоматическая настройка

```bash
./setup-team-member.sh
```

Этот скрипт:
- Установит все зависимости (client + server)
- Настроит git hooks для автоматической синхронизации БД
- Синхронизирует схему БД с удаленным сервером

### 3. Настройка DBeaver (для работы с БД)

**Параметры подключения:**
- Host: `185.55.56.52`
- Port: `5432`
- Database: `postgres`
- Username: `postgres`
- Password: (оставьте пустым)
- SSL: Disable

### 4. Локальная разработка

**Frontend:**
```bash
cd client/it-grads-client
npm run dev
```
Откроется: https://localhost:3000

**Backend:**
```bash
cd server/it-grads-server
npm run dev
```
API будет доступен на: http://localhost:5001

## 📝 Workflow для командной работы

### Получение последних изменений

```bash
git pull origin deploy
```

Git hook автоматически синхронизирует БД, если были изменения в моделях.

### Внесение изменений в БД

1. Измените модели в `server/it-grads-server/db/models/`
2. Синхронизируйте БД:
```bash
cd server/it-grads-server
npm run db:sync
```
3. Проверьте изменения в DBeaver (F5 для обновления)
4. Закоммитьте изменения:
```bash
git add .
git commit -m "Update User model"
git push origin deploy
```

### Просмотр изменений в DBeaver

После того как коллега запушил изменения в моделях БД:

```bash
git pull origin deploy  # Автоматически запустит db:sync
```

В DBeaver нажмите F5 для обновления структуры таблиц.

## 🐳 Deployment на production

### Деплой на itgrads.ru

```bash
./deploy-docker-remote.sh
```

Этот скрипт:
- Загружает код на сервер (185.55.56.201)
- Собирает Docker образы
- Запускает контейнеры
- Автоматически синхронизирует production БД

### Проверка статуса на production

```bash
ssh root@185.55.56.201 "cd /var/www/it-grads && docker-compose ps"
```

### Логи production

```bash
ssh root@185.55.56.201 "cd /var/www/it-grads && docker-compose logs -f"
```

## 🗂️ Структура проекта

```
it-grads/
├── client/it-grads-client/      # React frontend (Vite + Rsbuild)
├── server/it-grads-server/      # Node.js backend (Express + Sequelize)
├── config/nginx/                # Nginx конфигурация
├── docker-compose.yml           # Docker orchestration
├── deploy-docker-remote.sh      # Deployment скрипт
├── setup-team-member.sh         # Настройка для новых участников
└── TEAM-SETUP.md               # Детальная документация
```

## 🔧 Полезные команды

### Git

```bash
git status                    # Проверить статус
git pull origin deploy        # Получить изменения
git push origin deploy        # Отправить изменения
```

### Database

```bash
npm run db:sync              # Синхронизировать схему БД
```

### Docker (на production)

```bash
ssh root@185.55.56.201 "cd /var/www/it-grads && docker-compose restart"
ssh root@185.55.56.201 "cd /var/www/it-grads && docker-compose logs backend"
```

## 📚 Документация

- [TEAM-SETUP.md](./TEAM-SETUP.md) - Детальная настройка для команды
- [DOCKER-DEPLOY.md](./DOCKER-DEPLOY.md) - Информация о deployment
- [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - Полное руководство по deployment

## 🌐 Production URLs

- **Site**: https://itgrads.ru
- **API**: https://itgrads.ru/api
- **App Server**: 185.55.56.201
- **DB Server**: 185.55.56.52

## ⚙️ Tech Stack

**Frontend:**
- React 18
- React Router
- Axios
- Rsbuild (Vite-based)

**Backend:**
- Node.js
- Express
- Sequelize ORM
- PostgreSQL

**DevOps:**
- Docker & Docker Compose
- Nginx (reverse proxy)
- Let's Encrypt (SSL)

## 🤝 Contributing

1. Получите последние изменения: `git pull origin deploy`
2. Создайте feature branch: `git checkout -b feature/my-feature`
3. Сделайте изменения и коммит: `git commit -m "Add feature"`
4. Push в свою ветку: `git push origin feature/my-feature`
5. Создайте Pull Request в ветку `deploy`

## 📞 Поддержка

Если возникли проблемы, проверьте:
1. Все зависимости установлены: `npm install`
2. БД синхронизирована: `npm run db:sync`
3. DBeaver подключен к правильному серверу (185.55.56.52)
