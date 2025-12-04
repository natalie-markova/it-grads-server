const express = require('express');
const router = express.Router();
const { AIInterviewSession, AIInterviewMessage } = require('../db/models');
const authMiddleware = require('../middleware/authMiddleware');
const yandexGPTService = require('../services/yandexGPT.service');
const audioInterviewService = require('../services/audioInterview.service');
const yandexTTSService = require('../services/yandexTTS.service');
const skillAggregator = require('../services/skillAggregator.service');
const { i18nMiddleware } = require('../config/i18n');

// Apply i18n middleware to all routes
router.use(i18nMiddleware);

// ============= CREATE SESSION =============
// POST /api/interviews - Создать новую сессию AI интервью
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { direction, technologies, level, questionsCount } = req.body;
    const userId = req.userId;

    if (!direction || !technologies || !level) {
      return res.status(400).json({
        error: req.t('interview.missingFields')
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
    res.status(500).json({ error: req.t('interview.createError') });
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
    res.status(500).json({ error: req.t('interview.fetchError') });
  }
});

// ============= TEXT-TO-SPEECH ROUTES =============
// POST /api/interviews/tts - Синтез речи через YandexSpeechKit
router.post('/tts', async (req, res) => {
  try {
    const { text, gender, voiceId } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: req.t('interview.textRequired') });
    }

    // Ограничение длины текста (Yandex limit ~5000 символов)
    if (text.length > 5000) {
      return res.status(400).json({ error: req.t('interview.textTooLong') });
    }

    const options = {};
    if (gender) options.gender = gender;
    if (voiceId) {
      options.voice = { id: voiceId, emotion: 'neutral' };
    }

    const result = await yandexTTSService.synthesize(text, options);

    // Отправляем аудио в base64 для простой интеграции с клиентом
    res.json({
      audio: result.audio.toString('base64'),
      format: result.format,
      voice: result.voice
    });
  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ error: req.t('interview.ttsError') });
  }
});

// GET /api/interviews/tts/voices - Получить список доступных голосов
router.get('/tts/voices', (req, res) => {
  const voices = yandexTTSService.getAvailableVoices();
  res.json(voices);
});

// ============= AUDIO INTERVIEW ROUTES =============
// ВАЖНО: Эти роуты должны быть ПЕРЕД роутами с :sessionId

// POST /api/interviews/audio - Создать новую сессию аудио-интервью
router.post('/audio', authMiddleware, async (req, res) => {
  try {
    const { interviewerPersona, position } = req.body;
    const userId = req.userId;

    if (!interviewerPersona || !position) {
      return res.status(400).json({
        error: req.t('interview.missingAudioFields')
      });
    }

    const personaConfig = audioInterviewService.getPersonaConfig(interviewerPersona);
    if (!personaConfig) {
      return res.status(400).json({ error: req.t('interview.invalidPersona') });
    }

    // Создаем сессию
    const session = await AIInterviewSession.create({
      userId,
      interviewerPersona,
      position,
      status: 'in-progress',
      currentQuestionIndex: 0
    });

    // Генерируем первый вопрос для выбранной позиции
    const firstQuestion = audioInterviewService.getQuestion(interviewerPersona, 0, position);
    const greetingContent = `Здравствуйте! Я ${personaConfig.title}. Вы претендуете на позицию "${position}". Давайте начнем наше интервью.\n\n${firstQuestion}`;

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
    console.error('Error creating audio interview session:', error);
    res.status(500).json({ error: req.t('interview.createError') });
  }
});

