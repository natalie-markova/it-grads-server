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

// GET /api/vacancies/recommended/:userId - Получить рекомендованные вакансии на основе резюме, профиля и радара
router.get('/recommended/:userId', cacheMiddleware(300), async (req, res) => {
  try {
    const { Resume, User, SkillScore } = db;
    const userId = parseInt(req.params.userId);

    // Получаем профиль пользователя
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'firstName', 'lastName', 'city', 'phone', 'email', 'experience', 'education', 'about']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Получаем навыки пользователя из резюме (с уровнями)
    const resume = await Resume.findOne({
      where: { userId },
      attributes: ['skills', 'skillsArray', 'title', 'description', 'experience', 'education', 'level', 'location']
    });

    // Получаем радар навыков
    const userSkillScore = await SkillScore.findOne({
      where: { userId },
      attributes: ['calculatedRadar', 'radarBreakdown']
    });

    // Проверяем, заполнено ли что-то
    const hasResume = resume && (
      (resume.skills && Array.isArray(resume.skills) && resume.skills.length > 0) ||
      (resume.skillsArray && Array.isArray(resume.skillsArray) && resume.skillsArray.length > 0) ||
      resume.title || resume.description || resume.experience || resume.education
    );

    const hasProfile = user && (
      user.firstName || user.lastName || user.city || user.phone || user.experience || user.education || user.about
    );

    const hasRadar = userSkillScore && userSkillScore.calculatedRadar && 
      Object.values(userSkillScore.calculatedRadar).some(value => value > 0);

    // Если ничего не заполнено, возвращаем пустой массив
    if (!hasResume && !hasProfile && !hasRadar) {
      return res.json([]);
    }

    // Собираем все навыки пользователя
    let userSkills = [];
    let userSkillsWithLevels = [];

    // Навыки из резюме
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

    // Навыки из радара (если есть)
    if (userSkillScore?.calculatedRadar) {
      const radar = userSkillScore.calculatedRadar;
      // Извлекаем навыки из радара на основе категорий
      const radarCategories = {
        'programming': ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby'],
        'databases': ['SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch'],
        'cloud': ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes'],
        'devops': ['CI/CD', 'Jenkins', 'GitLab CI', 'GitHub Actions', 'Terraform', 'Ansible'],
        'testing': ['Jest', 'Mocha', 'Selenium', 'Cypress', 'Unit Testing', 'E2E Testing'],
        'networking': ['TCP/IP', 'HTTP/HTTPS', 'REST', 'GraphQL', 'WebSocket'],
        'security': ['OAuth', 'JWT', 'Encryption', 'Security Best Practices'],
        'ai_ml': ['Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch'],
        'data_science': ['Data Analysis', 'Pandas', 'NumPy', 'Data Visualization'],
        'management': ['Project Management', 'Agile', 'Scrum', 'Team Leadership'],
        'ui_ux': ['UI Design', 'UX Design', 'Figma', 'Adobe XD'],
        'mobile': ['React Native', 'Flutter', 'iOS', 'Android'],
        'communication': ['Communication', 'Teamwork', 'Presentation'],
        'algorithms': ['Algorithms', 'Data Structures', 'Problem Solving']
      };

      Object.entries(radar).forEach(([category, value]) => {
        if (value > 0 && radarCategories[category]) {
          // Добавляем навыки из категории радара, если уровень > 0
          radarCategories[category].forEach(skill => {
            if (!userSkills.includes(skill)) {
              userSkills.push(skill);
            }
          });
        }
      });
    }

    // Объединяем все навыки пользователя (уникальные) - только из резюме и радара
    const allUserSkills = [...new Set(userSkills)];
    const confirmedSkills = [...new Set(userSkills)];

    // Если нет навыков, возвращаем пустой массив
    if (allUserSkills.length === 0) {
      return res.json([]);
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

      // 1. Подсчет совпадающих навыков из резюме и радара
      const matchingSkills = [];
      let skillScoreValue = 0;

      allUserSkills.forEach(skill => {
        const skillName = typeof skill === 'object' ? skill.skill : skill;
        const skillLevel = typeof skill === 'object' ? skill.level : 3;

        const matchedVacancySkill = vacancySkills.find(vSkill =>
          vSkill.toLowerCase().includes(skillName.toLowerCase()) ||
          skillName.toLowerCase().includes(vSkill.toLowerCase())
        );

        if (matchedVacancySkill) {
          matchingSkills.push(skillName);
          skillScoreValue += (skillLevel || 1) * 2; // Навыки с уровнями ценятся выше
        }
      });

      // Базовый скор по навыкам (0-60 баллов)
      const baseSkillScore = vacancySkills.length > 0
        ? Math.min(60, (matchingSkills.length / vacancySkills.length) * 60)
        : 0;

      // 2. Бонус за соответствие профилю (0-20 баллов)
      let profileBonus = 0;
      
      // Проверка локации
      if (user.city && vacancy.location) {
        const userCity = user.city.toLowerCase();
        const vacancyLocation = vacancy.location.toLowerCase();
        if (vacancyLocation.includes(userCity) || userCity.includes(vacancyLocation)) {
          profileBonus += 10;
        }
      }

      // Проверка уровня (из резюме)
      if (resume?.level && vacancy.level) {
        const levelMap = { 'junior': 1, 'middle': 2, 'senior': 3, 'lead': 4 };
        const userLevel = levelMap[resume.level] || 1;
        const vacancyLevel = levelMap[vacancy.level] || 1;
        if (userLevel >= vacancyLevel) {
          profileBonus += 10;
        }
      }

      // 3. Бонус за уровень навыков из радара (0-20 баллов)
      let radarBonus = 0;
      if (userSkillScore && userSkillScore.calculatedRadar) {
        const radar = userSkillScore.calculatedRadar;
        const totalRadarValue = Object.values(radar).reduce((sum, val) => sum + (val || 0), 0);
        const avgRadarValue = totalRadarValue / Object.keys(radar).length;
        radarBonus = Math.min(20, avgRadarValue * 2); // Максимум 20 баллов
      }

      // Итоговый скор
      const totalScore = Math.round(baseSkillScore + profileBonus + radarBonus);

      // Определяем причину рекомендации
      let matchReason = 'skills';
      if (profileBonus > 0 && matchingSkills.length > 0) {
        matchReason = 'skills_and_profile';
      } else if (profileBonus > 0) {
        matchReason = 'profile';
      } else if (radarBonus > 0 && matchingSkills.length === 0) {
        matchReason = 'radar';
      }

      return {
        ...vacancy.toJSON(),
        matchScore: Math.min(100, totalScore),
        matchingSkills,
        matchReason
      };
    });

    // Сортируем по совпадению (сначала лучшие)
    vacanciesWithScore.sort((a, b) => b.matchScore - a.matchScore);

    // Фильтруем только вакансии с совпадением более 20%
    const filteredVacancies = vacanciesWithScore.filter(v => v.matchScore > 20);

    res.json(filteredVacancies);
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
