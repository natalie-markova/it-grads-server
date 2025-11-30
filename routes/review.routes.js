const express = require('express');
const router = express.Router();
const db = require('../db/models');
const { Review, User } = db;
const verifyToken = require('../middleware/verifyToken');

// Whitelist допустимых значений для сортировки
const SORT_BY_WHITELIST = ['rating', 'createdAt'];
const ORDER_WHITELIST = ['ASC', 'DESC'];

// POST /api/reviews - Создать отзыв о работодателе
router.post('/', verifyToken, async (req, res) => {
  try {
    const { employerId, rating, comment } = req.body;
    const userId = req.user.id;

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
      comment
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
    res.status(500).json({ error: 'Ошибка при создании отзыва' });
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

module.exports = router;