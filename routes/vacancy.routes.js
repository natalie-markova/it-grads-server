const express = require('express');
const router = express.Router();
const db = require('../db/models');
const { Vacancy, User } = db;
const verifyToken = require('../middleware/verifyToken');

// GET /api/vacancies - Получить все активные вакансии
router.get('/', async (req, res) => {
  try {
    const { location, minSalary, maxSalary, employmentType } = req.query;

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

// GET /api/vacancies/:id - Получить конкретную вакансию
router.get('/:id', async (req, res) => {
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
router.get('/employer/:employerId', async (req, res) => {
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
    res.json({ message: 'Вакансия удалена' });
  } catch (error) {
    console.error('Error deleting vacancy:', error);
    res.status(500).json({ message: 'Ошибка при удалении вакансии' });
  }
});

module.exports = router;
