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

    // Сохраняем полную структуру навыков с уровнями (для радара)
    const skillsWithLevels = skills.filter(skill => skill.level > 0);

    // Для обратной совместимости также сохраняем только названия навыков
    const skillNames = skillsWithLevels.map(skill => skill.skill);

    // Ищем существующее резюме пользователя
    let resume = await Resume.findOne({ where: { userId } });

    const updateData = {
      skills: skillsWithLevels,  // Полная структура с уровнями
      skillsArray: skillNames,   // Только названия для совместимости
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
        skills: skillsWithLevels,
        skillsArray: skillNames,
        radarImage: radarImage || null,
        description: '',
        isActive: true
      });
    }

    res.json({
      message: 'Skills saved successfully',
      resume: {
        id: resume.id,
        skills: resume.skills,
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
      return res.json({ skills: [], skillsWithLevels: [] });
    }

    // Проверяем формат данных skills
    const skills = resume.skills;

    // Если skills - массив объектов с category, skill, level - это новый формат
    if (Array.isArray(skills) && skills.length > 0 && typeof skills[0] === 'object' && skills[0].level !== undefined) {
      return res.json({
        skills: skills,  // Полная структура с уровнями
        skillsWithLevels: skills
      });
    }

    // Старый формат - массив строк
    let storedSkills = [];
    if (Array.isArray(skills)) {
      storedSkills = skills;
    } else if (Array.isArray(resume.skillsArray)) {
      storedSkills = resume.skillsArray;
    } else if (typeof skills === 'string') {
      storedSkills = skills
        .split(',')
        .map(skill => skill.trim())
        .filter(Boolean);
    }

    res.json({ skills: storedSkills, skillsWithLevels: [] });
  } catch (error) {
    console.error('Error loading skills:', error);
    res.status(500).json({ error: 'Failed to load skills' });
  }
});

module.exports = router;
