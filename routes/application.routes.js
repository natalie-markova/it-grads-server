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

    const vacancy = await Vacancy.findByPk(vacancyId);
    if (!vacancy) {
      return res.status(404).json({ error: req.t('vacancy.notFound') });
    }

    const existingApplication = await Application.findOne({
      where: { vacancyId, userId }
    });

    if (existingApplication) {
      return res.status(400).json({ error: req.t('application.alreadyApplied') });
    }

    const application = await Application.create({
      vacancyId,
      userId,
      coverLetter,
      status: 'pending'
    });

    res.status(201).json(application);
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ error: req.t('application.createError') });
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
    res.status(500).json({ error: req.t('application.fetchError') });
  }
});

// GET /api/applications/vacancy/:vacancyId - Получить отклики на вакансию (для работодателя)
router.get('/vacancy/:vacancyId', verifyToken, async (req, res) => {
  try {
    const { vacancyId } = req.params;

    const vacancy = await Vacancy.findByPk(vacancyId);
    if (!vacancy) {
      return res.status(404).json({ error: req.t('vacancy.notFound') });
    }

    if (vacancy.employerId !== req.user.id) {
      return res.status(403).json({ error: req.t('application.accessDenied') });
    }

    const applications = await Application.findAll({
      where: { vacancyId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'phone', 'avatar', 'photo'],
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

    // Нормализуем avatar для всех пользователей
    const normalizedApplications = applications.map(app => {
      const appJson = app.toJSON();
      if (appJson.user) {
        appJson.user.avatar = appJson.user.avatar || appJson.user.photo;
      }
      return appJson;
    });

    res.json(normalizedApplications);
  } catch (error) {
    console.error('Error fetching vacancy applications:', error);
    res.status(500).json({ error: req.t('application.fetchError') });
  }
});

// GET /api/applications/employer/all - Получить все отклики на вакансии работодателя
router.get('/employer/all', verifyToken, async (req, res) => {
  try {
    console.log('GET /api/applications/employer/all - User:', req.user.id, 'Role:', req.user.role);

    if (req.user.role !== 'employer') {
      console.log('Access denied - user is not employer');
      return res.status(403).json({ error: req.t('application.employerOnly') });
    }

    // Сначала получаем все вакансии работодателя (включая неактивные, так как отклики могут быть на любые)
    const employerVacancies = await Vacancy.findAll({
      where: { employerId: req.user.id },
      attributes: ['id', 'title', 'isActive']
    });

    console.log('Employer vacancies found:', employerVacancies.length);
    console.log('Vacancies details:', employerVacancies.map(v => ({ id: v.id, title: v.title, isActive: v.isActive })));
    const vacancyIds = employerVacancies.map(v => v.id);
    console.log('Vacancy IDs:', vacancyIds);

    if (vacancyIds.length === 0) {
      console.log('No vacancies found for employer, returning empty array');
      return res.json([]);
    }

    // Затем получаем все отклики на эти вакансии
    const applications = await Application.findAll({
      where: {
        vacancyId: {
          [db.Sequelize.Op.in]: vacancyIds
        }
      },
      include: [
        {
          model: Vacancy,
          as: 'vacancy',
          attributes: ['id', 'title', 'companyName', 'isActive'],
          include: [{
            model: User,
            as: 'employer',
            attributes: ['id', 'username', 'email', 'companyName', 'avatar']
          }]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'phone', 'avatar', 'photo'],
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

    console.log('Applications found:', applications.length);
    console.log('Applications details:', applications.map(app => ({
      id: app.id,
      vacancyId: app.vacancyId,
      userId: app.userId,
      status: app.status,
      vacancyTitle: app.vacancy?.title,
      userName: app.user?.username
    })));
    
    // Проверяем, что данные правильно сериализуются
    const serializedApplications = applications.map(app => ({
      id: app.id,
      vacancyId: app.vacancyId,
      userId: app.userId,
      status: app.status,
      coverLetter: app.coverLetter,
      createdAt: app.createdAt,
      vacancy: app.vacancy ? {
        id: app.vacancy.id,
        title: app.vacancy.title,
        companyName: app.vacancy.companyName,
        isActive: app.vacancy.isActive,
        employer: app.vacancy.employer
      } : null,
      user: app.user ? {
        id: app.user.id,
        username: app.user.username,
        email: app.user.email,
        phone: app.user.phone,
        avatar: app.user.avatar || app.user.photo,
        resumes: app.user.resumes
      } : null
    }));
    
    console.log('Serialized applications:', JSON.stringify(serializedApplications, null, 2));
    res.json(serializedApplications);
  } catch (error) {
    console.error('Error fetching employer applications:', error);
    res.status(500).json({ error: req.t('application.fetchError') });
  }
});

// PUT /api/applications/:id/status - Изменить статус отклика (для работодателя)
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: req.t('application.invalidStatus') });
    }

    const application = await Application.findByPk(id, {
      include: [{
        model: Vacancy,
        as: 'vacancy'
      }]
    });

    if (!application) {
      return res.status(404).json({ error: req.t('application.notFound') });
    }

    if (application.vacancy.employerId !== req.user.id) {
      return res.status(403).json({ error: req.t('application.accessDenied') });
    }

    await application.update({ status });

    res.json(application);
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: req.t('application.updateError') });
  }
});

// DELETE /api/applications/:id - Удалить отклик (для пользователя)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const application = await Application.findByPk(req.params.id);

    if (!application) {
      return res.status(404).json({ error: req.t('application.notFound') });
    }

    if (application.userId !== req.user.id) {
      return res.status(403).json({ error: req.t('application.accessDenied') });
    }

    await application.destroy();

    res.json({ message: req.t('application.deleted') });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ error: req.t('application.deleteError') });
  }
});

module.exports = router;