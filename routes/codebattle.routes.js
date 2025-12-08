const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const db = require('../db/models');
const authMiddleware = require('../middleware/authMiddleware');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');
const codeExecutor = require('../services/codeExecutor.service');
const codeforcesSync = require('../services/codeforcesSync.service');
const codeBattleAI = require('../services/codeBattleAI.service');
const skillAggregator = require('../services/skillAggregator.service');
const developmentPlanSync = require('../services/developmentPlanSync.service');

// ==================== TASKS ====================

/**
 * GET /api/codebattle/tasks
 * Получить список задач с фильтрацией
 */
router.get('/tasks', cacheMiddleware(300), async (req, res) => {
  try {
    const { difficulty, category, language, page = 1, limit = 20 } = req.query;

    const where = { isActive: true };

    if (difficulty) where.difficulty = difficulty;
    if (category) where.category = category;
    if (language) {
      // Для JSON поля используем PostgreSQL оператор @> через literal
      where[Op.and] = db.sequelize.literal(`"languages"::jsonb @> '"${language}"'`);
    }

    const offset = (page - 1) * limit;

    const { rows: tasks, count } = await db.GameTask.findAndCountAll({
      where,
      attributes: ['id', 'title', 'difficulty', 'category', 'tags', 'points', 'timeLimit', 'languages', 'solvedCount', 'attemptCount', 'externalUrl', 'externalSource'],
      order: [
        // Локальные задачи первыми (у них нет externalSource или externalSource = 'local')
        [db.sequelize.literal("CASE WHEN \"externalSource\" IS NULL OR \"externalSource\" = 'local' THEN 0 ELSE 1 END"), 'ASC'],
        ['createdAt', 'DESC']
      ],
      limit: parseInt(limit),
      offset
    });

    res.json({
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * GET /api/codebattle/tasks/daily
 * Получить ежедневный челлендж
 */
router.get('/tasks/daily', cacheMiddleware(3600), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    let dailyTask = await db.GameTask.findOne({
      where: {
        isDailyChallenge: true,
        dailyChallengeDate: today
      }
    });

    // Если нет задачи на сегодня, выбираем случайную
    if (!dailyTask) {
      const randomTask = await db.GameTask.findOne({
        where: { isActive: true },
        order: db.sequelize.random()
      });

      if (randomTask) {
        await randomTask.update({
          isDailyChallenge: true,
          dailyChallengeDate: today
        });
        dailyTask = randomTask;
      }
    }

    res.json({ task: dailyTask });
  } catch (error) {
    console.error('Error fetching daily task:', error);
    res.status(500).json({ error: 'Failed to fetch daily challenge' });
  }
});

/**
 * GET /api/codebattle/tasks/:id
 * Получить задачу по ID
 */
router.get('/tasks/:id', async (req, res) => {
  try {
    const task = await db.GameTask.findByPk(req.params.id, {
      attributes: { exclude: ['solution'] } // Не показываем решение
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Убираем скрытые тест-кейсы из ответа
    const visibleTestCases = task.testCases.filter(tc => !tc.isHidden);

    res.json({
      ...task.toJSON(),
      testCases: visibleTestCases,
      hiddenTestsCount: task.testCases.length - visibleTestCases.length
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// ==================== PLAYER RATING ====================

/**
 * GET /api/codebattle/rating/me
 * Получить свой рейтинг
 */
router.get('/rating/me', authMiddleware, async (req, res) => {
  try {
    let rating = await db.PlayerRating.findOne({
      where: { userId: req.userId },
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
      }]
    });

    // Создаём рейтинг если не существует
    if (!rating) {
      rating = await db.PlayerRating.create({ userId: req.userId });
      rating = await db.PlayerRating.findOne({
        where: { userId: req.userId },
        include: [{
          model: db.User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
        }]
      });
    }

    // Определяем позицию в рейтинге
    const rank = await db.PlayerRating.count({
      where: { rating: { [Op.gt]: rating.rating } }
    }) + 1;

    res.json({
      ...rating.toJSON(),
      rank,
      leagueIcon: db.PlayerRating.getLeagueIcon(rating.league)
    });
  } catch (error) {
    console.error('Error fetching player rating:', error);
    res.status(500).json({ error: 'Failed to fetch rating' });
  }
});

/**
 * GET /api/codebattle/leaderboard
 * Получить таблицу лидеров (топ 30)
 */
router.get('/leaderboard', cacheMiddleware(60), async (req, res) => {
  try {
    const { league, limit = 30 } = req.query;

    const where = {};
    if (league) where.league = league;

    const leaderboard = await db.PlayerRating.findAll({
      where,
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['id', 'username', 'firstName', 'lastName', 'avatar']
      }],
      order: [['rating', 'DESC']],
      limit: parseInt(limit)
    });

    const result = leaderboard.map((player, index) => ({
      rank: index + 1,
      ...player.toJSON(),
      leagueIcon: db.PlayerRating.getLeagueIcon(player.league)
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ==================== SOLO / VS AI SESSIONS ====================

/**
 * POST /api/codebattle/sessions/start
 * Начать соло сессию или игру против AI
 */
router.post('/sessions/start', authMiddleware, async (req, res) => {
  try {
    const { taskId, mode = 'solo', aiDifficulty = 'medium', language = 'javascript' } = req.body;

    const task = await db.GameTask.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Увеличиваем счётчик попыток
    await task.increment('attemptCount');

    // Создаём сессию
    const session = await db.GameSession.create({
      userId: req.userId,
      taskId,
      mode,
      status: 'in_progress',
      language,
      totalTests: task.testCases.length,
      aiDifficulty: mode === 'vs_ai' ? aiDifficulty : null,
      startedAt: new Date()
    });

    // Для режима vs AI запускаем реального AI-противника
    if (mode === 'vs_ai') {
      // Запускаем AI в фоне (не блокируем ответ)
      (async () => {
        try {
          console.log(`🤖 AI (${aiDifficulty}) начинает решать задачу ${task.title}...`);

          // AI решает задачу
          const aiResult = await codeBattleAI.compete(task, language, aiDifficulty, codeExecutor);

          console.log(`🤖 AI завершил: solved=${aiResult.solved}, time=${aiResult.solveTime}s`);

          // Сохраняем результат AI в сессию
          await session.update({
            aiSolveTime: aiResult.solveTime,
            aiSolved: aiResult.solved,
            aiCode: aiResult.code,
            aiTestsPassed: aiResult.testsPassed || 0
          });
        } catch (err) {
          console.error('AI error:', err);
          // Если AI упал, ставим fallback время
          const fallbackTime = { easy: 180, medium: 90, hard: 45 }[aiDifficulty] || 90;
          await session.update({ aiSolveTime: fallbackTime, aiSolved: false });
        }
      })();

      // Пока AI работает, ставим предварительное время (будет обновлено)
      await session.update({ aiSolveTime: 9999, aiSolved: null });
    }

    res.json({
      session: session.toJSON(),
      task: {
        ...task.toJSON(),
        testCases: task.testCases.filter(tc => !tc.isHidden),
        solution: undefined // Не отправляем решение
      },
      starterCode: task.starterCode[language] || codeExecutor.getStarterTemplate(language)
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

/**
 * GET /api/codebattle/sessions/:id/ai-status
 * Получить статус AI (для polling в режиме VS AI)
 */
router.get('/sessions/:id/ai-status', authMiddleware, async (req, res) => {
  try {
    const sessionId = req.params.id;

    const session = await db.GameSession.findOne({
      where: { id: sessionId, userId: req.userId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.mode !== 'vs_ai') {
      return res.status(400).json({ error: 'Not a VS AI session' });
    }

    // Возвращаем статус AI
    const aiStatus = {
      aiSolved: session.aiSolved,
      aiSolveTime: session.aiSolveTime,
      aiTestsPassed: session.aiTestsPassed,
      status: session.aiSolved === null ? 'solving' : session.aiSolved ? 'completed' : 'failed'
    };

    res.json(aiStatus);
  } catch (error) {
    console.error('Error getting AI status:', error);
    res.status(500).json({ error: 'Failed to get AI status' });
  }
});

/**
 * POST /api/codebattle/sessions/:id/test
 * Пробное тестирование (только видимые тесты)
 */
router.post('/sessions/:id/test', authMiddleware, async (req, res) => {
  try {
    const { code, language } = req.body;
    const sessionId = req.params.id;

    const session = await db.GameSession.findOne({
      where: { id: sessionId, userId: req.userId },
      include: [{ model: db.GameTask, as: 'task' }]
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Фильтруем только видимые тесты
    const visibleTests = session.task.testCases.filter(test => !test.isHidden);

    // Запускаем только видимые тесты
    const testResults = await codeExecutor.runTests(code, language, visibleTests);

    // Форматируем результаты для клиента
    const formattedResults = testResults.results.map(r => ({
      passed: r.passed,
      input: r.input,
      expected: r.expectedOutput,
      actual: r.actualOutput,
      error: r.error
    }));

    res.json({
      success: testResults.allPassed,
      testResults: formattedResults,
      passed: testResults.passed,
      total: testResults.total,
      executionTime: testResults.avgTime,
      memoryUsed: testResults.avgMemory
    });
  } catch (error) {
    console.error('Trial test error:', error);
    res.status(500).json({ error: 'Trial test failed', details: error.message });
  }
});

/**
 * POST /api/codebattle/sessions/:id/submit
 * Отправить решение
 */
router.post('/sessions/:id/submit', authMiddleware, async (req, res) => {
  try {
    const { code, language } = req.body;
    const sessionId = req.params.id;

    const session = await db.GameSession.findOne({
      where: { id: sessionId, userId: req.userId },
      include: [{ model: db.GameTask, as: 'task' }]
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Разрешаем повторные попытки до успешного решения
    if (session.status === 'completed' && session.solved) {
      return res.status(400).json({ error: 'Task already solved' });
    }

    // Запускаем тесты
    const testResults = await codeExecutor.runTests(code, language, session.task.testCases);

    const timeSpent = Math.floor((new Date() - new Date(session.startedAt)) / 1000);
    const solved = testResults.allPassed;

    // Вычисляем очки
    let pointsEarned = 0;
    if (solved) {
      const difficultyMultiplier = { easy: 1, medium: 2, hard: 3 };
      pointsEarned = session.task.points * (difficultyMultiplier[session.task.difficulty] || 1);

      // Бонус за скорость
      if (timeSpent < session.task.timeLimit / 2) {
        pointsEarned = Math.floor(pointsEarned * 1.5);
      }

      // Штраф за подсказки
      pointsEarned = Math.max(1, pointsEarned - session.hintsUsed * 5);
    }

    // Определяем результат против AI
    let beatAi = null;
    let aiSolved = session.aiSolved;
    let aiSolveTime = session.aiSolveTime;

    if (session.mode === 'vs_ai') {
      // Перезагружаем сессию чтобы получить актуальные данные AI
      await session.reload();
      aiSolved = session.aiSolved;
      aiSolveTime = session.aiSolveTime;

      // Определяем победителя
      if (solved) {
        // Игрок решил
        if (!aiSolved) {
          // AI не решил - игрок победил
          beatAi = true;
        } else if (aiSolveTime === 9999) {
          // AI ещё думает, а игрок уже решил - игрок победил
          beatAi = true;
        } else {
          // Оба решили - сравниваем время
          beatAi = timeSpent < aiSolveTime;
        }
      } else {
        // Игрок не решил
        if (aiSolved) {
          // AI решил - AI победил
          beatAi = false;
        } else {
          // Оба не решили - ничья (считается как проигрыш игрока)
          beatAi = false;
        }
      }
    }

    // Обновляем сессию
    await session.update({
      code,
      language,
      solved,
      testsPassed: testResults.passed,
      timeSpent,
      pointsEarned,
      beatAi,
      status: 'completed',
      finishedAt: new Date(),
      executionTime: testResults.avgTime,
      memoryUsed: testResults.avgMemory
    });

    // Обновляем статистику задачи
    if (solved) {
      await session.task.increment('solvedCount');
    }

    // Обновляем рейтинг игрока
    let playerRating = await db.PlayerRating.findOne({ where: { userId: req.userId } });
    if (!playerRating) {
      playerRating = await db.PlayerRating.create({ userId: req.userId });
    }

    if (solved) {
      await playerRating.increment('totalSolved');

      // Обновляем среднее время решения
      const avgTime = playerRating.avgSolveTime || 0;
      const newAvg = (avgTime * (playerRating.totalSolved - 1) + timeSpent) / playerRating.totalSolved;
      await playerRating.update({ avgSolveTime: newAvg });
    }

    // VS AI рейтинг: победа/поражение
    if (session.mode === 'vs_ai') {
      const aiDifficultyMultiplier = { easy: 1, medium: 2, hard: 3 };
      const multiplier = aiDifficultyMultiplier[session.aiDifficulty] || 1;

      if (solved && beatAi) {
        // Победа над AI: +15-45 рейтинга в зависимости от сложности AI
        const ratingGain = 15 * multiplier;
        await playerRating.increment('rating', { by: ratingGain });
        await playerRating.increment('wins');

        // Обновляем streak
        const newStreak = playerRating.streak > 0 ? playerRating.streak + 1 : 1;
        await playerRating.update({ streak: newStreak });

        pointsEarned += ratingGain; // Добавляем бонус к очкам
      } else {
        // Проигрыш AI (не решил или решил медленнее): -10-30 рейтинга
        const ratingLoss = 10 * multiplier;
        const newRating = Math.max(0, playerRating.rating - ratingLoss);
        await playerRating.update({ rating: newRating });
        await playerRating.increment('losses');

        // Сбрасываем streak
        const newStreak = playerRating.streak < 0 ? playerRating.streak - 1 : -1;
        await playerRating.update({ streak: newStreak });
      }

      await playerRating.increment('totalGames');

      // Обновляем лигу на основе нового рейтинга
      await playerRating.reload();
      const newLeague = db.PlayerRating.getLeague(playerRating.rating);
      if (newLeague !== playerRating.league) {
        await playerRating.update({ league: newLeague });
      }
    }

    // Daily challenge streak
    if (session.mode === 'daily_challenge' && solved) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      if (playerRating.lastDailyChallengeAt === yesterday) {
        await playerRating.increment('dailyChallengeStreak');
      } else if (playerRating.lastDailyChallengeAt !== today) {
        await playerRating.update({ dailyChallengeStreak: 1 });
      }
      await playerRating.update({ lastDailyChallengeAt: today });
    }

    // Получаем обновлённый рейтинг для ответа
    await playerRating.reload();

    // Триггерим пересчёт радара навыков (асинхронно)
    skillAggregator.triggerRecalculation(req.userId, 'codebattle');

    // Синхронизируем план развития (асинхронно, если задача решена)
    if (solved) {
      setImmediate(async () => {
        try {
          await developmentPlanSync.onCodeBattleSolved(req.userId, session, session.task);
          // Также обновляем при изменении рейтинга
          if (session.mode === 'vs_ai') {
            await developmentPlanSync.onRatingChanged(req.userId, playerRating);
          }
        } catch (err) {
          console.error('Error syncing development plan:', err);
        }
      });
    }

    res.json({
      solved,
      testsPassed: testResults.passed,
      totalTests: testResults.total,
      results: testResults.results.map(r => ({
        ...r,
        input: r.isHidden ? 'Hidden' : r.input,
        expectedOutput: r.isHidden ? 'Hidden' : r.expectedOutput
      })),
      timeSpent,
      pointsEarned,
      beatAi,
      aiSolveTime: aiSolveTime !== 9999 ? aiSolveTime : null,
      aiSolved,
      aiTestsPassed: session.aiTestsPassed,
      executionTime: testResults.avgTime,
      memoryUsed: testResults.avgMemory,
      // Добавляем данные о рейтинге
      playerRating: {
        rating: playerRating.rating,
        league: playerRating.league,
        wins: playerRating.wins,
        losses: playerRating.losses,
        streak: playerRating.streak
      }
    });
  } catch (error) {
    console.error('Error submitting solution:', error);
    res.status(500).json({ error: 'Failed to submit solution' });
  }
});

/**
 * POST /api/codebattle/sessions/:id/hint
 * Получить подсказку
 */
router.post('/sessions/:id/hint', authMiddleware, async (req, res) => {
  try {
    const session = await db.GameSession.findOne({
      where: { id: req.params.id, userId: req.userId },
      include: [{ model: db.GameTask, as: 'task' }]
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const hints = session.task.hints || [];
    const nextHintIndex = session.hintsUsed;

    if (nextHintIndex >= hints.length) {
      return res.status(400).json({ error: 'No more hints available' });
    }

    await session.increment('hintsUsed');

    res.json({
      hint: hints[nextHintIndex],
      hintNumber: nextHintIndex + 1,
      totalHints: hints.length,
      remainingHints: hints.length - nextHintIndex - 1
    });
  } catch (error) {
    console.error('Error getting hint:', error);
    res.status(500).json({ error: 'Failed to get hint' });
  }
});

// ==================== CODE EXECUTION ====================

/**
 * POST /api/codebattle/execute
 * Выполнить код (для тестирования без отправки)
 */
router.post('/execute', authMiddleware, async (req, res) => {
  try {
    const { code, language, input = '' } = req.body;

    const result = await codeExecutor.executeCode(code, language, input);

    res.json(result);
  } catch (error) {
    console.error('Error executing code:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/codebattle/languages
 * Получить список поддерживаемых языков
 */
router.get('/languages', (req, res) => {
  const languageNames = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    c: 'C',
    cpp: 'C++',
    csharp: 'C#',
    java: 'Java',
    kotlin: 'Kotlin',
    go: 'Go'
  };

  const languages = codeExecutor.getSupportedLanguages().map(lang => ({
    id: lang,
    name: languageNames[lang] || lang.charAt(0).toUpperCase() + lang.slice(1),
    template: codeExecutor.getStarterTemplate(lang)
  }));

  res.json(languages);
});

// ==================== MATCH HISTORY ====================

/**
 * GET /api/codebattle/history
 * Получить историю игр
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { type = 'all', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sessions = [];
    let matches = [];

    if (type === 'all' || type === 'solo') {
      sessions = await db.GameSession.findAll({
        where: { userId: req.userId },
        include: [{
          model: db.GameTask,
          as: 'task',
          attributes: ['id', 'title', 'difficulty']
        }],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });
    }

    if (type === 'all' || type === 'pvp') {
      matches = await db.GameMatch.findAll({
        where: {
          [Op.or]: [
            { player1Id: req.userId },
            { player2Id: req.userId }
          ]
        },
        include: [
          { model: db.GameTask, as: 'task', attributes: ['id', 'title', 'difficulty'] },
          { model: db.User, as: 'player1', attributes: ['id', 'username', 'avatar'] },
          { model: db.User, as: 'player2', attributes: ['id', 'username', 'avatar'] }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });
    }

    res.json({ sessions, matches });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * GET /api/codebattle/stats
 * Получить статистику игрока
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // Рейтинг
    const rating = await db.PlayerRating.findOne({ where: { userId } });

    // Статистика по сложности
    const solvedByDifficulty = await db.GameSession.findAll({
      where: { userId, solved: true },
      include: [{ model: db.GameTask, as: 'task', attributes: ['difficulty'] }],
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('GameSession.id')), 'count']
      ],
      group: ['task.difficulty'],
      raw: true
    });

    // Статистика по языкам
    const solvedByLanguage = await db.GameSession.findAll({
      where: { userId, solved: true },
      attributes: [
        'language',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['language'],
      raw: true
    });

    // Последние 7 дней активности
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentActivity = await db.GameSession.findAll({
      where: {
        userId,
        createdAt: { [Op.gte]: weekAgo }
      },
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'date'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: [db.sequelize.fn('DATE', db.sequelize.col('createdAt'))],
      raw: true
    });

    res.json({
      rating: rating?.toJSON() || null,
      solvedByDifficulty,
      solvedByLanguage,
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ==================== CODEFORCES SYNC ====================

/**
 * POST /api/codebattle/sync/codeforces
 * Синхронизировать задачи с Codeforces (только для админов)
 */
// TODO: вернуть authMiddleware после тестирования
router.post('/sync/codeforces', async (req, res) => {
  try {
    // Проверяем права (можно добавить проверку на админа)
    const body = req.body || {};
    const { limit = 200, minRating = 800, maxRating = 2000 } = body;

    const result = await codeforcesSync.syncToDatabase({
      limit,
      minRating,
      maxRating
    });

    res.json({
      success: true,
      message: 'Sync completed',
      ...result
    });
  } catch (error) {
    console.error('Codeforces sync error:', error);
    res.status(500).json({ error: 'Failed to sync with Codeforces' });
  }
});

/**
 * GET /api/codebattle/sync/status
 * Статус синхронизации
 */
router.get('/sync/status', (req, res) => {
  const status = codeforcesSync.getStatus();
  res.json(status);
});

/**
 * POST /api/codebattle/sync/update-statements
 * Обновить условия задач с Codeforces
 */
router.post('/sync/update-statements', async (req, res) => {
  try {
    const { limit = 50 } = req.body || {};

    const result = await codeforcesSync.updateStatements(limit);

    res.json({
      success: true,
      message: 'Update completed',
      ...result
    });
  } catch (error) {
    console.error('Update statements error:', error);
    res.status(500).json({ error: 'Failed to update statements' });
  }
});

/**
 * GET /api/codebattle/tasks/random
 * Получить случайную задачу
 */
router.get('/tasks/random', async (req, res) => {
  try {
    const { difficulty } = req.query;
    const task = await codeforcesSync.getRandomTask(difficulty || null);

    if (!task) {
      return res.status(404).json({ error: 'No tasks available' });
    }

    // Убираем скрытые тест-кейсы и решение
    const visibleTestCases = (task.testCases || []).filter(tc => !tc.isHidden);

    res.json({
      ...task.toJSON(),
      testCases: visibleTestCases,
      solution: undefined
    });
  } catch (error) {
    console.error('Error getting random task:', error);
    res.status(500).json({ error: 'Failed to get random task' });
  }
});

/**
 * GET /api/codebattle/tasks/random/batch
 * Получить несколько случайных задач для матча
 */
router.get('/tasks/random/batch', async (req, res) => {
  try {
    const { count = 3, difficulty } = req.query;
    const tasks = await codeforcesSync.getRandomTasksForMatch(
      parseInt(count),
      difficulty || null
    );

    const result = tasks.map(task => ({
      ...task.toJSON(),
      testCases: (task.testCases || []).filter(tc => !tc.isHidden),
      solution: undefined
    }));

    res.json(result);
  } catch (error) {
    console.error('Error getting random tasks:', error);
    res.status(500).json({ error: 'Failed to get random tasks' });
  }
});

module.exports = router;