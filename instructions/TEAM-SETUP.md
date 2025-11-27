# Настройка для командной работы

## 1. Подключение удаленного Git репозитория

### Если репозиторий еще не создан на GitHub/GitLab:

```bash
# На GitHub/GitLab создайте новый репозиторий (например, it-grads)
# Затем выполните:
cd "c:\Users\PC\Desktop\Elbrus\Final project"
git remote add origin https://github.com/YOUR_USERNAME/it-grads.git
git push -u origin deploy
```

### Если репозиторий уже существует:

```bash
git remote add origin YOUR_REPO_URL
git push -u origin deploy
```

## 2. Получение проекта другими участниками

### Первый раз (клонирование):

```bash
git clone https://github.com/YOUR_USERNAME/it-grads.git
cd it-grads
git checkout deploy
```

### Получение обновлений:

```bash
git pull origin deploy
```

## 3. Синхронизация БД с изменениями из Git

### Автоматическая синхронизация БД

Когда участник команды делает изменения в моделях БД и пушит в Git:

**На сервере (production):**
```bash
# После git pull изменений
./deploy-docker-remote.sh
```

Этот скрипт автоматически:
- Загружает изменения на сервер
- Перестраивает Docker контейнеры
- **Запускает `db:sync`** - синхронизирует схему БД без потери данных

**Для локальной разработки в DBeaver:**

1. Участник делает изменения в коде (например, добавляет новую модель в Sequelize)
2. Пушит изменения в Git
3. Запускает локально:
```bash
cd server/it-grads-server
npm run db:sync
```

Это синхронизирует удаленную БД (185.55.56.52) с новой схемой.

4. В DBeaver изменения появятся автоматически - просто обновите (F5) список таблиц

## 4. Настройка DBeaver для участников команды

Каждый участник должен настроить подключение к удаленной БД:

**Connection Settings:**
- Host: 185.55.56.52
- Port: 5432
- Database: postgres
- Username: postgres
- Password: (пусто)
- SSL: Disable

**После подключения:**
- Все изменения в DBeaver будут сразу видны всем участникам
- Изменения схемы делаются через Sequelize модели + `npm run db:sync`

## 5. Workflow для команды

### Разработчик делает изменения в моделях БД:

```bash
# 1. Получить последние изменения
git pull origin deploy

# 2. Внести изменения в модели (например, server/it-grads-server/db/models/)

# 3. Синхронизировать БД локально
cd server/it-grads-server
npm run db:sync

# 4. Проверить в DBeaver что изменения применились

# 5. Закоммитить и запушить
git add .
git commit -m "Add new User fields"
git push origin deploy
```

### Другие участники получают изменения:

```bash
# 1. Получить изменения из Git
git pull origin deploy

# 2. Синхронизировать БД
cd server/it-grads-server
npm run db:sync

# 3. Обновить DBeaver (F5)
```

### Деплой на production:

```bash
# Запустить из корня проекта
./deploy-docker-remote.sh
```

Это автоматически синхронизирует production БД с изменениями.

## 6. Git Hooks для автоматизации (опционально)

Можно настроить автоматический `db:sync` после `git pull`:

**Создайте `.git/hooks/post-merge`:**

```bash
#!/bin/bash
cd server/it-grads-server
npm run db:sync
echo "✅ Database synchronized"
```

```bash
chmod +x .git/hooks/post-merge
```

Теперь после каждого `git pull` БД будет автоматически синхронизироваться.

## 7. Важные замечания

### ⚠️ Безопасность БД:

Текущая настройка БД **НЕ безопасна для production** (нет пароля, открыт доступ).

Рекомендуется:
1. Установить пароль для PostgreSQL
2. Ограничить доступ только для нужных IP адресов
3. Использовать SSH туннель для DBeaver

### 📝 Миграции vs Sync:

- `db:sync` (текущее решение): автоматически изменяет схему, но может потерять данные при сложных изменениях
- Миграции (лучше для production): контролируемые изменения схемы

Для production рекомендуется перейти на миграции:
```bash
npx sequelize-cli migration:generate --name add-new-field
```

## 8. DBeaver: просмотр изменений в реальном времени

В DBeaver можно настроить автообновление:
1. Правый клик на подключение → Properties
2. Connection → Auto-commit: ON
3. Metadata → Auto-refresh: ON

Или просто нажимайте F5 для ручного обновления после синхронизации.
