const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../db/models');
const { Resume } = db;

const router = express.Router();

// POST /api/skills/radar - Сохранить навыки из Tech Radar
router.post('/radar', authMiddleware, async (req, res) => {
  try {
    const { userId, skills, radarImage } = req.body;

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

    const updateData = {
      skills: activeSkills,
      skillsArray: activeSkills,
      radarImage: radarImage || null
    };

    if (resume) {
      // Обновляем навыки и изображение радара в существующем резюме
      await resume.update(updateData);
    } else {
      // Создаем новое резюме с навыками
      resume = await Resume.create({
        userId,
        title: 'Мое резюме',
        skills: updateData.skills,
        skillsArray: activeSkills,
        radarImage: radarImage || null,
        description: '',
        isActive: true
      });
    }

    res.json({
      message: 'Skills saved successfully',
      resume: {
        id: resume.id,
        skills: Array.isArray(resume.skills)
          ? resume.skills
          : (Array.isArray(resume.skillsArray) ? resume.skillsArray : []),
        radarImage: resume.radarImage
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

    if (!resume) {
      return res.json({ skills: [] });
    }

    let storedSkills = [];
    if (Array.isArray(resume.skills)) {
      storedSkills = resume.skills;
    } else if (Array.isArray(resume.skillsArray)) {
      storedSkills = resume.skillsArray;
    } else if (typeof resume.skills === 'string') {
      storedSkills = resume.skills
        .split(',')
        .map(skill => skill.trim())
        .filter(Boolean);
    }

    res.json({ skills: storedSkills });
  } catch (error) {
    console.error('Error loading skills:', error);
    res.status(500).json({ error: 'Failed to load skills' });
  }
});

module.exports = router;
