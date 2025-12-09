const express = require('express');
const router = express.Router();
const db = require('../db/models');
const verifyToken = require('../middleware/verifyToken');
const planGenerator = require('../services/planGenerator.service');
const planSync = require('../services/developmentPlanSync.service');
const {
  getAllPositions,
  getPositionsByCategory,
  getPositionsByLevel,
  getPositionRequirements,
  getRecommendedPositions,
  getPositionGap,
  calculatePositionMatch,
  POSITION_CATEGORIES,
  POSITION_LEVELS
} = require('../config/positionRequirements');
const skillAggregator = require('../services/skillAggregator.service');

// ============================================
// ПОЗИЦИИ (публичные)
// ============================================

/**
 * GET /api/development-plan/positions
 * Получить все доступные позиции
 */
router.get('/positions', async (req, res) => {
  try {
    const { category, level, lang = 'ru' } = req.query;

    let positions = getAllPositions();

    if (category) {
      positions = positions.filter(p => p.category === category);
    }

    if (level) {
      positions = positions.filter(p => p.level === level);
    }

    // Локализация
    const localizedPositions = positions.map(pos => ({
      id: pos.id,
      title: lang === 'en' ? pos.titleEn : pos.title,
      icon: pos.icon,
      level: pos.level,
      category: pos.category,
      skills: pos.skills,
      requiredRoadmaps: pos.requiredRoadmaps,
      codebattle: pos.codebattle,
      relatedPositions: pos.relatedPositions
    }));

    res.json({
      positions: localizedPositions,
      categories: POSITION_CATEGORIES,
      levels: POSITION_LEVELS
    });
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Ошибка получения позиций' });
  }
});

/**
 * GET /api/development-plan/positions/recommended
 * Получить рекомендуемые позиции на основе текущего профиля
 * ВАЖНО: этот маршрут должен быть ПЕРЕД /positions/:id
 */
router.get('/positions/recommended', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 6, lang = 'ru' } = req.query;

    // Получаем текущий радар
    const skillScore = await skillAggregator.getOrRecalculate(userId);
    const currentRadar = skillScore?.calculatedRadar || {};

    // Получаем рекомендации
    const recommended = getRecommendedPositions(currentRadar, parseInt(limit));

    const localizedPositions = recommended.map(pos => ({
      id: pos.id,
      title: lang === 'en' ? pos.titleEn : pos.title,
      icon: pos.icon,
      level: pos.level,
      category: pos.category,
      matchScore: pos.matchScore
    }));

    res.json({ positions: localizedPositions });
  } catch (error) {
    console.error('Error fetching recommended positions:', error);
    res.status(500).json({ error: 'Ошибка получения рекомендаций' });
  }
});

/**
 * GET /api/development-plan/positions/:id
 * Получить детали позиции
 */
router.get('/positions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { lang = 'ru' } = req.query;

    const position = getPositionRequirements(id);

    if (!position) {
      return res.status(404).json({ error: 'Позиция не найдена' });
    }

    res.json({
      id,
      title: lang === 'en' ? position.titleEn : position.title,
      icon: position.icon,
      level: position.level,
      category: position.category,
      skills: position.skills,
      requiredRoadmaps: position.requiredRoadmaps,
      codebattle: position.codebattle,
      relatedPositions: position.relatedPositions
    });
  } catch (error) {
    console.error('Error fetching position:', error);
    res.status(500).json({ error: 'Ошибка получения позиции' });
  }
});

/**
 * GET /api/development-plan/positions/:id/gap
 * Получить GAP анализ между текущим профилем и позицией
 */
