const express = require('express');
const router = express.Router();
const { AIInterviewSession, AIInterviewQuestion, User } = require('../db/models');
const authMiddleware = require('../middleware/authMiddleware');

// ============= CREATE SESSION =============
// POST /api/interviews - Создать новую сессию AI интервью
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { direction, technologies, level, questionsCount } = req.body;
    const userId = req.userId;

    if (!direction || !technologies || !level) {
      return res.status(400).json({ 
        error: 'Missing required fields: direction, technologies, level' 
      });
    }

    // Создаем сессию
    const session = await AIInterviewSession.create({
      userId,
      direction,
      technologies,
      level,
      questionsCount: questionsCount || 10,
      status: 'in-progress'
    });

    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating interview session:', error);
    res.status(500).json({ error: 'Failed to create interview session' });
  }
});

// ============= GET USER INTERVIEWS =============
// GET /api/interviews/my - Получить все интервью текущего пользователя
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const sessions = await AIInterviewSession.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      include: [{
        model: AIInterviewQuestion,
        as: 'questions'
      }]
    });

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching user interviews:', error);
    res.status(500).json({ error: 'Failed to fetch user interviews' });
  }
});

// ============= GET SESSION =============
// GET /api/interviews/:sessionId - Получить сессию по ID
router.get('/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    const session = await AIInterviewSession.findOne({
      where: { id: sessionId, userId },
      include: [{
        model: AIInterviewQuestion,
        as: 'questions'
      }]
    });

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching interview session:', error);
    res.status(500).json({ error: 'Failed to fetch interview session' });
  }
});

// ============= GET NEXT QUESTION =============
// POST /api/interviews/:sessionId/next-question - Получить следующий вопрос (генерируется AI)
router.post('/:sessionId/next-question', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    const session = await AIInterviewSession.findOne({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    // TODO: Здесь будет интеграция с YandexGPT
    // Пока возвращаем mock вопрос
    const mockQuestion = {
      question: `Вопрос ${session.currentQuestionIndex + 1}: Расскажите о ${session.technologies[0]}`,
      difficulty: session.level,
      technology: session.technologies[0],
      hints: ['Подсказка 1', 'Подсказка 2']
    };

    // Сохраняем вопрос в БД
    const question = await AIInterviewQuestion.create({
      sessionId: session.id,
      ...mockQuestion
    });

    // Обновляем индекс текущего вопроса
    await session.update({ 
      currentQuestionIndex: session.currentQuestionIndex + 1 
    });

    res.json(question);
  } catch (error) {
    console.error('Error generating question:', error);
    res.status(500).json({ error: 'Failed to generate question' });
  }
});

// ============= SUBMIT ANSWER =============
// POST /api/interviews/:sessionId/answer - Отправить ответ на вопрос
router.post('/:sessionId/answer', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId, answer } = req.body;
    const userId = req.userId;

    const session = await AIInterviewSession.findOne({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    const question = await AIInterviewQuestion.findOne({
      where: { id: questionId, sessionId }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // TODO: Здесь будет интеграция с YandexGPT для оценки ответа
    // Пока возвращаем mock оценку
    const mockScore = Math.floor(Math.random() * 40) + 60; // 60-100
    const mockFeedback = 'Хороший ответ! Рекомендуем изучить...';

    await question.update({
      userAnswer: answer,
      score: mockScore,
      feedback: mockFeedback,
      answeredAt: new Date()
    });

    res.json({ 
      score: mockScore, 
      feedback: mockFeedback 
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// ============= GET HINT =============
// POST /api/interviews/:sessionId/hint - Получить подсказку
router.post('/:sessionId/hint', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId } = req.body;
    const userId = req.userId;

    const session = await AIInterviewSession.findOne({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    const question = await AIInterviewQuestion.findOne({
      where: { id: questionId, sessionId }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // TODO: Здесь будет AI генерация подсказки
    const hint = question.hints && question.hints.length > 0 
      ? question.hints[0] 
      : 'Подумайте о базовых концепциях';

    res.json({ hint });
  } catch (error) {
    console.error('Error getting hint:', error);
    res.status(500).json({ error: 'Failed to get hint' });
  }
});

// ============= COMPLETE SESSION =============
// POST /api/interviews/:sessionId/complete - Завершить интервью
router.post('/:sessionId/complete', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    const session = await AIInterviewSession.findOne({
      where: { id: sessionId, userId },
      include: [{
        model: AIInterviewQuestion,
        as: 'questions'
      }]
    });

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    // Подсчитываем общий балл
    const totalScore = session.questions.reduce((sum, q) => sum + (q.score || 0), 0) / session.questions.length;

    // Генерируем рекомендации
    const recommendations = [
      'Улучшите знания по основам',
      'Практикуйте больше задач',
      'Изучите best practices'
    ];

    await session.update({
      status: 'completed',
      totalScore,
      recommendations
    });

    res.json({
      score: totalScore,
      strengths: ['Хорошее понимание теории'],
      weaknesses: ['Недостаточно практики'],
      recommendations,
      detailedFeedback: 'Общее впечатление положительное'
    });
  } catch (error) {
    console.error('Error completing interview:', error);
    res.status(500).json({ error: 'Failed to complete interview' });
  }
});



// ============= DELETE SESSION =============
// DELETE /api/interviews/:sessionId - Удалить сессию
router.delete('/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    const session = await AIInterviewSession.findOne({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    await session.destroy();
    res.json({ message: 'Interview session deleted successfully' });
  } catch (error) {
    console.error('Error deleting interview session:', error);
    res.status(500).json({ error: 'Failed to delete interview session' });
  }
});

module.exports = router;