const express = require('express');
const router = express.Router();
const db = require('../db/models');
const { Review, User } = db;
const verifyToken = require('../middleware/verifyToken');

// Debug: логируем все запросы к маршрутам reviews
router.use((req, res, next) => {
  console.log(`[REVIEWS ROUTER] ${req.method} ${req.path}`);
  next();
});

// Whitelist допустимых значений для сортировки
const SORT_BY_WHITELIST = ['rating', 'createdAt'];
const ORDER_WHITELIST = ['ASC', 'DESC'];

// POST /api/reviews - Создать отзыв о работодателе
router.post('/', verifyToken, async (req, res) => {
  try {
    console.log('POST /api/reviews - Request received:', { body: req.body, userId: req.user?.id });
    const { employerId, rating, comment } = req.body;
    const userId = req.user.id;

    // Проверяем, что только выпускники могут писать отзывы
    if (req.user.role !== 'graduate') {
      return res.status(403).json({ error: 'Только выпускники могут оставлять отзывы' });
    }

    // Валидация рейтинга
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
    }

    // Проверяем, существует ли работодатель
    const employer = await User.findByPk(employerId);
    if (!employer || employer.role !== 'employer') {
      return res.status(404).json({ error: 'Работодатель не найден' });
    }

    // Проверяем, не оставлял ли пользователь уже отзыв этому работодателю
    const existingReview = await Review.findOne({
      where: { employerId, userId }
    });

    if (existingReview) {
      return res.status(400).json({ error: 'Вы уже оставили отзыв этому работодателю' });
    }

    // Создаем отзыв
    const review = await Review.create({
      employerId,
      userId,
      rating,
      comment,
      employerResponse: null,
      employerResponseCreatedAt: null
    });

    // Загружаем связанные данные
    const createdReview = await Review.findByPk(review.id, {
      include: [{
        model: User,
        as: 'reviewer',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    res.status(201).json(createdReview);
  } catch (error) {
    console.error('Error creating review:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Ошибка при создании отзыва',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/companies/ratings - Получить рейтинги всех компаний
router.get('/ratings', async (req, res) => {
  try {
    // Получаем всех работодателей
    const employers = await User.findAll({
      where: { role: 'employer' },
      attributes: ['id', 'companyName', 'username'],
      order: [['createdAt', 'DESC']]
    });

    // Для каждого работодателя вычисляем средний рейтинг и количество отзывов
    const companiesWithRatings = await Promise.all(
      employers.map(async (employer) => {
        const reviews = await Review.findAll({
          where: { employerId: employer.id },
          attributes: ['rating']
        });

        const reviewCount = reviews.length;
        const averageRating = reviewCount > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
          : 0;

        return {
          id: employer.id,
          name: employer.companyName || employer.username || 'Компания',
          averageRating: Math.round(averageRating * 10) / 10,
          reviewCount: reviewCount
        };
      })
    );

    // Сортируем: сначала компании с отзывами (по рейтингу), затем без отзывов (по дате регистрации)
    const sorted = companiesWithRatings.sort((a, b) => {
      // Если у обеих компаний есть отзывы, сортируем по рейтингу
      if (a.reviewCount > 0 && b.reviewCount > 0) {
        return b.averageRating - a.averageRating;
      }
      // Компании с отзывами идут первыми
      if (a.reviewCount > 0 && b.reviewCount === 0) {
        return -1;
      }
      if (a.reviewCount === 0 && b.reviewCount > 0) {
        return 1;
      }
      // Если у обеих нет отзывов, оставляем порядок как есть (по дате регистрации)
      return 0;
    });

    res.json(sorted);
  } catch (error) {
    console.error('Error fetching company ratings:', error);
    res.status(500).json({ error: 'Ошибка при получении рейтингов компаний' });
  }
});

// GET /api/companies/:id - Получить информацию о компании
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const employerId = parseInt(id);

    if (isNaN(employerId)) {
      return res.status(400).json({ error: 'Неверный ID компании' });
    }

    const employer = await User.findOne({
      where: {
        id: employerId,
        role: 'employer'
      },
      attributes: ['id', 'companyName', 'username', 'companyDescription', 'companyWebsite', 'companyAddress', 'companySize', 'industry', 'avatar']
    });

    if (!employer) {
      return res.status(404).json({ error: 'Компания не найдена' });
    }

    res.json({
      id: employer.id,
      name: employer.companyName || employer.username || 'Компания',
      description: employer.companyDescription,
      website: employer.companyWebsite,
      address: employer.companyAddress,
      size: employer.companySize,
      industry: employer.industry,
      avatar: employer.avatar
    });
  } catch (error) {
    console.error('Error fetching company details:', error);
    res.status(500).json({ error: 'Ошибка при получении информации о компании' });
  }
});

// GET /api/reviews/employer/:employerId - Получить отзывы о работодателе с сортировкой
router.get('/employer/:employerId', async (req, res) => {
  try {
    const { employerId } = req.params;
    let { sortBy = 'createdAt', order = 'DESC' } = req.query;

    // Валидация параметров сортировки (защита от SQL инъекций)
    sortBy = SORT_BY_WHITELIST.includes(sortBy) ? sortBy : 'createdAt';
    order = ORDER_WHITELIST.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    const reviews = await Review.findAll({
      where: { employerId },
      include: [{
        model: User,
        as: 'reviewer',
        attributes: ['id', 'username', 'avatar']
      }],
      attributes: ['id', 'userId', 'rating', 'comment', 'employerResponse', 'employerResponseCreatedAt', 'createdAt', 'updatedAt'],
      order: [[sortBy, order]]
    });

    // Вычисляем средний рейтинг
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    res.json({
      reviews,
      statistics: {
        totalReviews: reviews.length,
        averageRating: Math.round(avgRating * 10) / 10
      }
    });
  } catch (error) {
    console.error('Error fetching employer reviews:', error);
    res.status(500).json({ error: 'Ошибка при получении отзывов' });
  }
});

// GET /api/reviews/my - Получить отзывы, оставленные текущим пользователем
router.get('/my', verifyToken, async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { userId: req.user.id },
      include: [{
        model: User,
        as: 'employer',
        attributes: ['id', 'username', 'companyName', 'avatar']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ error: 'Ошибка при получении отзывов' });
  }
});

// PUT /api/reviews/:id - Обновить отзыв
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // Валидация рейтинга
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
    }

    const review = await Review.findByPk(id);

    if (!review) {
      return res.status(404).json({ error: 'Отзыв не найден' });
    }

    // Проверяем, что отзыв принадлежит текущему пользователю
    if (review.userId !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    await review.update({
      rating: rating !== undefined ? rating : review.rating,
      comment: comment !== undefined ? comment : review.comment
    });

    // Загружаем обновленные данные с reviewer
    const updatedReview = await Review.findByPk(id, {
      include: [{
        model: User,
        as: 'reviewer',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    res.json(updatedReview);
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Ошибка при обновлении отзыва' });
  }
});

// DELETE /api/reviews/:id - Удалить отзыв
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id);

    if (!review) {
      return res.status(404).json({ error: 'Отзыв не найден' });
    }

    // Проверяем, что отзыв принадлежит текущему пользователю
    if (review.userId !== req.user.id) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    await review.destroy();

    res.json({ message: 'Отзыв удален' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Ошибка при удалении отзыва' });
  }
});

// POST /api/reviews/:id/response - Добавить ответ работодателя на отзыв
router.post('/:id/response', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    if (!response || !response.trim()) {
      return res.status(400).json({ error: 'Ответ не может быть пустым' });
    }

    // Проверяем, что пользователь является работодателем
    if (req.user.role !== 'employer') {
      return res.status(403).json({ error: 'Только работодатели могут отвечать на отзывы' });
    }

    const review = await Review.findByPk(id);

    if (!review) {
      return res.status(404).json({ error: 'Отзыв не найден' });
    }

    // Проверяем, что отзыв относится к компании текущего работодателя
    if (review.employerId !== req.user.id) {
      return res.status(403).json({ error: 'Вы можете отвечать только на отзывы о своей компании' });
    }

    // Если ответ уже существует, обновляем его (редактирование)
    // Если ответа нет, создаем новый
    const isUpdate = !!review.employerResponse;
    
    // Обновляем отзыв с ответом работодателя
    await review.update({
      employerResponse: response.trim(),
      employerResponseCreatedAt: isUpdate ? review.employerResponseCreatedAt : new Date()
    });

    // Загружаем обновленные данные с reviewer
    const updatedReview = await Review.findByPk(id, {
      include: [{
        model: User,
        as: 'reviewer',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    res.json(updatedReview);
  } catch (error) {
    console.error('Error adding employer response:', error);
    res.status(500).json({ error: 'Ошибка при добавлении ответа' });
  }
});

// PUT /api/reviews/:id/response - Редактировать ответ работодателя на отзыв
router.put('/:id/response', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    if (!response || !response.trim()) {
      return res.status(400).json({ error: 'Ответ не может быть пустым' });
    }

    // Проверяем, что пользователь является работодателем
    if (req.user.role !== 'employer') {
      return res.status(403).json({ error: 'Только работодатели могут редактировать ответы' });
    }

    const review = await Review.findByPk(id);

    if (!review) {
      return res.status(404).json({ error: 'Отзыв не найден' });
    }

    // Проверяем, что отзыв относится к компании текущего работодателя
    if (review.employerId !== req.user.id) {
      return res.status(403).json({ error: 'Вы можете редактировать только ответы на отзывы о своей компании' });
    }

    // Проверяем, что ответ существует
    if (!review.employerResponse) {
      return res.status(400).json({ error: 'Ответ на этот отзыв еще не был добавлен' });
    }

    // Обновляем ответ работодателя
    await review.update({
      employerResponse: response.trim(),
      // Обновляем дату только если это первое редактирование после создания
      employerResponseCreatedAt: review.employerResponseCreatedAt || new Date()
    });

    // Загружаем обновленные данные с reviewer
    const updatedReview = await Review.findByPk(id, {
      include: [{
        model: User,
        as: 'reviewer',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    res.json(updatedReview);
  } catch (error) {
    console.error('Error updating employer response:', error);
    res.status(500).json({ error: 'Ошибка при обновлении ответа' });
  }
});

// DELETE /api/reviews/:id/response - Удалить ответ работодателя на отзыв
router.delete('/:id/response', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Проверяем, что пользователь является работодателем
    if (req.user.role !== 'employer') {
      return res.status(403).json({ error: 'Только работодатели могут удалять ответы' });
    }

    const review = await Review.findByPk(id);

    if (!review) {
      return res.status(404).json({ error: 'Отзыв не найден' });
    }

    // Проверяем, что отзыв относится к компании текущего работодателя
    if (review.employerId !== req.user.id) {
      return res.status(403).json({ error: 'Вы можете удалять только ответы на отзывы о своей компании' });
    }

    // Проверяем, что ответ существует
    if (!review.employerResponse) {
      return res.status(400).json({ error: 'Ответ на этот отзыв не существует' });
    }

    // Удаляем ответ работодателя
    await review.update({
      employerResponse: null,
      employerResponseCreatedAt: null
    });

    // Загружаем обновленные данные с reviewer
    const updatedReview = await Review.findByPk(id, {
      include: [{
        model: User,
        as: 'reviewer',
        attributes: ['id', 'username', 'avatar']
      }]
    });

    res.json(updatedReview);
  } catch (error) {
    console.error('Error deleting employer response:', error);
    res.status(500).json({ error: 'Ошибка при удалении ответа' });
  }
});

module.exports = router;