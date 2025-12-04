const express = require('express');
const router = express.Router();
const { Roadmap, RoadmapProgress } = require('../db/models');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');
const verifyToken = require('../middleware/verifyToken');
const skillAggregator = require('../services/skillAggregator.service');
const { i18nMiddleware } = require('../config/i18n');

// Apply i18n middleware to all routes
router.use(i18nMiddleware);

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

    // Return localized data based on request language
    const localizedRoadmaps = roadmaps.map(r => r.getLocalized(req.lang));
    res.json(localizedRoadmaps);
  } catch (error) {
    console.error('Error fetching roadmaps:', error);
    res.status(500).json({ error: req.t('roadmap.fetchError') });
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
      return res.status(404).json({ error: req.t('roadmap.notFound') });
    }

    // Return localized data
    res.json(roadmap.getLocalized(req.lang));
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    res.status(500).json({ error: req.t('roadmap.fetchError') });
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
    res.status(500).json({ error: req.t('roadmap.fetchError') });
  }
});

// GET /api/roadmaps/progress/all - Get all user's roadmap progress
router.get('/progress/all', verifyToken, async (req, res) => {
  try {
    const progress = await RoadmapProgress.findAll({
      where: { userId: req.user.id },
      include: [{
        model: Roadmap,
        as: 'roadmap',
        attributes: ['id', 'title', 'slug', 'icon', 'color', 'difficulty', 'learningPath']
      }],
      order: [['lastActivityAt', 'DESC']]
    });

    res.json(progress);
  } catch (error) {
    console.error('Error fetching all progress:', error);
    res.status(500).json({ error: req.t('roadmap.progressError') });
  }
});

// GET /api/roadmaps/:slug/progress - Get user's progress for specific roadmap
router.get('/:slug/progress', verifyToken, async (req, res) => {
  try {
    const { slug } = req.params;

    const roadmap = await Roadmap.findOne({ where: { slug } });
    if (!roadmap) {
      return res.status(404).json({ error: req.t('roadmap.notFound') });
    }

    const progress = await RoadmapProgress.findOne({
      where: {
        userId: req.user.id,
        roadmapId: roadmap.id
      }
    });

    if (!progress) {
      return res.json({
        completedSteps: [],
        progress: 0,
        startedAt: null,
        lastActivityAt: null,
        completedAt: null
      });
    }

    res.json(progress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: req.t('roadmap.progressError') });
  }
});

// POST /api/roadmaps/:slug/progress - Save user's progress for roadmap
router.post('/:slug/progress', verifyToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const { completedSteps } = req.body;

    const roadmap = await Roadmap.findOne({ where: { slug } });
    if (!roadmap) {
      return res.status(404).json({ error: req.t('roadmap.notFound') });
    }

    const totalSteps = roadmap.learningPath?.length || 0;
    const progressPercent = totalSteps > 0
      ? Math.round((completedSteps.length / totalSteps) * 100)
      : 0;

    const now = new Date();
    const isCompleted = progressPercent === 100;

    let progress = await RoadmapProgress.findOne({
      where: {
        userId: req.user.id,
        roadmapId: roadmap.id
      }
    });

    if (progress) {
      // Update existing progress
      await progress.update({
        completedSteps,
        progress: progressPercent,
        lastActivityAt: now,
        completedAt: isCompleted && !progress.completedAt ? now : progress.completedAt
      });
    } else {
      // Create new progress
      progress = await RoadmapProgress.create({
        userId: req.user.id,
        roadmapId: roadmap.id,
        completedSteps,
        progress: progressPercent,
        startedAt: now,
        lastActivityAt: now,
        completedAt: isCompleted ? now : null
      });
    }

    // Триггерим пересчёт радара навыков (асинхронно)
    skillAggregator.triggerRecalculation(req.user.id, 'roadmap');

    res.json({
      message: req.t('roadmap.progressSaved'),
      progress: progress
    });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ error: req.t('roadmap.progressError') });
  }
});

// DELETE /api/roadmaps/:slug/progress - Reset user's progress for roadmap
router.delete('/:slug/progress', verifyToken, async (req, res) => {
  try {
    const { slug } = req.params;

    const roadmap = await Roadmap.findOne({ where: { slug } });
    if (!roadmap) {
      return res.status(404).json({ error: req.t('roadmap.notFound') });
    }

    await RoadmapProgress.destroy({
      where: {
        userId: req.user.id,
        roadmapId: roadmap.id
      }
    });

    res.json({ message: req.t('roadmap.progressReset') });
  } catch (error) {
    console.error('Error resetting progress:', error);
    res.status(500).json({ error: req.t('roadmap.progressError') });
  }
});

module.exports = router;