// POST /api/interviews/audio/:sessionId/answer - Отправить ответ на вопрос аудио-интервью
router.post('/audio/:sessionId/answer', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: req.t('interview.answerRequired') });
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
      return res.status(404).json({ error: req.t('interview.sessionNotFound') });
    }

    // Оцениваем ответ пользователя
    const evaluation = audioInterviewService.evaluateAnswer(content.trim());

    // Сохраняем ответ пользователя
    const userMessage = await AIInterviewMessage.create({
      sessionId: session.id,
      role: 'user',
      content: content.trim()
    });

    // Обновляем индекс вопроса
    const nextQuestionIndex = session.currentQuestionIndex + 1;
    const totalQuestions = 5;
    const isLastQuestion = nextQuestionIndex >= totalQuestions;

    let aiContent;
    if (isLastQuestion) {
      aiContent = `${evaluation.evaluation}\n\nСпасибо за ваши ответы! Интервью завершено. Сейчас я подготовлю для вас обратную связь.`;
    } else {
      const nextQuestion = audioInterviewService.getQuestion(session.interviewerPersona, nextQuestionIndex, session.position);
      aiContent = `${evaluation.evaluation}\n\nСледующий вопрос:\n${nextQuestion}`;
    }

    // Сохраняем ответ AI с оценкой
    const aiMessage = await AIInterviewMessage.create({
      sessionId: session.id,
      role: 'assistant',
      content: aiContent,
      score: evaluation.score,
      evaluation: evaluation.evaluation
    });

    // Обновляем сессию
    await session.update({
      currentQuestionIndex: nextQuestionIndex
    });

    res.json({
      userMessage,
      aiMessage,
      questionNumber: nextQuestionIndex,
      isLastQuestion
    });
  } catch (error) {
    console.error('Error sending audio interview answer:', error);
    res.status(500).json({ error: req.t('interview.sessionError') });
  }
});

// POST /api/interviews/audio/:sessionId/complete - Завершить аудио-интервью
router.post('/audio/:sessionId/complete', authMiddleware, async (req, res) => {
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
      return res.status(404).json({ error: req.t('interview.sessionNotFound') });
    }

    // Генерируем итоговую оценку
    const summary = audioInterviewService.buildSummary(session.messages);

    // Вычисляем длительность
    const duration = Math.floor((new Date() - new Date(session.createdAt)) / 1000);

    await session.update({
      status: 'completed',
      overallScore: summary.overallScore,
      strengths: summary.strengths,
      weaknesses: summary.weaknesses,
      feedback: summary.feedback,
      duration,
      completedAt: new Date()
    });

    // Триггерим пересчёт радара навыков (асинхронно)
    skillAggregator.triggerRecalculation(userId, 'audioInterview');

    res.json({
      overallScore: summary.overallScore,
      strengths: summary.strengths,
      weaknesses: summary.weaknesses,
      feedback: summary.feedback,
      duration
    });
  } catch (error) {
    console.error('Error completing audio interview:', error);
    res.status(500).json({ error: req.t('interview.sessionError') });
  }
});

// ============= ROUTES WITH :sessionId PARAMETER =============
// Эти роуты должны быть ПОСЛЕ статических роутов (audio, my)

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
      return res.status(404).json({ error: req.t('interview.sessionNotFound') });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching interview session:', error);
    res.status(500).json({ error: req.t('interview.fetchError') });
  }
});

// POST /api/interviews/:sessionId/message - Отправить сообщение пользователя и получить ответ AI
router.post('/:sessionId/message', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: req.t('interview.messageRequired') });
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
      return res.status(404).json({ error: req.t('interview.sessionNotFound') });
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
    res.status(500).json({ error: req.t('interview.sessionError') });
  }
});

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
      return res.status(404).json({ error: req.t('interview.sessionNotFound') });
    }

    // Генерируем итоговую оценку через YandexGPT
    const feedback = await yandexGPTService.generateFeedback(
        session.direction,
        session.technologies,
        session.level,
        session.messages
    );

    await session.update({
      status: 'completed',
      totalScore: feedback.totalScore,
      recommendations: feedback.recommendations,
      strengths: feedback.strengths,
      weaknesses: feedback.weaknesses,
      detailedFeedback: feedback.detailedFeedback
    });

    // Триггерим пересчёт радара навыков (асинхронно)
    skillAggregator.triggerRecalculation(userId, 'aiInterview');

    res.json({
        totalScore: feedback.totalScore,
        strengths: feedback.strengths,
        weaknesses: feedback.weaknesses,
        recommendations: feedback.recommendations,
        detailedFeedback: feedback.detailedFeedback
    });
  } catch (error) {
    console.error('Error completing interview:', error);
    res.status(500).json({ error: req.t('interview.sessionError') });
  }
});

// DELETE /api/interviews/:sessionId - Удалить сессию
router.delete('/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    const session = await AIInterviewSession.findOne({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return res.status(404).json({ error: req.t('interview.sessionNotFound') });
    }

    await session.destroy();
    res.json({ message: req.t('interview.deleted') });
  } catch (error) {
    console.error('Error deleting interview session:', error);
    res.status(500).json({ error: req.t('interview.deleteError') });
  }
});

module.exports = router;