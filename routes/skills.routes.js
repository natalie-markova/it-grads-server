const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../db/models');
const { Resume } = db;
const skillAggregator = require('../services/skillAggregator.service');

const router = express.Router();

// ==========================================
// АВТОМАТИЧЕСКИЙ РАДАР НАВЫКОВ
// ==========================================

// GET /api/skills/auto-radar/:userId - Получить автоматический радар
router.get('/auto-radar/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const forceRecalculate = req.query.force === 'true';

    // Получаем радар (с кэшированием)
    const skillScore = await skillAggregator.getOrRecalculate(userId, forceRecalculate);

    res.json({
      radar: skillScore.calculatedRadar,
      breakdown: skillScore.radarBreakdown,
      sources: {
        codebattle: skillScore.codebattle,
        resume: skillScore.resume,
        aiInterview: skillScore.aiInterview,
        audioInterview: skillScore.audioInterview,
        roadmap: skillScore.roadmap,
        quiz: skillScore.quiz
      },
      recommendations: skillScore.recommendations,
      achievements: skillScore.achievements,
      lastCalculatedAt: skillScore.lastCalculatedAt,
      completeness: skillScore.getCompleteness(),
      strengths: skillScore.getStrengths(),
      growthAreas: skillScore.getGrowthAreas()
    });
  } catch (error) {
    console.error('Error getting auto radar:', error);
    res.status(500).json({ error: 'Failed to get auto radar' });
  }
});

// POST /api/skills/auto-radar/recalculate - Принудительно пересчитать радар
router.post('/auto-radar/recalculate', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const skillScore = await skillAggregator.recalculateRadar(userId);

    res.json({
      message: 'Radar recalculated successfully',
      radar: skillScore.calculatedRadar,
      breakdown: skillScore.radarBreakdown,
      recommendations: skillScore.recommendations,
      achievements: skillScore.achievements,
      lastCalculatedAt: skillScore.lastCalculatedAt
    });
  } catch (error) {
    console.error('Error recalculating radar:', error);
    res.status(500).json({ error: 'Failed to recalculate radar' });
  }
});

// GET /api/skills/auto-radar/:userId/breakdown - Детальная разбивка радара
router.get('/auto-radar/:userId/breakdown', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const skillScore = await skillAggregator.getOrCreateSkillScore(userId);

    // Формируем детальную разбивку для UI
    const categories = [
      { key: 'programming', name: 'Программирование', icon: '💻' },
      { key: 'algorithms', name: 'Алгоритмы', icon: '🧮' },
      { key: 'databases', name: 'Базы данных', icon: '🗄️' },
      { key: 'cloud', name: 'Облачные технологии', icon: '☁️' },
      { key: 'devops', name: 'DevOps', icon: '🔧' },
      { key: 'testing', name: 'Тестирование', icon: '🧪' },
      { key: 'networking', name: 'Сети', icon: '🌐' },
      { key: 'security', name: 'Безопасность', icon: '🔐' },
      { key: 'ai_ml', name: 'ML & AI', icon: '🤖' },
      { key: 'data_science', name: 'Data Science', icon: '📊' },
      { key: 'management', name: 'Управление', icon: '📋' },
      { key: 'ui_ux', name: 'UI/UX', icon: '🎨' },
      { key: 'mobile', name: 'Мобильная разработка', icon: '📱' },
      { key: 'communication', name: 'Коммуникация', icon: '💬' }
    ];

    const breakdown = categories.map(cat => ({
      ...cat,
      value: skillScore.calculatedRadar[cat.key] || 0,
      level: db.SkillScore.getSkillLevel(skillScore.calculatedRadar[cat.key] || 0),
      levelName: db.SkillScore.getLevelName(
        db.SkillScore.getSkillLevel(skillScore.calculatedRadar[cat.key] || 0)
      ),
      sources: skillScore.radarBreakdown[cat.key] || {}
    }));

    res.json({
      breakdown,
      summary: {
        avgScore: Math.round(
          Object.values(skillScore.calculatedRadar).reduce((a, b) => a + b, 0) /
          Object.keys(skillScore.calculatedRadar).length
        ),
        completeness: skillScore.getCompleteness(),
        strongestArea: breakdown.sort((a, b) => b.value - a.value)[0],
        weakestArea: breakdown.sort((a, b) => a.value - b.value)[0]
      }
    });
  } catch (error) {
    console.error('Error getting radar breakdown:', error);
    res.status(500).json({ error: 'Failed to get radar breakdown' });
  }
});

// GET /api/skills/auto-radar/:userId/achievements - Достижения пользователя
router.get('/auto-radar/:userId/achievements', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const skillScore = await skillAggregator.getOrCreateSkillScore(userId);

    res.json({
      achievements: skillScore.achievements || [],
      totalUnlocked: (skillScore.achievements || []).length
    });
  } catch (error) {
    console.error('Error getting achievements:', error);
    res.status(500).json({ error: 'Failed to get achievements' });
  }
});

// GET /api/skills/auto-radar/:userId/recommendations - Рекомендации по развитию
router.get('/auto-radar/:userId/recommendations', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const skillScore = await skillAggregator.getOrRecalculate(userId);

    res.json({
      recommendations: skillScore.recommendations || [],
      strengths: skillScore.getStrengths(),
      growthAreas: skillScore.getGrowthAreas()
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// GET /api/skills/auto-radar/compare/:userId1/:userId2 - Сравнение радаров двух пользователей
router.get('/auto-radar/compare/:userId1/:userId2', authMiddleware, async (req, res) => {
  try {
    const userId1 = parseInt(req.params.userId1);
    const userId2 = parseInt(req.params.userId2);

    const [skillScore1, skillScore2] = await Promise.all([
      skillAggregator.getOrRecalculate(userId1),
      skillAggregator.getOrRecalculate(userId2)
    ]);

    // Сравниваем каждую категорию
    const comparison = {};
    for (const key of Object.keys(skillScore1.calculatedRadar)) {
      comparison[key] = {
        user1: skillScore1.calculatedRadar[key],
        user2: skillScore2.calculatedRadar[key],
        difference: skillScore1.calculatedRadar[key] - skillScore2.calculatedRadar[key]
      };
    }

    res.json({
      user1: {
        radar: skillScore1.calculatedRadar,
        completeness: skillScore1.getCompleteness()
      },
      user2: {
        radar: skillScore2.calculatedRadar,
        completeness: skillScore2.getCompleteness()
      },
      comparison
    });
  } catch (error) {
    console.error('Error comparing radars:', error);
    res.status(500).json({ error: 'Failed to compare radars' });
  }
});

// ==========================================
// СТАРЫЙ API (для обратной совместимости)
// ==========================================

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
