const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../db/models');
const { Resume } = db;

const router = express.Router();

// POST /api/skills/radar - Сохранить навыки из Tech Radar
router.post('/radar', authMiddleware, async (req, res) => {
  try {
    const { userId, skills } = req.body;

    if (!skills || !Array.isArray(skills)) {
      return res.status(400).json({ error: 'Skills array is required' });
    }

    // Проверяем права доступа
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Фильтруем навыки с уровнем > 0
    const activeSkills = skills
      .filter(skill => skill.level > 0)
      .map(skill => skill.skill);

    // Ищем существующее резюме пользователя
    let resume = await Resume.findOne({ where: { userId } });

    if (resume) {
      // Обновляем навыки в существующем резюме
      await resume.update({ skills: activeSkills });
    } else {
      // Создаем новое резюме с навыками
      resume = await Resume.create({
        userId,
        title: 'Мое резюме',
        skills: activeSkills,
        description: '',
        isActive: true
      });
    }

    res.json({
      message: 'Skills saved successfully',
      resume: {
        id: resume.id,
        skills: resume.skills
      }
    });
  } catch (error) {
    console.error('Error saving skills:', error);
    res.status(500).json({ error: 'Failed to save skills' });
  }
});

// GET /api/skills/radar/:userId - Получить навыки пользователя
router.get('/radar/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Проверяем права доступа
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const resume = await Resume.findOne({ where: { userId } });

    if (!resume || !resume.skills) {
      return res.json({ skills: [] });
    }

    res.json({ skills: resume.skills });
  } catch (error) {
    console.error('Error loading skills:', error);
    res.status(500).json({ error: 'Failed to load skills' });
  }
});

module.exports = router;
