const express = require('express');
const router = express.Router();
const db = require('../db/models');
const { InterviewTracker } = db;
const verifyToken = require('../middleware/verifyToken');

// GET /api/interview-tracker - Получить все собеседования текущего пользователя
router.get('/', verifyToken, async (req, res) => {
  try {
    console.log('Fetching interviews for user:', req.user.id);
    const interviews = await InterviewTracker.findAll({
      where: { userId: req.user.id },
      order: [['date', 'ASC'], ['time', 'ASC']]
    });

    console.log(`Found ${interviews.length} interviews for user ${req.user.id}`);
    res.json(interviews);
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({ message: 'Ошибка при получении собеседований', error: error.message });
  }
});

// POST /api/interview-tracker - Создать новое собеседование
router.post('/', verifyToken, async (req, res) => {
  try {
    console.log('Creating interview for user:', req.user.id);
    console.log('Request body:', req.body);
    
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
      reminder
    } = req.body;

    // Валидация обязательных полей
    if (!company || !position || !date || !time) {
      return res.status(400).json({ 
        message: 'Заполните все обязательные поля: компания, позиция, дата, время' 
      });
    }

    const interview = await InterviewTracker.create({
      userId: req.user.id,
      company: company.trim(),
      position: position.trim(),
      date,
      time,
      type: type || 'online',
      location: location ? location.trim() : null,
      meetingLink: meetingLink ? meetingLink.trim() : null,
      contactPerson: contactPerson ? contactPerson.trim() : null,
      contactPhone: contactPhone ? contactPhone.trim() : null,
      notes: notes ? notes.trim() : null,
      reminder: reminder !== undefined ? reminder : true,
      status: 'scheduled'
    });

    console.log('Interview created successfully:', interview.id);
    res.status(201).json(interview);
  } catch (error) {
    console.error('Error creating interview:', error);
    res.status(500).json({ message: 'Ошибка при создании собеседования', error: error.message });
  }
});

// PUT /api/interview-tracker/:id - Обновить собеседование
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const interview = await InterviewTracker.findByPk(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Собеседование не найдено' });
    }

    if (interview.userId !== req.user.id) {
      return res.status(403).json({ message: 'Нет доступа к этому собеседованию' });
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
      reminder
    } = req.body;

    await interview.update({
      company,
      position,
      date,
      time,
      type,
      location: location || null,
      meetingLink: meetingLink || null,
      contactPerson: contactPerson || null,
      contactPhone: contactPhone || null,
      notes: notes || null,
      reminder: reminder !== undefined ? reminder : interview.reminder
    });

    res.json(interview);
  } catch (error) {
    console.error('Error updating interview:', error);
    res.status(500).json({ message: 'Ошибка при обновлении собеседования', error: error.message });
  }
});

// PATCH /api/interview-tracker/:id/status - Обновить статус собеседования
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const interview = await InterviewTracker.findByPk(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Собеседование не найдено' });
    }

    if (interview.userId !== req.user.id) {
      return res.status(403).json({ message: 'Нет доступа к этому собеседованию' });
    }

    const { status } = req.body;
    await interview.update({ status });

    res.json(interview);
  } catch (error) {
    console.error('Error updating interview status:', error);
    res.status(500).json({ message: 'Ошибка при обновлении статуса', error: error.message });
  }
});

// PATCH /api/interview-tracker/:id/result - Обновить результат собеседования
router.patch('/:id/result', verifyToken, async (req, res) => {
  try {
    const interview = await InterviewTracker.findByPk(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Собеседование не найдено' });
    }

    if (interview.userId !== req.user.id) {
      return res.status(403).json({ message: 'Нет доступа к этому собеседованию' });
    }

    const { result, feedback } = req.body;
    const updateData = { result: result || null };
    if (feedback !== undefined) {
      updateData.feedback = feedback || null;
    }

    await interview.update(updateData);

    res.json(interview);
  } catch (error) {
    console.error('Error updating interview result:', error);
    res.status(500).json({ message: 'Ошибка при обновлении результата', error: error.message });
  }
});

// DELETE /api/interview-tracker/:id - Удалить собеседование
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const interview = await InterviewTracker.findByPk(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Собеседование не найдено' });
    }

    if (interview.userId !== req.user.id) {
      return res.status(403).json({ message: 'Нет доступа к этому собеседованию' });
    }

    await interview.destroy();
    res.json({ message: 'Собеседование удалено' });
  } catch (error) {
    console.error('Error deleting interview:', error);
    res.status(500).json({ message: 'Ошибка при удалении собеседования', error: error.message });
  }
});

module.exports = router;