router.get('/positions/:id/gap', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { lang = 'ru' } = req.query;

    const position = getPositionRequirements(id);
    if (!position) {
      return res.status(404).json({ error: 'Позиция не найдена' });
    }

    // Получаем текущий радар
    const skillScore = await skillAggregator.getOrRecalculate(userId);
    const currentRadar = skillScore?.calculatedRadar || {};

    // Рассчитываем GAP
    const gapAnalysis = getPositionGap(currentRadar, id);
    const matchScore = calculatePositionMatch(currentRadar, id);

    // Получаем прогресс по roadmaps
    const roadmapProgress = await db.RoadmapProgress.findAll({
      where: { userId },
      include: [{ model: db.Roadmap, as: 'roadmap' }]
    });

    const roadmapsStatus = (position.requiredRoadmaps || []).map(slug => {
      const rp = roadmapProgress.find(p => p.roadmap?.slug === slug);
      return {
        slug,
        title: rp?.roadmap?.title || slug,
        progress: rp?.progress || 0,
        status: rp?.progress >= 100 ? 'completed' : rp?.progress > 0 ? 'in_progress' : 'not_started'
      };
    });

    // Получаем статистику CodeBattle
    const codebattleData = skillScore?.codebattle || {};

    res.json({
      position: {
        id,
        title: lang === 'en' ? position.titleEn : position.title,
        icon: position.icon,
        level: position.level
      },
      matchScore,
      gaps: gapAnalysis.gaps,
      totalGap: gapAnalysis.totalGap,
      avgGap: gapAnalysis.avgGap,
      isReached: gapAnalysis.isReached,
      roadmaps: roadmapsStatus,
      codebattle: {
        currentRating: codebattleData.rating || 1000,
        requiredRating: position.codebattle?.minRating || 1000,
        currentSolved: codebattleData.totalSolved || 0,
        requiredSolved: position.codebattle?.minSolved || 0,
        ratingReached: (codebattleData.rating || 1000) >= (position.codebattle?.minRating || 1000),
        solvedReached: (codebattleData.totalSolved || 0) >= (position.codebattle?.minSolved || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching position gap:', error);
    res.status(500).json({ error: 'Ошибка анализа GAP' });
  }
});

// ============================================
// ПЛАН РАЗВИТИЯ (требуют авторизации)
// ============================================

/**
 * POST /api/development-plan
 * Создать план развития
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetPosition } = req.body;

    if (!targetPosition) {
      return res.status(400).json({ error: 'Укажите целевую позицию' });
    }

    const position = getPositionRequirements(targetPosition);
    if (!position) {
      return res.status(404).json({ error: 'Позиция не найдена' });
    }

    // Генерируем план
    const plan = await planGenerator.generatePlan(userId, targetPosition);

    res.status(201).json({
      message: 'План развития создан',
      plan: {
        id: plan.id,
        targetPosition: plan.targetPosition,
        targetPositionTitle: plan.targetPositionTitle,
        targetPositionIcon: plan.targetPositionIcon,
        targetPositionLevel: plan.targetPositionLevel,
        overallProgress: plan.overallProgress,
        estimatedWeeks: plan.estimatedWeeks,
        matchScore: plan.matchScore,
        steps: plan.steps,
        skillProgress: plan.skillProgress,
        status: plan.status
      }
    });
  } catch (error) {
    console.error('Error creating development plan:', error);
    res.status(500).json({ error: error.message || 'Ошибка создания плана' });
  }
});

/**
 * GET /api/development-plan/active
 * Получить активный план пользователя
 * Автоматически синхронизирует план с текущими данными
 */
router.get('/active', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { lang = 'ru', sync = 'true' } = req.query;
    const isEn = lang === 'en';

    // Если sync=true (по умолчанию), сначала синхронизируем план
    if (sync === 'true') {
      try {
        await planSync.fullSync(userId);
      } catch (syncError) {
        console.error('Error during auto-sync:', syncError);
        // Продолжаем даже если синхронизация не удалась
      }
    }

    const status = await planSync.getPlanStatus(userId);

    if (!status.hasPlan) {
      return res.json({ hasPlan: false });
    }

    // Локализуем шаги
    if (status.steps) {
      status.steps = status.steps.map(step => ({
        ...step,
        title: isEn && step.titleEn ? step.titleEn : step.title,
        description: isEn && step.descriptionEn ? step.descriptionEn : step.description
      }));
    }

    // Локализуем currentStep
    if (status.currentStep) {
      status.currentStep = {
        ...status.currentStep,
        title: isEn && status.currentStep.titleEn ? status.currentStep.titleEn : status.currentStep.title,
        description: isEn && status.currentStep.descriptionEn ? status.currentStep.descriptionEn : status.currentStep.description
      };
    }

    // Локализуем nextStep
    if (status.nextStep) {
      status.nextStep = {
        ...status.nextStep,
        title: isEn && status.nextStep.titleEn ? status.nextStep.titleEn : status.nextStep.title,
        description: isEn && status.nextStep.descriptionEn ? status.nextStep.descriptionEn : status.nextStep.description
      };
    }

    // Локализуем targetPositionTitle
    if (status.plan && isEn) {
      const plan = await planSync.getActivePlan(userId);
      if (plan && plan.targetPositionTitleEn) {
        status.plan.targetPositionTitle = plan.targetPositionTitleEn;
      }
    }

    res.json(status);
  } catch (error) {
    console.error('Error fetching active plan:', error);
    res.status(500).json({ error: 'Ошибка получения плана' });
  }
});

/**
 * POST /api/development-plan/sync
 * Синхронизировать план с источниками данных
 */
router.post('/sync', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const plan = await planSync.fullSync(userId);

    if (!plan) {
      return res.status(404).json({ error: 'Активный план не найден' });
    }

    const status = await planSync.getPlanStatus(userId);

    res.json({
      message: 'План синхронизирован',
      ...status
    });
  } catch (error) {
    console.error('Error syncing plan:', error);
    res.status(500).json({ error: 'Ошибка синхронизации' });
  }
});

