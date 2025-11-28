const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require('../db/models');
const { Resume, User } = db;

// Middleware для проверки авторизации
const verifyToken = require('../middleware/verifyToken');

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
    res.status(500).json({ message: 'Ошибка при получении резюме' });
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
      return res.status(404).json({ message: 'Резюме не найдено' });
    }

    res.json(resume);
  } catch (error) {
    console.error('Error fetching resume:', error);
    res.status(500).json({ message: 'Ошибка при получении резюме' });
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
    res.status(500).json({ message: 'Ошибка при получении резюме пользователя' });
  }
});

// POST /api/resumes - Создать новое резюме
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, skills, skillsArray, experience, education, portfolio, desiredSalary, location, level } = req.body;

    const resume = await Resume.create({
      userId: req.user.id,
      title,
      description,
      skills,
      skillsArray: skillsArray || [],
      experience,
      education,
      portfolio,
      desiredSalary,
      location,
      level: level || 'junior',
      isActive: true
    });

    res.status(201).json(resume);
  } catch (error) {
    console.error('Error creating resume:', error);
    res.status(500).json({ message: 'Ошибка при создании резюме' });
  }
});

// PUT /api/resumes/:id - Обновить резюме
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const resume = await Resume.findByPk(req.params.id);

    if (!resume) {
      return res.status(404).json({ message: 'Резюме не найдено' });
    }

    if (resume.userId !== req.user.id) {
      return res.status(403).json({ message: 'Нет доступа' });
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

    res.json(resume);
  } catch (error) {
    console.error('Error updating resume:', error);
    res.status(500).json({ message: 'Ошибка при обновлении резюме' });
  }
});

// DELETE /api/resumes/:id - Удалить резюме
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const resume = await Resume.findByPk(req.params.id);

    if (!resume) {
      return res.status(404).json({ message: 'Резюме не найдено' });
    }

    if (resume.userId !== req.user.id) {
      return res.status(403).json({ message: 'Нет доступа' });
    }

    await resume.destroy();
    res.json({ message: 'Резюме удалено' });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ message: 'Ошибка при удалении резюме' });
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
      return res.status(404).json({ message: 'Резюме не найдено' });
    }

    if (resume.userId !== req.user.id) {
      return res.status(403).json({ message: 'Нет доступа' });
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
      doc.text(`Телефон: ${resume.user.phone}`, { align: 'center' });
    }
    if (resume.location) {
      doc.text(`Местоположение: ${resume.location}`, { align: 'center' });
    }
    doc.moveDown(2);

    // Описание
    if (resume.description) {
      doc.fontSize(16).text('О себе', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(resume.description);
      doc.moveDown();
    }

    // Навыки
    if (resume.skills && resume.skills.length > 0) {
      doc.fontSize(16).text('Навыки', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(resume.skills.join(', '));
      doc.moveDown();
    }

    // Опыт работы
    if (resume.experience) {
      doc.fontSize(16).text('Опыт работы', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(resume.experience);
      doc.moveDown();
    }

    // Образование
    if (resume.education) {
      doc.fontSize(16).text('Образование', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(resume.education);
      doc.moveDown();
    }

    // Желаемая зарплата
    if (resume.desiredSalary) {
      doc.fontSize(16).text('Желаемая зарплата', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(`${resume.desiredSalary} руб.`);
    }

    doc.end();

    // Ждем завершения записи
    stream.on('finish', async () => {
      // Сохраняем путь к PDF в базе данных
      const pdfUrl = `/uploads/resumes/${fileName}`;
      await resume.update({ pdfUrl });

      res.json({
        message: 'PDF успешно сгенерирован',
        pdfUrl
      });
    });

    stream.on('error', (error) => {
      console.error('Error writing PDF:', error);
      res.status(500).json({ message: 'Ошибка при создании PDF' });
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Ошибка при генерации PDF' });
  }
});

// GET /api/resumes/:id/download-pdf - Скачать PDF резюме
router.get('/:id/download-pdf', async (req, res) => {
  try {
    const resume = await Resume.findByPk(req.params.id);

    if (!resume) {
      return res.status(404).json({ message: 'Резюме не найдено' });
    }

    if (!resume.pdfUrl) {
      return res.status(404).json({ message: 'PDF файл не найден' });
    }

    const filePath = path.join(__dirname, '..', resume.pdfUrl);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Файл не существует' });
    }

    res.download(filePath, `resume_${resume.id}.pdf`);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    res.status(500).json({ message: 'Ошибка при скачивании PDF' });
  }
});

module.exports = router;
