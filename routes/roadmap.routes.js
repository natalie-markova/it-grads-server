const express = require('express');
const router = express.Router();
const { Roadmap } = require('../db/models');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

// GET /api/roadmaps - Get all roadmaps
router.get('/', cacheMiddleware(900), async (req, res) => {
  try {
    const { category, difficulty } = req.query;

    const where = {};
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;

    const roadmaps = await Roadmap.findAll({
      where,
      order: [
        ['popularityScore', 'DESC'],
        ['title', 'ASC']
      ]
    });

    res.json(roadmaps);
  } catch (error) {
    console.error('Error fetching roadmaps:', error);
    res.status(500).json({ error: 'Ошибка при получении карт специальностей' });
  }
});

// GET /api/roadmaps/:slug - Get single roadmap by slug
router.get('/:slug', cacheMiddleware(900), async (req, res) => {
  try {
    const { slug } = req.params;

    const roadmap = await Roadmap.findOne({
      where: { slug }
    });

    if (!roadmap) {
      return res.status(404).json({ error: 'Карта специальности не найдена' });
    }

    res.json(roadmap);
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    res.status(500).json({ error: 'Ошибка при получении карты специальности' });
  }
});

// GET /api/roadmaps/categories/list - Get all categories
router.get('/categories/list', cacheMiddleware(900), async (req, res) => {
  try {
    const categories = await Roadmap.findAll({
      attributes: ['category'],
      group: ['category']
    });

    res.json(categories.map(c => c.category));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Ошибка при получении категорий' });
  }
});

module.exports = router;