/**
 * POST /api/development-plan/fix-unlock
 * Принудительно разблокировать следующий шаг (для исправления багов)
 */
router.post('/fix-unlock', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const plan = await planSync.getActivePlan(userId);
    if (!plan) {
      return res.status(404).json({ error: 'Активный план не найден' });
    }

    const steps = plan.steps || [];
    let modified = false;

    console.log('[FixUnlock] Current state:', {
      steps: steps.map(s => ({ title: s.title, status: s.status, order: s.order }))
    });

    // Сначала проверяем roadmap шаги - отмечаем завершёнными если прогресс 100%
    const roadmapProgress = await db.RoadmapProgress.findAll({ where: { userId } });

    for (const step of steps) {
      if (step.type === 'roadmap' && step.status !== 'completed') {
        let rp = null;

        // Ищем прогресс по roadmapId
        if (step.roadmapId) {
          rp = roadmapProgress.find(p => parseInt(p.roadmapId, 10) === parseInt(step.roadmapId, 10));
        }

        // Или по slug
        if (!rp && step.roadmapSlug) {
          const roadmap = await db.Roadmap.findOne({ where: { slug: step.roadmapSlug } });
          if (roadmap) {
            rp = roadmapProgress.find(p => parseInt(p.roadmapId, 10) === roadmap.id);
            if (rp && !step.roadmapId) {
              step.roadmapId = roadmap.id;
            }
          }
        }

        if (rp && rp.progress >= (step.requiredProgress || 100)) {
          console.log('[FixUnlock] Marking roadmap step as completed:', step.title, 'progress:', rp.progress);
          step.status = 'completed';
          step.completedAt = new Date();
          step.currentProgress = rp.progress;
          modified = true;
        }
      }
    }

    // Теперь разблокируем следующие шаги
    for (const step of steps) {
      if (step.status === 'locked') {
        const stepOrder = parseInt(step.order, 10);
        const previousSteps = steps.filter(s => parseInt(s.order, 10) < stepOrder);
        const allPreviousCompleted = previousSteps.every(s => s.status === 'completed');

        if (allPreviousCompleted) {
          console.log('[FixUnlock] Unlocking step:', step.title);
          step.status = 'in_progress';
          step.unlockedAt = new Date();
          modified = true;
          break; // Разблокируем только первый
        }
      }
    }

    if (modified) {
      // ВАЖНО: Sequelize JSONB fix
      plan.steps = JSON.parse(JSON.stringify(steps));
      plan.changed('steps', true);
      plan.overallProgress = plan.calculateOverallProgress();
      plan.lastSyncAt = new Date();
      await plan.save();

      console.log('[FixUnlock] Saved steps:', plan.steps?.map(s => ({ title: s.title, status: s.status })));
    }

    res.json({
      message: modified ? 'План исправлен' : 'Нечего исправлять',
      steps: plan.steps?.map(s => ({
        title: s.title,
        status: s.status,
        order: s.order,
        currentProgress: s.currentProgress,
        requiredProgress: s.requiredProgress
      }))
    });
  } catch (error) {
    console.error('Error fixing unlock:', error);
    res.status(500).json({ error: 'Ошибка исправления' });
  }
});

/**
 * GET /api/development-plan/codebattle-tasks
 * Получить рекомендуемые задачи CodeBattle для текущего шага
 */
router.get('/codebattle-tasks', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const tasks = await planSync.getRecommendedTasks(userId, parseInt(limit));

    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching recommended tasks:', error);
    res.status(500).json({ error: 'Ошибка получения задач' });
  }
});

/**
 * GET /api/development-plan/history
 * Получить историю планов
 * ВАЖНО: должен быть ПЕРЕД /:id
 */
router.get('/history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: plans } = await db.DevelopmentPlan.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      plans: plans.map(p => ({
        id: p.id,
        targetPosition: p.targetPosition,
        targetPositionTitle: p.targetPositionTitle,
        targetPositionIcon: p.targetPositionIcon,
        overallProgress: p.overallProgress,
        status: p.status,
        createdAt: p.createdAt,
        completedAt: p.completedAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching plan history:', error);
    res.status(500).json({ error: 'Ошибка получения истории' });
  }
});

/**
 * GET /api/development-plan/:id
 * Получить план по ID
 * ВАЖНО: должен быть ПОСЛЕ всех специфических маршрутов (active, sync, codebattle-tasks, history)
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const plan = await db.DevelopmentPlan.findOne({
      where: { id, userId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'План не найден' });
    }

    res.json({ plan });
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ error: 'Ошибка получения плана' });
  }
});

/**
 * POST /api/development-plan/steps/:stepId/complete
 * Отметить шаг как выполненный (ручная отметка)
 */
