const express = require('express');
const router = express.Router();
const db = require('../db/models');
const { Favorite, Vacancy, User } = db;
const verifyToken = require('../middleware/verifyToken');

// POST /api/favorites - Добавить вакансию в избранное
router.post('/', verifyToken, async (req, res) => {
  try {
    const { vacancyId } = req.body;
    const userId = req.user.id;

    // Проверяем, существует ли вакансия
    const vacancy = await Vacancy.findByPk(vacancyId);
    if (!vacancy) {
      return res.status(404).json({ error: 'Вакансия не найдена' });
    }

    // Проверяем, не добавлена ли вакансия уже в избранное
    const existingFavorite = await Favorite.findOne({
      where: { vacancyId, userId }
    });

    if (existingFavorite) {
      return res.status(400).json({ error: 'Вакансия уже в избранном' });
    }

    // Добавляем в избранное
    const favorite = await Favorite.create({
      vacancyId,
      userId
    });

    res.status(201).json(favorite);
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ error: 'Ошибка при добавлении в избранное' });
  }
});

// GET /api/favorites - Получить избранные вакансии текущего пользователя
router.get('/', verifyToken, async (req, res) => {
  try {
    const favorites = await Favorite.findAll({
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

    // Возвращаем только вакансии (без обертки Favorite)
    const vacancies = favorites.map(fav => fav.vacancy);

    res.json(vacancies);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Ошибка при получении избранного' });
  }
});

// DELETE /api/favorites/:vacancyId - Удалить вакансию из избранного
router.delete('/:vacancyId', verifyToken, async (req, res) => {
  try {
    const { vacancyId } = req.params;
    const userId = req.user.id;

    const favorite = await Favorite.findOne({
      where: { vacancyId, userId }
    });

    if (!favorite) {
      return res.status(404).json({ error: 'Вакансия не найдена в избранном' });
    }

    await favorite.destroy();

    res.json({ message: 'Вакансия удалена из избранного' });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({ error: 'Ошибка при удалении из избранного' });
  }
});

// GET /api/favorites/check/:vacancyId - Проверить, в избранном ли вакансия
router.get('/check/:vacancyId', verifyToken, async (req, res) => {
  try {
    const { vacancyId } = req.params;
    const userId = req.user.id;

    const favorite = await Favorite.findOne({
      where: { vacancyId, userId }
    });

    res.json({ isFavorite: !!favorite });
  } catch (error) {
    console.error('Error checking favorite:', error);
    res.status(500).json({ error: 'Ошибка при проверке избранного' });
  }
});

module.exports = router;