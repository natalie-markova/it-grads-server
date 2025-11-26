# Dockerfile для IT-Grads Backend
FROM node:18-alpine

# Установка рабочей директории
WORKDIR /app

# Копирование package.json и package-lock.json
COPY package*.json ./

# Установка зависимостей
RUN npm ci --only=production

# Копирование остального кода
COPY . .

# Открытие порта
EXPOSE 5001

# Запуск приложения
CMD ["node", "server.js"]
