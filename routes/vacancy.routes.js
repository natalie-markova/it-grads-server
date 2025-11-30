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
    res.status(500).json({ message: 'Ошибка при получении вакансий' });
  }
});

// GET /api/vacancies/recommended/:userId - Получить рекомендованные вакансии на основе навыков
router.get('/recommended/:userId', cacheMiddleware(600), async (req, res) => {
  try {
    const { Resume } = db;
    const userId = parseInt(req.params.userId);

    // Получаем навыки пользователя из резюме
    const resume = await Resume.findOne({
      where: { userId },
      attributes: ['skills']
    });

    if (!resume || !resume.skills || resume.skills.length === 0) {
      // Если навыки не найдены, возвращаем все вакансии
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
      return res.json(vacancies.map(v => ({ ...v.toJSON(), matchScore: 0 })));
    }

    const userSkills = resume.skills;

    // Получаем все активные вакансии
    const vacancies = await Vacancy.findAll({
      where: { isActive: true },
      include: [{
        model: User,
        as: 'employer',
        attributes: ['id', 'username', 'email', 'avatar']
      }]
    });

    // Вычисляем совпадение навыков для каждой вакансии
    const vacanciesWithScore = vacancies.map(vacancy => {
      const vacancySkills = vacancy.skills || [];

      // Подсчет совпадающих навыков
      const matchingSkills = userSkills.filter(skill =>
        vacancySkills.some(vSkill =>
          vSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(vSkill.toLowerCase())
        )
      );

      const matchScore = vacancySkills.length > 0
        ? (matchingSkills.length / vacancySkills.length) * 100
        : 0;

      return {
        ...vacancy.toJSON(),
        matchScore: Math.round(matchScore),
        matchingSkills: matchingSkills
      };
    });

    // Сортируем по совпадению навыков (сначала лучшие совпадения)
    vacanciesWithScore.sort((a, b) => b.matchScore - a.matchScore);

    res.json(vacanciesWithScore);
  } catch (error) {
    console.error('Error fetching recommended vacancies:', error);
    res.status(500).json({ message: 'Ошибка при получении рекомендованных вакансий' });
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
      return res.status(404).json({ message: 'Вакансия не найдена' });
    }

    res.json(vacancy);
  } catch (error) {
    console.error('Error fetching vacancy:', error);
    res.status(500).json({ message: 'Ошибка при получении вакансии' });
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
    res.status(500).json({ message: 'Ошибка при получении вакансий работодателя' });
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
    res.status(500).json({ message: 'Ошибка при создании вакансии' });
  }
});

// PUT /api/vacancies/:id - Обновить вакансию
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const vacancy = await Vacancy.findByPk(req.params.id);

    if (!vacancy) {
      return res.status(404).json({ message: 'Вакансия не найдена' });
    }

    if (vacancy.employerId !== req.user.id) {
      return res.status(403).json({ message: 'Нет доступа' });
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
    res.status(500).json({ message: 'Ошибка при обновлении вакансии' });
  }
});

// DELETE /api/vacancies/:id - Удалить вакансию
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const vacancy = await Vacancy.findByPk(req.params.id);

    if (!vacancy) {
      return res.status(404).json({ message: 'Вакансия не найдена' });
    }

    if (vacancy.employerId !== req.user.id) {
      return res.status(403).json({ message: 'Нет доступа' });
    }

    await vacancy.destroy();

    // Инвалидируем кэш вакансий при удалении
    await invalidateCache(`cache:/api/vacancies*`);

    res.json({ message: 'Вакансия удалена' });
  } catch (error) {
    console.error('Error deleting vacancy:', error);
    res.status(500).json({ message: 'Ошибка при удалении вакансии' });
  }
});

// PATCH /api/vacancies/:id/toggle - Переключить статус вакансии
router.patch('/:id/toggle', verifyToken, async (req, res) => {
  try {
    const vacancy = await Vacancy.findByPk(req.params.id);

    if (!vacancy) {
      return res.status(404).json({ message: 'Вакансия не найдена' });
    }

    if (vacancy.employerId !== req.user.id) {
      return res.status(403).json({ message: 'Нет доступа' });
    }

    await vacancy.update({
      isActive: !vacancy.isActive
    });

    // Инвалидируем кэш вакансий при обновлении
    await invalidateCache(`cache:/api/vacancies*`);

    res.json(vacancy);
  } catch (error) {
    console.error('Error toggling vacancy status:', error);
    res.status(500).json({ message: 'Ошибка при изменении статуса вакансии' });
  }
});

module.exports = router;
