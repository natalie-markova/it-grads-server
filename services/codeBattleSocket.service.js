const db = require('../db/models');
const codeExecutor = require('./codeExecutor.service');

/**
 * Сервис для управления PvP матчами через WebSocket
 */
class CodeBattleSocketService {
  constructor() {
    this.io = null;
    this.matchmakingQueue = new Map(); // difficulty -> [{userId, socketId, rating, timestamp}]
    this.activeMatches = new Map();    // matchId -> {match, timers, players}
    this.privateRooms = new Map();     // roomCode -> {hostId, hostSocketId, difficulty, taskId}
  }

  /**
   * Инициализация Socket.IO
   */
  initialize(io) {
    this.io = io;

    io.on('connection', (socket) => {
      const userId = socket.handshake.auth.userId;

      if (!userId) return;

      // Присоединение к комнате Code Battle
      socket.on('codebattle:join', () => {
        socket.join(`codebattle-user-${userId}`);
        console.log(`⚔️ User ${userId} joined Code Battle`);
      });

      // Поиск матча
      socket.on('codebattle:find-match', (data) => {
        this.handleFindMatch(socket, userId, data);
      });

      // Отмена поиска
      socket.on('codebattle:cancel-search', () => {
        this.handleCancelSearch(userId);
      });

      // Создание приватной комнаты
      socket.on('codebattle:create-room', (data) => {
        this.handleCreateRoom(socket, userId, data);
      });

      // Присоединение к приватной комнате
      socket.on('codebattle:join-room', (data) => {
        this.handleJoinRoom(socket, userId, data);
      });

      // Отправка кода в матче
      socket.on('codebattle:submit-code', (data) => {
        this.handleSubmitCode(socket, userId, data);
      });

      // Покинуть матч
      socket.on('codebattle:leave-match', (data) => {
        this.handleLeaveMatch(socket, userId, data);
      });

      // Синхронизация прогресса (опционально)
      socket.on('codebattle:progress-update', (data) => {
        this.handleProgressUpdate(socket, userId, data);
      });

      // Отключение
      socket.on('disconnect', () => {
        this.handleDisconnect(userId);
      });
    });

    // Периодическая проверка matchmaking
    setInterval(() => this.processMatchmaking(), 3000);
  }

  /**
   * Поиск матча
   */
  async handleFindMatch(socket, userId, { difficulty = 'medium', timeLimit = 300 }) {
    try {
      // Получаем рейтинг игрока
      let playerRating = await db.PlayerRating.findOne({ where: { userId } });
      if (!playerRating) {
        playerRating = await db.PlayerRating.create({ userId });
      }

      // Добавляем в очередь
      const queueKey = `${difficulty}-${timeLimit}`;
      if (!this.matchmakingQueue.has(queueKey)) {
        this.matchmakingQueue.set(queueKey, []);
      }

      // Проверяем что игрок не в очереди
      const queue = this.matchmakingQueue.get(queueKey);
      if (queue.find(p => p.userId === userId)) {
        return socket.emit('codebattle:error', { message: 'Already in queue' });
      }

      queue.push({
        userId,
        socketId: socket.id,
        rating: playerRating.rating,
        timestamp: Date.now()
      });

      socket.emit('codebattle:searching', {
        position: queue.length,
        estimatedWait: queue.length > 1 ? '< 30 sec' : 'Waiting for opponent...'
      });

      console.log(`🔍 User ${userId} searching for ${difficulty} match`);

    } catch (error) {
      console.error('Find match error:', error);
      socket.emit('codebattle:error', { message: 'Failed to join matchmaking' });
    }
  }

  /**
   * Отмена поиска
   */
  handleCancelSearch(userId) {
    for (const [key, queue] of this.matchmakingQueue.entries()) {
      const index = queue.findIndex(p => p.userId === userId);
      if (index !== -1) {
        queue.splice(index, 1);
        console.log(`❌ User ${userId} cancelled search`);
        break;
      }
    }
  }

  /**
   * Обработка matchmaking очереди
   * Простой матчмейкинг: первые двое в очереди играют друг с другом
   */
  async processMatchmaking() {
    for (const [queueKey, queue] of this.matchmakingQueue.entries()) {
      if (queue.length < 2) continue;

      // Простой FIFO: первые двое в очереди играют
      // Без учёта рейтинга - просто случайный соперник
      while (queue.length >= 2) {
        const player1 = queue.shift();
        const player2 = queue.shift();

        const [difficulty, timeLimit] = queueKey.split('-');

        await this.createMatch(player1, player2, difficulty, parseInt(timeLimit));
      }
    }
  }