router.post('/steps/:stepId/complete', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { stepId } = req.params;

    const plan = await planSync.getActivePlan(userId);

    if (!plan) {
      return res.status(404).json({ error: 'Активный план не найден' });
    }

    const steps = plan.steps || [];
    const stepIndex = steps.findIndex(s => s.id === stepId);

    if (stepIndex === -1) {
      return res.status(404).json({ error: 'Шаг не найден' });
    }

    const step = steps[stepIndex];

    if (step.status === 'completed') {
      return res.status(400).json({ error: 'Шаг уже завершён' });
    }

    if (step.status === 'locked') {
      return res.status(400).json({ error: 'Шаг ещё заблокирован' });
    }

    // Отмечаем как завершённый
    step.status = 'completed';
    step.completedAt = new Date().toISOString();

    // Разблокируем следующий шаг
    let nextStepData = null;

    // Сначала ищем следующий locked шаг для разблокировки
    const nextLockedStep = steps.find(s => s.order > step.order && s.status === 'locked');
    if (nextLockedStep) {
      // Проверяем, что все предыдущие шаги завершены
      const previousSteps = steps.filter(s => s.order < nextLockedStep.order);
      const allPreviousCompleted = previousSteps.every(s => s.status === 'completed');

      if (allPreviousCompleted) {
        nextLockedStep.status = 'in_progress';
        nextLockedStep.unlockedAt = new Date().toISOString();
        nextLockedStep.startedAt = new Date().toISOString();
        nextStepData = nextLockedStep;
      }
    }

    // Если не нашли locked для разблокировки, ищем уже активный (in_progress или unlocked)
    if (!nextStepData) {
      const currentActiveStep = steps.find(s =>
        s.order > step.order && (s.status === 'in_progress' || s.status === 'unlocked')
      );
      if (currentActiveStep) {
        // Если был unlocked - переводим в in_progress
        if (currentActiveStep.status === 'unlocked') {
          currentActiveStep.status = 'in_progress';
          currentActiveStep.startedAt = new Date().toISOString();
        }
        nextStepData = currentActiveStep;
      }
    }

    plan.steps = steps;
    plan.overallProgress = plan.calculateOverallProgress();
    plan.lastSyncAt = new Date();

    // Проверяем завершение плана
    const allCompleted = steps.every(s => s.status === 'completed');
    if (allCompleted) {
      plan.status = 'completed';
      plan.completedAt = new Date();
    }

    await plan.save();

    // Возвращаем полные данные для обновления UI
    res.json({
      message: 'Шаг отмечен как выполненный',
      step,
      nextStep: nextStepData,
      overallProgress: plan.overallProgress,
      planStatus: plan.status,
      steps: plan.steps // Возвращаем все шаги для полного обновления
    });
  } catch (error) {
    console.error('Error completing step:', error);
    res.status(500).json({ error: 'Ошибка завершения шага' });
  }
});

/**
 * PUT /api/development-plan/:id/pause
 * Приостановить план
 */
router.put('/:id/pause', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const plan = await db.DevelopmentPlan.findOne({
      where: { id, userId, status: 'active' }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Активный план не найден' });
    }

    plan.status = 'paused';
    plan.pausedAt = new Date();
    await plan.save();

    res.json({ message: 'План приостановлен', plan });
  } catch (error) {
    console.error('Error pausing plan:', error);
    res.status(500).json({ error: 'Ошибка приостановки плана' });
  }
});

/**
 * PUT /api/development-plan/:id/resume
 * Возобновить план
 */
router.put('/:id/resume', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const plan = await db.DevelopmentPlan.findOne({
      where: { id, userId, status: 'paused' }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Приостановленный план не найден' });
    }

    // Проверяем, нет ли другого активного плана
    const activePlan = await db.DevelopmentPlan.findOne({
      where: { userId, status: 'active' }
    });

    if (activePlan) {
      return res.status(400).json({
        error: 'У вас уже есть активный план. Сначала завершите или отмените его.'
      });
    }

    plan.status = 'active';
    plan.pausedAt = null;
    await plan.save();

    res.json({ message: 'План возобновлён', plan });
  } catch (error) {
    console.error('Error resuming plan:', error);
    res.status(500).json({ error: 'Ошибка возобновления плана' });
  }
});

/**
 * DELETE /api/development-plan/:id
 * Отменить план
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const plan = await db.DevelopmentPlan.findOne({
      where: { id, userId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'План не найден' });
    }

    if (plan.status === 'completed') {
      return res.status(400).json({ error: 'Нельзя отменить завершённый план' });
    }

    plan.status = 'abandoned';
    plan.abandonedAt = new Date();
    await plan.save();

    res.json({ message: 'План отменён' });
  } catch (error) {
    console.error('Error abandoning plan:', error);
    res.status(500).json({ error: 'Ошибка отмены плана' });
  }
});

module.exports = router;
