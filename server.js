// Load environment variables
const fs = require("fs");
const path = require("path");

// Priority: .env.production > .env.local > .env
if (fs.existsSync(path.join(__dirname, ".env.production"))) {
  require("dotenv").config({ path: path.join(__dirname, ".env.production") });
  console.log("📝 Loaded .env.production");
} else if (fs.existsSync(path.join(__dirname, ".env.local"))) {
  require("dotenv").config({ path: path.join(__dirname, ".env.local") });
  console.log("📝 Loaded .env.local");
} else {
  require("dotenv").config();
  console.log("📝 Loaded .env");
}

const express = require("express");
const https = require("https");
const http = require("http");
const { Server } = require("socket.io");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const db = require("./db/models");
const redisClient = require("./config/redis");
const { i18nMiddleware } = require("./config/i18n");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const cookieRoutes = require("./routes/cookie.routes");
const interviewRoutes = require("./routes/interview.routes");
const roadmapRoutes = require("./routes/roadmap.routes");
const vacancyRoutes = require("./routes/vacancy.routes");
const resumeRoutes = require("./routes/resume.routes");
const skillsRoutes = require("./routes/skills.routes");
const applicationRoutes = require("./routes/application.routes");
const favoriteRoutes = require("./routes/favorite.routes");
const reviewRoutes = require("./routes/review.routes");
const chatRoutes = require("./routes/chat.routes");
const codeBattleRoutes = require("./routes/codebattle.routes");
const interviewTrackerRoutes = require("./routes/interviewTracker.routes");
const developmentPlanRoutes = require("./routes/developmentPlan.routes");
const assistantRoutes = require("./routes/assistant.routes");
const codeBattleSocket = require("./services/codeBattleSocket.service");
const scheduler = require("./services/scheduler.service");

const PORT = process.env.PORT || 5001;
const app = express();

// SSL configuration for local development
const sslPath = path.join(__dirname, "../../ssl");
let httpsOptions = null;

if (
  fs.existsSync(path.join(sslPath, "cert.pem")) &&
  fs.existsSync(path.join(sslPath, "key.pem"))
) {
  httpsOptions = {
    key: fs.readFileSync(path.join(sslPath, "key.pem")),
    cert: fs.readFileSync(path.join(sslPath, "cert.pem")),
  };
  console.log("🔐 SSL certificates found - HTTPS enabled");
} else {
  console.log("⚠️  No SSL certificates found - Running on HTTP");
}

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(i18nMiddleware);

// Раздача статических файлов (загруженные аватары)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      "https://localhost:3000",
      "https://localhost:3001",
      "https://localhost:5173",
      "http://192.168.0.3:3000",
      "http://127.0.0.1:3000",
      "https://www.itgrads.ru",
      "https://itgrads.ru",
      "http://www.itgrads.ru",
      "http://itgrads.ru",
      "http://185.55.56.201",
      "https://185.55.56.201",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/api/users", authRoutes);
