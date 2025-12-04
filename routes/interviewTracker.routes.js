const express = require('express');
const router = express.Router();
const { InterviewTracker, User, Vacancy } = require('../db/models');
const authMiddleware = require('../middleware/authMiddleware');
const { Op } = require('sequelize');

// ============= GRADUATE ROUTES =============

// GET /api/interview-tracker - Получить все собеседования текущего пользователя
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const interviews = await InterviewTracker.findAll({
      where: { userId },
      include: [
        {
          model: User,
          as: 'employer',
          attributes: ['id', 'username', 'companyName', 'avatar']
        },
        {
          model: Vacancy,
          as: 'vacancy',
          attributes: ['id', 'title']
        }
      ],
      order: [['date', 'ASC'], ['time', 'ASC']]
    });

    res.json(interviews);
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({ error: 'Ошибка при получении собеседований' });
  }
});

// POST /api/interview-tracker - Создать новое собеседование
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      company,
      position,
      date,
      time,
      type,
      location,
      meetingLink,
      contactPerson,
      contactPhone,
      notes,
      reminder,
      employerId,
      vacancyId,
      sharedWithEmployer
    } = req.body;

    if (!company || !position || !date || !time) {
      return res.status(400).json({ error: 'Заполните обязательные поля: компания, позиция, дата, время' });
    }

    const interview = await InterviewTracker.create({
      userId,
      company,
      position,
      date,
      time,
      type: type || 'online',
      location,
      meetingLink,
      contactPerson,
      contactPhone,
      notes,
      reminder: reminder !== false,
      employerId: employerId || null,
      vacancyId: vacancyId || null,
      sharedWithEmployer: sharedWithEmployer || false
    });

    res.status(201).json(interview);
  } catch (error) {
    console.error('Error creating interview:', error);
    res.status(500).json({ error: 'Ошибка при создании собеседования' });
  }
});

// PUT /api/interview-tracker/:id - Обновить собеседование
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const interview = await InterviewTracker.findOne({
      where: { id, userId }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Собеседование не найдено' });
    }

    const {
      company,
      position,
      date,
      time,
      type,
      location,
      meetingLink,
      contactPerson,
      contactPhone,
      notes,
      reminder,
      employerId,
      vacancyId,
      sharedWithEmployer
    } = req.body;

    await interview.update({
      company: company || interview.company,
      position: position || interview.position,
      date: date || interview.date,
      time: time || interview.time,
      type: type || interview.type,
      location,
      meetingLink,
      contactPerson,
      contactPhone,
      notes,
      reminder: reminder !== undefined ? reminder : interview.reminder,
      employerId: employerId !== undefined ? employerId : interview.employerId,
      vacancyId: vacancyId !== undefined ? vacancyId : interview.vacancyId,
      sharedWithEmployer: sharedWithEmployer !== undefined ? sharedWithEmployer : interview.sharedWithEmployer
    });

    res.json(interview);
  } catch (error) {
    console.error('Error updating interview:', error);
    res.status(500).json({ error: 'Ошибка при обновлении собеседования' });
  }
});

// PATCH /api/interview-tracker/:id/status - Изменить статус собеседования
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { status } = req.body;

    const interview = await InterviewTracker.findOne({
      where: { id, userId }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Собеседование не найдено' });
    }

    if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Неверный статус' });
    }

    await interview.update({ status });
    res.json(interview);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Ошибка при обновлении статуса' });
  }
});

// PATCH /api/interview-tracker/:id/result - Установить результат собеседования
router.patch('/:id/result', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { result, feedback } = req.body;

    const interview = await InterviewTracker.findOne({
      where: { id, userId }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Собеседование не найдено' });
    }

    if (result && !['passed', 'failed', 'pending'].includes(result)) {
      return res.status(400).json({ error: 'Неверный результат' });
    }

    await interview.update({
      result,
      feedback: feedback !== undefined ? feedback : interview.feedback
    });
    res.json(interview);
  } catch (error) {
    console.error('Error updating result:', error);
    res.status(500).json({ error: 'Ошибка при обновлении результата' });
  }
});

// DELETE /api/interview-tracker/:id - Удалить собеседование
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const interview = await InterviewTracker.findOne({
      where: { id, userId }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Собеседование не найдено' });
    }

    await interview.destroy();
    res.json({ message: 'Собеседование удалено' });
  } catch (error) {
    console.error('Error deleting interview:', error);
    res.status(500).json({ error: 'Ошибка при удалении собеседования' });
  }
});

