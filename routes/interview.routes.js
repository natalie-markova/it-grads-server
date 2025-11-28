const express = require('express');
const router = express.Router();
const { AIInterviewSession, AIInterviewMessage } = require('../db/models');
const authMiddleware = require('../middleware/authMiddleware');
const yandexGPTService = require('../services/yandexGPT.service');

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

    // Генерируем приветственное сообщение через YandexGPT
    const greetingContent = await yandexGPTService.generateGreeting(
        direction,
        technologies,
        level,
        questionsCount || 10
    );

const firstMessage = await AIInterviewMessage.create({
  sessionId: session.id,
  role: 'assistant',
  content: greetingContent
});

    res.status(201).json({
      session,
      firstMessage
    });
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
        model: AIInterviewMessage,
        as: 'messages',
        order: [['createdAt', 'ASC']]
      }]
    });

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching user interviews:', error);
    res.status(500).json({ error: 'Failed to fetch user interviews' });
  }
});

// ============= GET SESSION WITH MESSAGES =============
// GET /api/interviews/:sessionId - Получить сессию и всю историю сообщений
router.get('/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    const session = await AIInterviewSession.findOne({
      where: { id: sessionId, userId },
      include: [{
        model: AIInterviewMessage,
        as: 'messages',
        order: [['createdAt', 'ASC']]
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

// ============= SEND MESSAGE (USER ANSWER) =============
// POST /api/interviews/:sessionId/message - Отправить сообщение пользователя и получить ответ AI
router.post('/:sessionId/message', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const session = await AIInterviewSession.findOne({
      where: { id: sessionId, userId },
      include: [{
        model: AIInterviewMessage,
        as: 'messages',
        order: [['createdAt', 'ASC']]
      }]
    });

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    // Сохраняем сообщение пользователя
    const userMessage = await AIInterviewMessage.create({
      sessionId: session.id,
      role: 'user',
      content: content.trim()
    });

    // Генерируем ответ AI на основе истории диалога
    const messageHistory = [...session.messages, { role: 'user', content: content.trim() }];
    const aiContent = await yandexGPTService.generateNextMessage(
        session.direction,
        session.technologies,
        session.level,
        session.questionsCount,
        messageHistory
    );
    const aiMessage = await AIInterviewMessage.create({
      sessionId: session.id,
      role: 'assistant',
      content: aiContent
    });

    // Обновляем счетчик вопросов
    await session.update({
      currentQuestionIndex: session.currentQuestionIndex + 1
    });

    res.json({
      userMessage,
      aiMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ============= COMPLETE SESSION =============
// POST /api/interviews/:sessionId/complete - Завершить интервью и получить оценку
router.post('/:sessionId/complete', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    const session = await AIInterviewSession.findOne({
      where: { id: sessionId, userId },
      include: [{
        model: AIInterviewMessage,
        as: 'messages',
        order: [['createdAt', 'ASC']]
      }]
    });

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    // Генерируем итоговую оценку через YandexGPT
    const feedback = await yandexGPTService.generateFeedback(
        session.direction,
        session.technologies,
        session.level,
        session.messages
    );

    const totalScore = feedback.totalScore;
    const recommendations = feedback.recommendations;

    await session.update({
      status: 'completed',
      totalScore,
      recommendations
    });

    res.json({
        totalScore: totalScore,
        strengths: feedback.strengths,
        weaknesses: feedback.weaknesses,
        recommendations: feedback.recommendations,
        detailedFeedback: feedback.detailedFeedback
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