app.use("/api/tokens", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/cookies", cookieRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/roadmaps", roadmapRoutes);
app.use("/api/vacancies", vacancyRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/skills", skillsRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/reviews", reviewRoutes);
// Маршрут для рейтингов компаний (использует reviewRoutes, но с префиксом /api/companies)
app.use("/api/companies", reviewRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/codebattle", codeBattleRoutes);
app.use("/api/interview-tracker", interviewTrackerRoutes);
app.use("/api/development-plan", developmentPlanRoutes);
app.use("/api/assistant", assistantRoutes);

(async () => {
  try {
    // Подключение к базе данных PostgreSQL
    await db.sequelize.authenticate();
    console.log("✔  PostgreSQL connected");

    let server;

    // Создание HTTPS или HTTP сервера в зависимости от наличия SSL сертификатов
    if (httpsOptions) {
      // Запуск HTTPS сервера
      server = https.createServer(httpsOptions, app);
      server.listen(PORT, () => {
        console.log(`🚀  HTTPS Server on https://localhost:${PORT}`);
        console.log(`🔐  SSL enabled for local development`);
      });
    } else {
      // Запуск HTTP сервера (если нет SSL)
      server = http.createServer(app);
      server.listen(PORT, () => {
        console.log(`🚀  HTTP Server on http://localhost:${PORT}`);
      });
    }

    // Инициализация Socket.IO для WebSocket соединений
    const io = new Server(server, {
      cors: {
        // Список разрешённых адресов для подключения (локальные и продакшн)
        origin: [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:5173",
          "https://localhost:3000",
          "https://localhost:3001",
          "https://localhost:5173",
          "http://192.168.0.3:3000",
          "http://127.0.0.1:3000",
          "https://www.itgrads.ru",
          "https://itgrads.ru",
          "http://www.itgrads.ru",
          "http://itgrads.ru",
          "http://185.55.56.201",
          "https://185.55.56.201",
        ],
        credentials: true,
        methods: ["GET", "POST"],
      },
    });

    console.log("✔  WebSocket (Socket.IO) initialized");

    // Инициализация Code Battle WebSocket
    codeBattleSocket.initialize(io);
    console.log("✔  Code Battle WebSocket initialized");

    // Запуск планировщика задач (синхронизация Codeforces раз в день)
    scheduler.start();
    console.log("✔  Scheduler service started");

    // Middleware для аутентификации WebSocket соединений
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      try {
        // Верифицировать токен и извлечь userId
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "ACCESS_SECRET_KEY"
        );
        socket.handshake.auth.userId = decoded.userId;
        console.log(`🔐 WebSocket authenticated: User ${decoded.userId}`);
        next();
      } catch (error) {
        console.error("WebSocket authentication error:", error.message);
        return next(new Error("Authentication error: Invalid token"));
      }
    });

    // Обработчик WebSocket подключений
    io.on("connection", socket => {
      const userId = socket.handshake.auth.userId;
      console.log("✅ User connected:", socket.id, "userId:", userId);

      // Присоединить пользователя к его личной комнате для получения уведомлений
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined personal room: user-${userId}`);

      // Присоединиться к чату (с проверкой доступа)
      socket.on('join-chat', async (chatId) => {
        try {
          // Проверяем, существует ли чат и имеет ли пользователь к нему доступ
          const chat = await db.Chat.findByPk(chatId);

          if (!chat) {
            console.log(`❌ Chat ${chatId} not found`);
            return socket.emit('join-chat-error', { error: 'Chat not found' });
          }

          // Проверяем, является ли пользователь участником этого чата
          if (chat.user1Id !== userId && chat.user2Id !== userId) {
            console.log(`❌ User ${userId} has no access to chat ${chatId}`);
            return socket.emit('join-chat-error', { error: 'Access denied' });
          }

          socket.join(`chat-${chatId}`);
          console.log(`✅ User ${socket.id} (userId: ${userId}) joined chat ${chatId}`);
        } catch (error) {
          console.error('Error joining chat:', error);
          socket.emit('join-chat-error', { error: 'Failed to join chat' });
        }
      });

      // Покинуть чат
      socket.on("leave-chat", chatId => {
        socket.leave(`chat-${chatId}`);
        console.log(`User ${socket.id} left chat ${chatId}`);
      });

      // Отправка сообщения
      socket.on("send-message", async data => {
        const { chatId, message } = data;
        try {
          // Получить информацию о чате
          const chat = await db.Chat.findByPk(chatId);
          if (!chat) {
            return socket.emit("message-error", { error: "Chat not found" });
          }

          // Сохранить сообщение в БД
          const savedMessage = await db.Message.create({
            chatId: chatId,
            content: message,
            senderId: socket.handshake.auth.userId,
            isRead: false,
          });

          // Обновить lastMessageAt в чате
          await chat.update({ lastMessageAt: new Date() });

          // Определить получателя
          const recipientId =
            chat.user1Id === socket.handshake.auth.userId
              ? chat.user2Id
              : chat.user1Id;

          // Отправить сообщение всем в комнате чата
          io.to(`chat-${chatId}`).emit("new-message", {
            id: savedMessage.id,
            chatId: savedMessage.chatId,
            content: savedMessage.content,
            senderId: savedMessage.senderId,
            isRead: savedMessage.isRead,
            createdAt: savedMessage.createdAt,
            updatedAt: savedMessage.updatedAt,
          });

          // Отправить уведомление получателю в его личную комнату
          io.to(`user-${recipientId}`).emit("notification-unread", {
            chatId: savedMessage.chatId,
            senderId: savedMessage.senderId,
          });

          console.log(
            `✉️  Message sent in chat ${chatId} by user ${savedMessage.senderId} to user ${recipientId}`
          );
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit("message-error", { error: "Failed to send message" });
        }
      });

      // Обработчик отключения пользователя
      socket.on("disconnect", () => {
        console.log("❌ User disconnected:", socket.id);
      });
    });

    // Делаем io доступным для использования в маршрутах
    app.set("io", io);
  } catch (err) {
    console.error("✖  DB connection error:", err);
  }
})();
// restart trigger