// PATCH /api/interview-tracker/:id/share - Поделиться с работодателем
router.patch('/:id/share', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { employerId, sharedWithEmployer } = req.body;

    const interview = await InterviewTracker.findOne({
      where: { id, userId }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Собеседование не найдено' });
    }

    // Проверить что работодатель существует и имеет роль employer
    if (employerId) {
      const employer = await User.findOne({
        where: { id: employerId, role: 'employer' }
      });

      if (!employer) {
        return res.status(400).json({ error: 'Работодатель не найден' });
      }
    }

    await interview.update({
      employerId: employerId !== undefined ? employerId : interview.employerId,
      sharedWithEmployer: sharedWithEmployer !== undefined ? sharedWithEmployer : true
    });

    res.json(interview);
  } catch (error) {
    console.error('Error sharing interview:', error);
    res.status(500).json({ error: 'Ошибка при настройке доступа' });
  }
});

// ============= EMPLOYER ROUTES =============

// GET /api/interview-tracker/employer - Получить собеседования, расшаренные с работодателем
router.get('/employer', authMiddleware, async (req, res) => {
  try {
    const employerId = req.userId;

    // Проверить что пользователь - работодатель
    const user = await User.findByPk(employerId);
    if (!user || user.role !== 'employer') {
      return res.status(403).json({ error: 'Доступ только для работодателей' });
    }

    const interviews = await InterviewTracker.findAll({
      where: {
        employerId,
        sharedWithEmployer: true
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'avatar']
        },
        {
          model: Vacancy,
          as: 'vacancy',
          attributes: ['id', 'title']
        }
      ],
      order: [['date', 'ASC'], ['time', 'ASC']]
    });

    res.json(interviews);
  } catch (error) {
    console.error('Error fetching employer interviews:', error);
    res.status(500).json({ error: 'Ошибка при получении собеседований' });
  }
});

// PATCH /api/interview-tracker/employer/:id/confirm - Подтвердить собеседование работодателем
router.patch('/employer/:id/confirm', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const employerId = req.userId;
    const { employerConfirmed, employerNotes } = req.body;

    // Проверить что пользователь - работодатель
    const user = await User.findByPk(employerId);
    if (!user || user.role !== 'employer') {
      return res.status(403).json({ error: 'Доступ только для работодателей' });
    }

    const interview = await InterviewTracker.findOne({
      where: {
        id,
        employerId,
        sharedWithEmployer: true
      }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Собеседование не найдено или нет доступа' });
    }

    await interview.update({
      employerConfirmed: employerConfirmed !== undefined ? employerConfirmed : interview.employerConfirmed,
      employerNotes: employerNotes !== undefined ? employerNotes : interview.employerNotes
    });

    res.json(interview);
  } catch (error) {
    console.error('Error confirming interview:', error);
    res.status(500).json({ error: 'Ошибка при подтверждении собеседования' });
  }
});

// PATCH /api/interview-tracker/employer/:id/reschedule - Предложить новое время (работодатель)
router.patch('/employer/:id/reschedule', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const employerId = req.userId;
    const { date, time, employerNotes } = req.body;

    // Проверить что пользователь - работодатель
    const user = await User.findByPk(employerId);
    if (!user || user.role !== 'employer') {
      return res.status(403).json({ error: 'Доступ только для работодателей' });
    }

    const interview = await InterviewTracker.findOne({
      where: {
        id,
        employerId,
        sharedWithEmployer: true
      }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Собеседование не найдено или нет доступа' });
    }

    await interview.update({
      date: date || interview.date,
      time: time || interview.time,
      employerNotes: employerNotes || `Время изменено работодателем. ${interview.employerNotes || ''}`,
      employerConfirmed: true
    });

    res.json(interview);
  } catch (error) {
    console.error('Error rescheduling interview:', error);
    res.status(500).json({ error: 'Ошибка при переносе собеседования' });
  }
});

// GET /api/interview-tracker/employer/candidate/:candidateId - Получить все собеседования кандидата
router.get('/employer/candidate/:candidateId', authMiddleware, async (req, res) => {
  try {
    const employerId = req.userId;
    const { candidateId } = req.params;

    // Проверить что пользователь - работодатель
    const user = await User.findByPk(employerId);
    if (!user || user.role !== 'employer') {
      return res.status(403).json({ error: 'Доступ только для работодателей' });
    }

    const interviews = await InterviewTracker.findAll({
      where: {
        userId: candidateId,
        employerId,
        sharedWithEmployer: true
      },
      include: [
        {
          model: Vacancy,
          as: 'vacancy',
          attributes: ['id', 'title']
        }
      ],
      order: [['date', 'DESC'], ['time', 'DESC']]
    });

    res.json(interviews);
  } catch (error) {
    console.error('Error fetching candidate interviews:', error);
    res.status(500).json({ error: 'Ошибка при получении собеседований кандидата' });
  }
});

module.exports = router;