  /**
   * Создание матча
   */
  async createMatch(player1, player2, difficulty, timeLimit) {
    try {
      // Выбираем случайную задачу
      const task = await db.GameTask.findOne({
        where: { difficulty, isActive: true },
        order: db.sequelize.random()
      });

      if (!task) {
        this.io.to(player1.socketId).emit('codebattle:error', { message: 'No tasks available' });
        this.io.to(player2.socketId).emit('codebattle:error', { message: 'No tasks available' });
        return;
      }

      // Получаем рейтинги
      const rating1 = await db.PlayerRating.findOne({ where: { userId: player1.userId } });
      const rating2 = await db.PlayerRating.findOne({ where: { userId: player2.userId } });

      // Создаём матч в БД
      const match = await db.GameMatch.create({
        player1Id: player1.userId,
        player2Id: player2.userId,
        taskId: task.id,
        status: 'in_progress',
        timeLimit,
        totalTests: task.testCases.length,
        player1RatingBefore: rating1?.rating || 1000,
        player2RatingBefore: rating2?.rating || 1000,
        startedAt: new Date()
      });

      // Получаем данные игроков
      const user1 = await db.User.findByPk(player1.userId, {
        attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
      });
      const user2 = await db.User.findByPk(player2.userId, {
        attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
      });

      // Сохраняем активный матч
      const matchData = {
        match,
        task,
        players: {
          [player1.userId]: { socketId: player1.socketId, submitted: false },
          [player2.userId]: { socketId: player2.socketId, submitted: false }
        }
      };
      this.activeMatches.set(match.id, matchData);

      // Создаём комнату матча
      const matchRoom = `codebattle-match-${match.id}`;
      this.io.sockets.sockets.get(player1.socketId)?.join(matchRoom);
      this.io.sockets.sockets.get(player2.socketId)?.join(matchRoom);

      // Отправляем данные матча обоим игрокам
      const matchPayload = {
        matchId: match.id,
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          difficulty: task.difficulty,
          timeLimit,
          languages: task.languages,
          testCases: task.testCases.filter(tc => !tc.isHidden),
          starterCode: task.starterCode
        },
        opponent: null,
        timeLimit,
        startedAt: match.startedAt
      };

      this.io.to(player1.socketId).emit('codebattle:match-found', {
        ...matchPayload,
        opponent: {
          ...user2.toJSON(),
          rating: rating2?.rating || 1000,
          league: rating2?.league || 'bronze'
        }
      });

      this.io.to(player2.socketId).emit('codebattle:match-found', {
        ...matchPayload,
        opponent: {
          ...user1.toJSON(),
          rating: rating1?.rating || 1000,
          league: rating1?.league || 'bronze'
        }
      });

      // Запускаем таймер матча
      setTimeout(() => this.handleMatchTimeout(match.id), timeLimit * 1000);

      console.log(`⚔️ Match ${match.id} started: ${player1.userId} vs ${player2.userId}`);

    } catch (error) {
      console.error('Create match error:', error);
    }
  }

  /**
   * Создание приватной комнаты
   */
  async handleCreateRoom(socket, userId, { difficulty = 'medium', timeLimit = 300, taskId = null }) {
    const roomCode = this.generateRoomCode();

    this.privateRooms.set(roomCode, {
      hostId: userId,
      hostSocketId: socket.id,
      difficulty,
      timeLimit,
      taskId
    });

    socket.emit('codebattle:room-created', { roomCode });
    console.log(`🏠 Room ${roomCode} created by user ${userId}`);
  }

  /**
   * Присоединение к приватной комнате
   */
  async handleJoinRoom(socket, userId, { roomCode }) {
    const room = this.privateRooms.get(roomCode);

    if (!room) {
      return socket.emit('codebattle:error', { message: 'Room not found' });
    }

    if (room.hostId === userId) {
      return socket.emit('codebattle:error', { message: 'Cannot join your own room' });
    }

    // Создаём матч
    const player1 = {
      userId: room.hostId,
      socketId: room.hostSocketId,
      rating: 1000
    };
    const player2 = {
      userId,
      socketId: socket.id,
      rating: 1000
    };

    await this.createMatch(player1, player2, room.difficulty, room.timeLimit);

    // Удаляем комнату
    this.privateRooms.delete(roomCode);
  }

  /**
   * Отправка решения в матче
   */
  async handleSubmitCode(socket, userId, { matchId, code, language }) {
    try {
      const matchData = this.activeMatches.get(matchId);
      if (!matchData) {
        return socket.emit('codebattle:error', { message: 'Match not found' });
      }

      const { match, task, players } = matchData;

      if (!players[userId]) {
        return socket.emit('codebattle:error', { message: 'Not a participant' });
      }

      if (players[userId].submitted) {
        return socket.emit('codebattle:error', { message: 'Already submitted' });
      }

      // Запускаем тесты
      const testResults = await codeExecutor.runTests(code, language, task.testCases);
      const solveTime = Math.floor((Date.now() - new Date(match.startedAt)) / 1000);

      // Определяем номер игрока
      const isPlayer1 = match.player1Id === userId;
      const playerPrefix = isPlayer1 ? 'player1' : 'player2';

      // Обновляем матч в БД
      const updateData = {
        [`${playerPrefix}Code`]: code,
        [`${playerPrefix}Language`]: language,
        [`${playerPrefix}Solved`]: testResults.allPassed,
        [`${playerPrefix}SolveTime`]: solveTime,
        [`${playerPrefix}TestsPassed`]: testResults.passed
      };

      await match.update(updateData);
      players[userId].submitted = true;

      // Уведомляем игрока о результате
      socket.emit('codebattle:submit-result', {
        solved: testResults.allPassed,
        testsPassed: testResults.passed,
        totalTests: testResults.total,
        solveTime
      });

      // Уведомляем оппонента о прогрессе (без спойлеров)
      const opponentId = isPlayer1 ? match.player2Id : match.player1Id;
      const opponentSocketId = players[opponentId]?.socketId;
      if (opponentSocketId) {
        this.io.to(opponentSocketId).emit('codebattle:opponent-submitted', {
          solved: testResults.allPassed
        });
      }

      // Проверяем завершение матча
      if (players[match.player1Id].submitted && players[match.player2Id].submitted) {
        await this.finishMatch(matchId);
      } else if (testResults.allPassed) {
        // Если один решил - даём второму 60 сек
        setTimeout(() => {
          if (!players[opponentId]?.submitted) {
            this.finishMatch(matchId);
          }
        }, 60000);
      }

    } catch (error) {
      console.error('Submit code error:', error);
      socket.emit('codebattle:error', { message: 'Failed to submit code' });
    }
  }

  /**
   * Завершение матча
   */
  async finishMatch(matchId) {
    const matchData = this.activeMatches.get(matchId);
    if (!matchData) return;

    const { match, players } = matchData;

    // Перезагружаем матч из БД
    await match.reload();

    // Определяем победителя
    let winnerId = null;
    let isDraw = false;

    if (match.player1Solved && match.player2Solved) {
      // Оба решили - выигрывает быстрейший
      if (match.player1SolveTime < match.player2SolveTime) {
        winnerId = match.player1Id;
      } else if (match.player2SolveTime < match.player1SolveTime) {
        winnerId = match.player2Id;
      } else {
        isDraw = true;
      }
    } else if (match.player1Solved) {
      winnerId = match.player1Id;
    } else if (match.player2Solved) {
      winnerId = match.player2Id;
    } else {
      // Никто не решил - сравниваем количество пройденных тестов
      if (match.player1TestsPassed > match.player2TestsPassed) {
        winnerId = match.player1Id;
      } else if (match.player2TestsPassed > match.player1TestsPassed) {
        winnerId = match.player2Id;
      } else {
        isDraw = true;
      }
    }

    // Рассчитываем изменение рейтинга
    const { winnerChange, loserChange } = db.PlayerRating.calculateRatingChange(
      winnerId === match.player1Id ? match.player1RatingBefore : match.player2RatingBefore,
      winnerId === match.player1Id ? match.player2RatingBefore : match.player1RatingBefore,
      isDraw
    );

    const player1Change = winnerId === match.player1Id ? winnerChange :
                          winnerId === match.player2Id ? loserChange :
                          winnerChange; // draw case
    const player2Change = winnerId === match.player2Id ? winnerChange :
                          winnerId === match.player1Id ? loserChange :
                          loserChange;

    // Обновляем матч
    await match.update({
      status: 'completed',
      winnerId,
      isDraw,
      player1RatingChange: player1Change,
      player2RatingChange: player2Change,
      finishedAt: new Date()
    });

    // Обновляем рейтинги игроков
    await this.updatePlayerRatings(match.player1Id, player1Change, winnerId, isDraw);
    await this.updatePlayerRatings(match.player2Id, player2Change, winnerId, isDraw);

    // Отправляем результаты
    const matchRoom = `codebattle-match-${matchId}`;
    this.io.to(matchRoom).emit('codebattle:match-finished', {
      matchId,
      winnerId,
      isDraw,
      player1: {
        id: match.player1Id,
        solved: match.player1Solved,
        solveTime: match.player1SolveTime,
        testsPassed: match.player1TestsPassed,
        ratingChange: player1Change
      },
      player2: {
        id: match.player2Id,
        solved: match.player2Solved,
        solveTime: match.player2SolveTime,
        testsPassed: match.player2TestsPassed,
        ratingChange: player2Change
      }
    });

    // Очищаем данные матча
    this.activeMatches.delete(matchId);

    console.log(`🏁 Match ${matchId} finished. Winner: ${winnerId || 'Draw'}`);
  }

  /**
   * Обновление рейтинга игрока
   */
  async updatePlayerRatings(userId, ratingChange, winnerId, isDraw) {
    let playerRating = await db.PlayerRating.findOne({ where: { userId } });
    if (!playerRating) {
      playerRating = await db.PlayerRating.create({ userId });
    }

    const newRating = Math.max(0, playerRating.rating + ratingChange);
    const isWin = winnerId === userId;

    const updateData = {
      rating: newRating,
      maxRating: Math.max(playerRating.maxRating, newRating),
      league: db.PlayerRating.getLeague(newRating),
      totalGames: playerRating.totalGames + 1,
      lastMatchAt: new Date()
    };

    if (isDraw) {
      updateData.draws = playerRating.draws + 1;
      updateData.streak = 0;
    } else if (isWin) {
      updateData.wins = playerRating.wins + 1;
      updateData.streak = Math.max(1, playerRating.streak + 1);
      updateData.maxStreak = Math.max(playerRating.maxStreak, updateData.streak);
    } else {
      updateData.losses = playerRating.losses + 1;
      updateData.streak = Math.min(-1, playerRating.streak - 1);
    }

    await playerRating.update(updateData);
  }

  /**
   * Таймаут матча
   */
  async handleMatchTimeout(matchId) {
    const matchData = this.activeMatches.get(matchId);
    if (!matchData) return;

    const { match } = matchData;
    await match.reload();

    if (match.status === 'in_progress') {
      await this.finishMatch(matchId);
    }
  }

  /**
   * Выход из матча
   */
  async handleLeaveMatch(socket, userId, { matchId }) {
    const matchData = this.activeMatches.get(matchId);
    if (!matchData) return;

    const { match } = matchData;

    // Определяем оппонента как победителя
    const winnerId = match.player1Id === userId ? match.player2Id : match.player1Id;

    await match.update({
      status: 'cancelled',
      winnerId
    });

    // Обновляем рейтинги (проигрыш за выход)
    await this.updatePlayerRatings(userId, -25, winnerId, false);
    await this.updatePlayerRatings(winnerId, 15, winnerId, false);

    // Уведомляем оппонента
    const matchRoom = `codebattle-match-${matchId}`;
    this.io.to(matchRoom).emit('codebattle:opponent-left', { winnerId });

    this.activeMatches.delete(matchId);
  }

  /**
   * Обновление прогресса (live typing indicator)
   */
  handleProgressUpdate(socket, userId, { matchId, testsRun }) {
    const matchData = this.activeMatches.get(matchId);
    if (!matchData) return;

    const { match, players } = matchData;
    const opponentId = match.player1Id === userId ? match.player2Id : match.player1Id;
    const opponentSocketId = players[opponentId]?.socketId;

    if (opponentSocketId) {
      this.io.to(opponentSocketId).emit('codebattle:opponent-progress', {
        testsRun
      });
    }
  }

  /**
   * Обработка отключения
   */
  handleDisconnect(userId) {
    // Удаляем из очередей matchmaking
    for (const [key, queue] of this.matchmakingQueue.entries()) {
      const index = queue.findIndex(p => p.userId === userId);
      if (index !== -1) {
        queue.splice(index, 1);
      }
    }

    // Удаляем приватные комнаты
    for (const [code, room] of this.privateRooms.entries()) {
      if (room.hostId === userId) {
        this.privateRooms.delete(code);
      }
    }

    console.log(`🔌 User ${userId} disconnected from Code Battle`);
  }

  /**
   * Генерация кода комнаты
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

module.exports = new CodeBattleSocketService();