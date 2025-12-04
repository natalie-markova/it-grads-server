const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require('../db/models');
const { Resume, User } = db;

// Middleware для проверки авторизации
const verifyToken = require('../middleware/verifyToken');
const skillAggregator = require('../services/skillAggregator.service');
const { i18nMiddleware } = require('../config/i18n');

// Apply i18n middleware to all routes
router.use(i18nMiddleware);

// GET /api/resumes - Получить все активные резюме
router.get('/', async (req, res) => {
  try {
    const { skills, location, minSalary, maxSalary, level, search } = req.query;

    const where = { isActive: true };

    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      where.skillsArray = {
        [db.Sequelize.Op.overlap]: skillsArray
      };
    }

    if (location) {
      where.location = { [db.Sequelize.Op.iLike]: `%${location}%` };
    }

    if (minSalary) {
      where.desiredSalary = { [db.Sequelize.Op.gte]: parseInt(minSalary) };
    }

    if (maxSalary) {
      where.desiredSalary = {
        ...(where.desiredSalary || {}),
        [db.Sequelize.Op.lte]: parseInt(maxSalary)
      };
    }

    if (level) {
      where.level = level;
    }

    if (search) {
      where[db.Sequelize.Op.or] = [
        { title: { [db.Sequelize.Op.iLike]: `%${search}%` } },
        { description: { [db.Sequelize.Op.iLike]: `%${search}%` } },
        { skills: { [db.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }

    const resumes = await Resume.findAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'avatar']
      }],
      order: [['updatedAt', 'DESC']]
    });

    res.json(resumes);
  } catch (error) {
    console.error('Error fetching resumes:', error);
    res.status(500).json({ message: req.t('resume.fetchError') });
  }
});

// GET /api/resumes/:id - Получить конкретное резюме
router.get('/:id', async (req, res) => {
  try {
    const resume = await Resume.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'avatar', 'phone']
      }]
    });

    if (!resume) {
      return res.status(404).json({ message: req.t('resume.notFound') });
    }

    res.json(resume);
  } catch (error) {
    console.error('Error fetching resume:', error);
    res.status(500).json({ message: req.t('resume.fetchError') });
  }
});

// GET /api/resumes/user/:userId - Получить резюме пользователя
router.get('/user/:userId', async (req, res) => {
  try {
    const resumes = await Resume.findAll({
      where: { userId: req.params.userId },
      order: [['updatedAt', 'DESC']]
    });

    res.json(resumes);
  } catch (error) {
    console.error('Error fetching user resumes:', error);
    res.status(500).json({ message: req.t('resume.fetchError') });
  }
});

// POST /api/resumes - Создать новое резюме
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, skills, skillsArray, experience, education, portfolio, desiredSalary, location, level } = req.body;

    // Обработка skills - может быть строкой JSON или массивом
    let processedSkills = [];
    if (skillsArray && Array.isArray(skillsArray)) {
      processedSkills = skillsArray;
    } else if (skills) {
      try {
        processedSkills = typeof skills === 'string' ? JSON.parse(skills) : skills;
      } catch (e) {
        processedSkills = Array.isArray(skills) ? skills : [];
      }
    }

    const resume = await Resume.create({
      userId: req.user.id,
      title: title || null,
      description: description || null,
      skills: processedSkills.length > 0 ? processedSkills : [],
      skillsArray: processedSkills,
      experience: experience || null,
      education: education || null,
      portfolio: portfolio || null,
      desiredSalary: desiredSalary || null,
      location: location || null,
      level: level || 'junior',
      isActive: true
    });

    // Триггерим пересчёт радара навыков (асинхронно)
    skillAggregator.triggerRecalculation(req.user.id, 'resume');

    res.status(201).json(resume);
  } catch (error) {
    console.error('Error creating resume:', error);
    res.status(500).json({ message: req.t('resume.createError'), error: error.message });
  }
});

// PUT /api/resumes/:id - Обновить резюме
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const resume = await Resume.findByPk(req.params.id);

    if (!resume) {
      return res.status(404).json({ message: req.t('resume.notFound') });
    }

    if (resume.userId !== req.user.id) {
      return res.status(403).json({ message: req.t('resume.accessDenied') });
    }

    const { title, description, skills, skillsArray, experience, education, portfolio, desiredSalary, location, level, isActive, radarImage } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (skills !== undefined) updateData.skills = skills;
    if (skillsArray !== undefined) updateData.skillsArray = skillsArray;
    if (experience !== undefined) updateData.experience = experience;
    if (education !== undefined) updateData.education = education;
    if (portfolio !== undefined) updateData.portfolio = portfolio;
    if (desiredSalary !== undefined) updateData.desiredSalary = desiredSalary;
    if (location !== undefined) updateData.location = location;
    if (level !== undefined) updateData.level = level;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (radarImage !== undefined) updateData.radarImage = radarImage;

    await resume.update(updateData);

    // Триггерим пересчёт радара навыков (асинхронно)
    skillAggregator.triggerRecalculation(req.user.id, 'resume');

    res.json(resume);
  } catch (error) {
    console.error('Error updating resume:', error);
    res.status(500).json({ message: req.t('resume.updateError') });
  }
});

