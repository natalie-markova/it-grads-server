const express = require('express');
const router = express.Router();
const db = require('../db/models');
const { Vacancy, User } = db;
const verifyToken = require('../middleware/verifyToken');
const { cacheMiddleware, invalidateCache } = require('../middleware/cacheMiddleware');

// GET /api/vacancies - Получить все активные вакансии
router.get('/', cacheMiddleware(300), async (req, res) => {
  try {
    const { location, minSalary, maxSalary, employmentType, level, skills, search } = req.query;

    const where = { isActive: true };

    if (location) {
      where.location = { [db.Sequelize.Op.iLike]: `%${location}%` };
    }

    if (minSalary) {
      where.salary = { [db.Sequelize.Op.gte]: parseInt(minSalary) };
    }

    if (maxSalary) {
      where.salary = {
        ...(where.salary || {}),
        [db.Sequelize.Op.lte]: parseInt(maxSalary)
      };
    }

    if (employmentType) {
      where.employmentType = employmentType;
    }

    if (level) {
      where.level = level;
    }

    if (search) {
      where[db.Sequelize.Op.or] = [
        { title: { [db.Sequelize.Op.iLike]: `%${search}%` } },
        { description: { [db.Sequelize.Op.iLike]: `%${search}%` } },
        { companyName: { [db.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }

    // Filter by skills if provided
    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      where.skills = {
        [db.Sequelize.Op.contains]: skillsArray
      };
    }

    const vacancies = await Vacancy.findAll({
      where,
      include: [{
        model: User,
        as: 'employer',
        attributes: ['id', 'username', 'email', 'avatar']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(vacancies);
  } catch (error) {
    console.error('Error fetching vacancies:', error);
    res.status(500).json({ message: req.t('vacancy.fetchError') });
  }
});

// GET /api/vacancies/recommended/:userId - Получить рекомендованные вакансии на основе навыков, карты развития и пути обучения
router.get('/recommended/:userId', cacheMiddleware(300), async (req, res) => {
  try {
    const { Resume, RoadmapProgress, Roadmap } = db;
    const userId = parseInt(req.params.userId);

    // Получаем навыки пользователя из резюме (с уровнями)
    const resume = await Resume.findOne({
      where: { userId },
      attributes: ['skills', 'skillsArray']
    });

    // Получаем прогресс по карте специальностей
    const roadmapProgress = await RoadmapProgress.findAll({
      where: { userId },
      include: [{
        model: Roadmap,
        as: 'roadmap',
        attributes: ['id', 'title', 'slug', 'category', 'learningPath', 'relatedRoadmaps']
      }]
    });

    // Собираем все навыки пользователя
    let userSkills = [];
    let userSkillsWithLevels = [];

    // Навыки из радара
    if (resume?.skills && Array.isArray(resume.skills)) {
      if (resume.skills.length > 0 && typeof resume.skills[0] === 'object') {
        // Новый формат с уровнями
        userSkillsWithLevels = resume.skills;
        userSkills = resume.skills.map(s => s.skill || s);
      } else {
        // Старый формат - просто строки
        userSkills = resume.skills;
      }
    } else if (resume?.skillsArray) {
      userSkills = resume.skillsArray;
    }

    // Собираем навыки из карт специальностей (topics из learningPath)
    const roadmapSkills = [];
    const completedRoadmapSkills = []; // Навыки из пройденных шагов
    const userRoadmapTitles = [];
    const userRoadmapCategories = [];

    roadmapProgress.forEach(progress => {
      if (progress.roadmap) {
        userRoadmapTitles.push(progress.roadmap.title.toLowerCase());
        userRoadmapCategories.push(progress.roadmap.category);

        // Добавляем связанные roadmaps
        if (progress.roadmap.relatedRoadmaps) {
          const related = typeof progress.roadmap.relatedRoadmaps === 'string'
            ? JSON.parse(progress.roadmap.relatedRoadmaps)
            : progress.roadmap.relatedRoadmaps;
          related.forEach(r => userRoadmapTitles.push(r.toLowerCase()));
        }

        // Извлекаем ВСЕ topics из learningPath (путь обучения)
        const learningPath = typeof progress.roadmap.learningPath === 'string'
          ? JSON.parse(progress.roadmap.learningPath)
          : progress.roadmap.learningPath;

        if (learningPath && Array.isArray(learningPath)) {
          learningPath.forEach((step, stepIndex) => {
            if (step?.topics) {
              // Все topics из пути обучения
              roadmapSkills.push(...step.topics);

              // Отдельно помечаем пройденные (completedSteps)
              if (progress.completedSteps && progress.completedSteps.includes(stepIndex)) {
                completedRoadmapSkills.push(...step.topics);
              }
            }
          });
        }
      }
    });

    // Объединяем все навыки пользователя (уникальные)
    const allUserSkills = [...new Set([...userSkills, ...roadmapSkills])];
    const confirmedSkills = [...new Set([...userSkills, ...completedRoadmapSkills])];

    // Если нет навыков и нет прогресса по roadmap, возвращаем все вакансии
    if (allUserSkills.length === 0 && roadmapProgress.length === 0) {
      const vacancies = await Vacancy.findAll({
        where: { isActive: true },
        include: [{
          model: User,
          as: 'employer',
          attributes: ['id', 'username', 'email', 'avatar']
        }],
        order: [['createdAt', 'DESC']],
        limit: 50
      });
      return res.json(vacancies.map(v => ({
        ...v.toJSON(),
        matchScore: 0,
        matchingSkills: [],
        matchReason: 'no_profile'
      })));
    }

    // Получаем все активные вакансии
    const vacancies = await Vacancy.findAll({
      where: { isActive: true },
      include: [{
        model: User,
        as: 'employer',
        attributes: ['id', 'username', 'email', 'avatar']
      }]
    });

    // Вычисляем совпадение для каждой вакансии
    const vacanciesWithScore = vacancies.map(vacancy => {
      const vacancySkills = vacancy.skills || [];
      const vacancyTitle = vacancy.title.toLowerCase();
      const vacancyDescription = (vacancy.description || '').toLowerCase();

      // 1. Подсчет совпадающих навыков
      const matchingSkills = [];
      const learningPathSkills = []; // Навыки из пути обучения
      let skillScore = 0;

      allUserSkills.forEach(skill => {
        const skillName = typeof skill === 'object' ? skill.skill : skill;
        const skillLevel = typeof skill === 'object' ? skill.level : 3;
        const isConfirmed = confirmedSkills.includes(skillName);

        const matchedVacancySkill = vacancySkills.find(vSkill =>
          vSkill.toLowerCase().includes(skillName.toLowerCase()) ||
          skillName.toLowerCase().includes(vSkill.toLowerCase())
        );

        if (matchedVacancySkill) {
          if (isConfirmed) {
            matchingSkills.push(skillName);
            skillScore += (skillLevel || 1) * 2; // Подтвержденные навыки ценятся выше
          } else {
            learningPathSkills.push(skillName);
            skillScore += skillLevel || 1;
          }
        }
      });

      // Базовый скор по навыкам (0-50 баллов)
      const totalMatchedSkills = matchingSkills.length + learningPathSkills.length;
      const baseSkillScore = vacancySkills.length > 0
        ? Math.min(50, (totalMatchedSkills / vacancySkills.length) * 50)
        : 0;

      // 2. Бонус за соответствие карте специальностей (0-30 баллов)
      let roadmapBonus = 0;
      let matchedRoadmap = null;

      // Ключевые слова для сопоставления
      const roleKeywords = {
        'frontend': ['frontend', 'front-end', 'фронтенд', 'react', 'vue', 'angular', 'javascript'],
        'backend': ['backend', 'back-end', 'бэкенд', 'node', 'python', 'java', 'c#', 'go', 'php'],
        'fullstack': ['fullstack', 'full-stack', 'full stack', 'фуллстек'],
        'devops': ['devops', 'dev ops', 'sre', 'infrastructure', 'docker', 'kubernetes'],
        'data': ['data', 'ml', 'machine learning', 'ai', 'analyst', 'аналитик', 'scientist']
      };

      userRoadmapTitles.forEach(roadmapTitle => {
        // Прямое совпадение
        if (vacancyTitle.includes(roadmapTitle) ||
            roadmapTitle.includes(vacancyTitle.split(' ')[0])) {
          roadmapBonus = 30;
          matchedRoadmap = roadmapTitle;
        }

        // Проверка по ключевым словам
        Object.entries(roleKeywords).forEach(([role, keywords]) => {
          if (roadmapTitle.includes(role)) {
            keywords.forEach(keyword => {
              if (vacancyTitle.includes(keyword) || vacancyDescription.includes(keyword)) {
                if (roadmapBonus < 25) {
                  roadmapBonus = 25;
                  matchedRoadmap = roadmapTitle;
                }
              }
            });
          }
        });
      });

      // 3. Бонус за уровень навыков и прогресс обучения (0-20 баллов)
      const progressBonus = roadmapProgress.length > 0
        ? Math.min(10, roadmapProgress.reduce((sum, p) => sum + (p.progress || 0), 0) / roadmapProgress.length / 10)
        : 0;

      const levelBonus = allUserSkills.length > 0
        ? Math.min(10, (skillScore / allUserSkills.length) * 2)
        : 0;

      // Итоговый скор
      const totalScore = Math.round(baseSkillScore + roadmapBonus + progressBonus + levelBonus);

      // Определяем причину рекомендации
      let matchReason = 'skills';
      if (roadmapBonus > 0 && matchingSkills.length > 0) {
        matchReason = 'skills_and_roadmap';
      } else if (roadmapBonus > 0) {
        matchReason = 'roadmap';
      } else if (learningPathSkills.length > 0 && matchingSkills.length === 0) {
        matchReason = 'learning_path';
      }

      return {
        ...vacancy.toJSON(),
        matchScore: Math.min(100, totalScore),
        matchingSkills,
        learningPathSkills, // Навыки из пути обучения (ещё изучаются)
        matchedRoadmap,
        matchReason
      };
    });

    // Сортируем по совпадению (сначала лучшие)
    vacanciesWithScore.sort((a, b) => b.matchScore - a.matchScore);

    res.json(vacanciesWithScore);
  } catch (error) {
    console.error('Error fetching recommended vacancies:', error);
    res.status(500).json({ message: req.t('vacancy.recommendedError') });
  }
});

// GET /api/vacancies/:id - Получить конкретную вакансию
router.get('/:id', cacheMiddleware(600), async (req, res) => {
  try {
    const vacancy = await Vacancy.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'employer',
        attributes: ['id', 'username', 'email', 'avatar', 'phone']
      }]
    });

    if (!vacancy) {
      return res.status(404).json({ message: req.t('vacancy.notFound') });
    }

    res.json(vacancy);
  } catch (error) {
    console.error('Error fetching vacancy:', error);
    res.status(500).json({ message: req.t('vacancy.fetchOneError') });
  }
});

// GET /api/vacancies/employer/:employerId - Получить вакансии работодателя
router.get('/employer/:employerId', cacheMiddleware(300), async (req, res) => {
  try {
    const vacancies = await Vacancy.findAll({
      where: { employerId: req.params.employerId },
      order: [['createdAt', 'DESC']]
    });

    res.json(vacancies);
  } catch (error) {
    console.error('Error fetching employer vacancies:', error);
    res.status(500).json({ message: req.t('vacancy.fetchEmployerError') });
  }
});

// POST /api/vacancies - Создать новую вакансию
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, requirements, salary, location, employmentType } = req.body;

    const vacancy = await Vacancy.create({
      employerId: req.user.id,
      title,
      description,
      requirements,
      salary,
      location,
      employmentType,
      isActive: true
    });

    // Инвалидируем кэш вакансий при создании
    await invalidateCache(`cache:/api/vacancies*`);

    res.status(201).json(vacancy);
  } catch (error) {
    console.error('Error creating vacancy:', error);
    res.status(500).json({ message: req.t('vacancy.createError') });
  }
});

