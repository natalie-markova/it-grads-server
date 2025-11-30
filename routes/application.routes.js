const express = require('express');
const router = express.Router();
const db = require('../db/models');
const { Application, Vacancy, User, Resume } = db;
const verifyToken = require('../middleware/verifyToken');

// POST /api/applications - Создать отклик на вакансию
router.post('/', verifyToken, async (req, res) => {
  try {
    const { vacancyId, coverLetter } = req.body;
    const userId = req.user.id;

    // Проверяем, существует ли вакансия
    const vacancy = await Vacancy.findByPk(vacancyId);
    if (!vacancy) {
      return res.status(404).json({ error: 'Вакансия не найдена' });
    }

    // Проверяем, не откликался ли пользователь уже на эту вакансию
    const existingApplication = await Application.findOne({
      where: { vacancyId, userId }
    });

    if (existingApplication) {
      return res.status(400).json({ error: 'Вы уже откликнулись на эту вакансию' });
    }

    // Создаем отклик
    const application = await Application.create({
      vacancyId,
      userId,
      coverLetter,
      status: 'pending'
    });

    res.status(201).json(application);
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ error: 'Ошибка при создании отклика' });
  }
});

// GET /api/applications/my - Получить отклики текущего пользователя
router.get('/my', verifyToken, async (req, res) => {
  try {
    const applications = await Application.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Vacancy,
          as: 'vacancy',
          include: [{
            model: User,
            as: 'employer',
            attributes: ['id', 'username', 'email', 'companyName', 'avatar']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(applications);
  } catch (error) {
    console.error('Error fetching user applications:', error);
    res.status(500).json({ error: 'Ошибка при получении откликов' });
  }
});

// GET /api/applications/vacancy/:vacancyId - Получить отклики на вакансию (для работодателя)
router.get('/vacancy/:vacancyId', verifyToken, async (req, res) => {
  try {
    const { vacancyId } = req.params;

    // Проверяем, что вакансия принадлежит текущему пользователю
    const vacancy = await Vacancy.findByPk(vacancyId);
    if (!vacancy) {
      return res.status(404).json({ error: 'Вакансия не найдена' });
    }

    if (vacancy.employerId !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    const applications = await Application.findAll({
      where: { vacancyId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'phone', 'avatar'],
          include: [{
            model: Resume,
            as: 'resumes',
            limit: 1,
            order: [['updatedAt', 'DESC']]
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(applications);
  } catch (error) {
    console.error('Error fetching vacancy applications:', error);
    res.status(500).json({ error: 'Ошибка при получении откликов' });
  }
});

// GET /api/applications/employer/all - Получить все отклики на вакансии работодателя
router.get('/employer/all', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'employer') {
      return res.status(403).json({ error: 'Доступно только работодателям' });
    }

    const applications = await Application.findAll({
      include: [
        {
          model: Vacancy,
          as: 'vacancy',
          where: { employerId: req.user.id },
          attributes: ['id', 'title', 'companyName']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'phone', 'avatar'],
          include: [{
            model: Resume,
            as: 'resumes',
            limit: 1,
            order: [['updatedAt', 'DESC']]
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(applications);
  } catch (error) {
    console.error('Error fetching employer applications:', error);
    res.status(500).json({ error: 'Ошибка при получении откликов' });
  }
});

// PUT /api/applications/:id/status - Изменить статус отклика (для работодателя)
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Неверный статус' });
    }

    const application = await Application.findByPk(id, {
      include: [{
        model: Vacancy,
        as: 'vacancy'
      }]
    });

    if (!application) {
      return res.status(404).json({ error: 'Отклик не найден' });
    }

    // Проверяем, что вакансия принадлежит текущему пользователю
    if (application.vacancy.employerId !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    await application.update({ status });

    res.json(application);
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Ошибка при обновлении статуса отклика' });
  }
});

// DELETE /api/applications/:id - Удалить отклик (для пользователя)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const application = await Application.findByPk(req.params.id);

    if (!application) {
      return res.status(404).json({ error: 'Отклик не найден' });
    }

    // Проверяем, что отклик принадлежит текущему пользователю
    if (application.userId !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    await application.destroy();

    res.json({ message: 'Отклик удален' });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ error: 'Ошибка при удалении отклика' });
  }
});

module.exports = router;