// DELETE /api/resumes/:id - Удалить резюме
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const resume = await Resume.findByPk(req.params.id);

    if (!resume) {
      return res.status(404).json({ message: req.t('resume.notFound') });
    }

    if (resume.userId !== req.user.id) {
      return res.status(403).json({ message: req.t('resume.accessDenied') });
    }

    await resume.destroy();
    res.json({ message: req.t('resume.deleted') });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ message: req.t('resume.deleteError') });
  }
});

// POST /api/resumes/:id/generate-pdf - Генерация PDF резюме
router.post('/:id/generate-pdf', verifyToken, async (req, res) => {
  try {
    const resume = await Resume.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['username', 'email', 'phone']
      }]
    });

    if (!resume) {
      return res.status(404).json({ message: req.t('resume.notFound') });
    }

    if (resume.userId !== req.user.id) {
      return res.status(403).json({ message: req.t('resume.accessDenied') });
    }

    // Создаем директорию для PDF если её нет
    const uploadsDir = path.join(__dirname, '../uploads/resumes');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Генерируем имя файла
    const fileName = `resume_${resume.id}_${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    // Создаем PDF документ
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Заголовок
    doc.fontSize(24).text(resume.title, { align: 'center' });
    doc.moveDown();

    // Контактная информация
    doc.fontSize(12).text(`${resume.user.username}`, { align: 'center' });
    doc.text(`Email: ${resume.user.email}`, { align: 'center' });
    if (resume.user.phone) {
      doc.text(`${req.lang === 'ru' ? 'Телефон' : 'Phone'}: ${resume.user.phone}`, { align: 'center' });
    }
    if (resume.location) {
      doc.text(`${req.lang === 'ru' ? 'Местоположение' : 'Location'}: ${resume.location}`, { align: 'center' });
    }
    doc.moveDown(2);

    // Описание
    if (resume.description) {
      doc.fontSize(16).text(req.lang === 'ru' ? 'О себе' : 'About', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(resume.description);
      doc.moveDown();
    }

    // Навыки
    if (resume.skills && resume.skills.length > 0) {
      doc.fontSize(16).text(req.lang === 'ru' ? 'Навыки' : 'Skills', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(resume.skills.join(', '));
      doc.moveDown();
    }

    // Опыт работы
    if (resume.experience) {
      doc.fontSize(16).text(req.lang === 'ru' ? 'Опыт работы' : 'Experience', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(resume.experience);
      doc.moveDown();
    }

    // Образование
    if (resume.education) {
      doc.fontSize(16).text(req.lang === 'ru' ? 'Образование' : 'Education', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(resume.education);
      doc.moveDown();
    }

    // Желаемая зарплата
    if (resume.desiredSalary) {
      doc.fontSize(16).text(req.lang === 'ru' ? 'Желаемая зарплата' : 'Desired Salary', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(`${resume.desiredSalary} ${req.lang === 'ru' ? 'руб.' : 'RUB'}`);
    }

    doc.end();

    // Ждем завершения записи
    stream.on('finish', async () => {
      // Сохраняем путь к PDF в базе данных
      const pdfUrl = `/uploads/resumes/${fileName}`;
      await resume.update({ pdfUrl });

      res.json({
        message: req.t('resume.pdfGenerated'),
        pdfUrl
      });
    });

    stream.on('error', (error) => {
      console.error('Error writing PDF:', error);
      res.status(500).json({ message: req.t('resume.pdfCreateError') });
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: req.t('resume.pdfGenerateError') });
  }
});

// GET /api/resumes/:id/download-pdf - Скачать PDF резюме
router.get('/:id/download-pdf', async (req, res) => {
  try {
    const resume = await Resume.findByPk(req.params.id);

    if (!resume) {
      return res.status(404).json({ message: req.t('resume.notFound') });
    }

    if (!resume.pdfUrl) {
      return res.status(404).json({ message: req.t('resume.pdfNotFound') });
    }

    const filePath = path.join(__dirname, '..', resume.pdfUrl);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: req.t('resume.fileNotExists') });
    }

    res.download(filePath, `resume_${resume.id}.pdf`);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    res.status(500).json({ message: req.t('resume.pdfDownloadError') });
  }
});

module.exports = router;