// PUT /api/vacancies/:id - Обновить вакансию
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const vacancy = await Vacancy.findByPk(req.params.id);

    if (!vacancy) {
      return res.status(404).json({ message: req.t('vacancy.notFound') });
    }

    if (vacancy.employerId !== req.user.id) {
      return res.status(403).json({ message: req.t('vacancy.accessDenied') });
    }

    const { title, description, requirements, salary, location, employmentType, isActive } = req.body;

    await vacancy.update({
      title,
      description,
      requirements,
      salary,
      location,
      employmentType,
      isActive
    });

    // Инвалидируем кэш вакансий при обновлении
    await invalidateCache(`cache:/api/vacancies*`);

    res.json(vacancy);
  } catch (error) {
    console.error('Error updating vacancy:', error);
    res.status(500).json({ message: req.t('vacancy.updateError') });
  }
});

// DELETE /api/vacancies/:id - Удалить вакансию
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const vacancy = await Vacancy.findByPk(req.params.id);

    if (!vacancy) {
      return res.status(404).json({ message: req.t('vacancy.notFound') });
    }

    if (vacancy.employerId !== req.user.id) {
      return res.status(403).json({ message: req.t('vacancy.accessDenied') });
    }

    await vacancy.destroy();

    // Инвалидируем кэш вакансий при удалении
    await invalidateCache(`cache:/api/vacancies*`);

    res.json({ message: req.t('vacancy.deleted') });
  } catch (error) {
    console.error('Error deleting vacancy:', error);
    res.status(500).json({ message: req.t('vacancy.deleteError') });
  }
});

// PATCH /api/vacancies/:id/toggle - Переключить статус вакансии
router.patch('/:id/toggle', verifyToken, async (req, res) => {
  try {
    const vacancy = await Vacancy.findByPk(req.params.id);

    if (!vacancy) {
      return res.status(404).json({ message: req.t('vacancy.notFound') });
    }

    if (vacancy.employerId !== req.user.id) {
      return res.status(403).json({ message: req.t('vacancy.accessDenied') });
    }

    await vacancy.update({
      isActive: !vacancy.isActive
    });

    // Инвалидируем кэш вакансий при обновлении
    await invalidateCache(`cache:/api/vacancies*`);

    res.json(vacancy);
  } catch (error) {
    console.error('Error toggling vacancy status:', error);
    res.status(500).json({ message: req.t('vacancy.toggleError') });
  }
});

module.exports = router;
