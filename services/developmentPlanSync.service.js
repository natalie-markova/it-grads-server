/**
 * Development Plan Sync Service
 *
 * Синхронизирует план развития с источниками данных:
 * - CodeBattle: решённые задачи, рейтинг, PvP победы
 * - Roadmap: прогресс по картам развития
 * - Interview: пройденные интервью
 * - SkillScore: обновлённый радар навыков
 */

const db = require('../db/models');
const skillAggregator = require('./skillAggregator.service');

class DevelopmentPlanSyncService {
  /**
   * Получить активный план пользователя
   */
  async getActivePlan(userId) {
    return await db.DevelopmentPlan.findOne({
      where: { userId, status: 'active' }
    });
  }

  /**
   * Обработчик события: пользователь решил задачу в CodeBattle
   *
   * @param {number} userId - ID пользователя
   * @param {object} session - GameSession с результатом
   * @param {object} task - GameTask которую решили
   */
  async onCodeBattleSolved(userId, session, task) {
    const plan = await this.getActivePlan(userId);
    if (!plan) return null;

    let updated = false;
    const steps = plan.steps || [];

    for (const step of steps) {
      if (step.type !== 'codebattle') continue;
      if (step.status === 'completed') continue;

      // Проверяем, подходит ли задача под фильтр шага
      if (this.matchesCodeBattleFilter(session, task, step.codebattleFilter)) {
        // Проверяем, не была ли эта задача уже засчитана
        const solvedIds = step.solvedTaskIds || [];
        if (solvedIds.includes(task.id)) continue;

        // Увеличиваем счётчик
        step.completedTasks = (step.completedTasks || 0) + 1;
        step.solvedTaskIds = [...solvedIds, task.id];

        // Если шаг был locked, разблокируем его
        if (step.status === 'locked') {
          // Проверяем, можно ли разблокировать
          const previousSteps = steps.filter(s => s.order < step.order);
          const allPreviousCompleted = previousSteps.every(s => s.status === 'completed');

          if (allPreviousCompleted || previousSteps.length === 0) {
            step.status = 'in_progress';
            step.unlockedAt = new Date();
          }
        }

        // Отмечаем начало работы
        if (!step.startedAt) {
          step.startedAt = new Date();
        }

        // Проверяем завершение шага
        if (step.completedTasks >= step.requiredTasks) {
          step.status = 'completed';
          step.completedAt = new Date();

          // Разблокируем следующий шаг
          this.unlockNextStep(steps, step);
        }

        updated = true;
      }
    }

    if (updated) {
      plan.steps = steps;
      plan.overallProgress = plan.calculateOverallProgress();
      plan.lastSyncAt = new Date();

      // Проверяем завершение всего плана
      this.checkPlanCompletion(plan);

      await plan.save();
    }

    return plan;
  }

  /**
   * Обработчик события: изменился рейтинг пользователя в CodeBattle
   *
   * @param {number} userId - ID пользователя
   * @param {object} playerRating - Обновлённый PlayerRating
   */
  async onRatingChanged(userId, playerRating) {
    const plan = await this.getActivePlan(userId);
    if (!plan) return null;

    let updated = false;
    const steps = plan.steps || [];

    for (const step of steps) {
      if (step.type !== 'codebattle') continue;
      if (step.status === 'completed') continue;
      if (!step.codebattleFilter?.targetRating) continue;

      // Проверяем достижение целевого рейтинга
      if (playerRating.rating >= step.codebattleFilter.targetRating) {
        step.status = 'completed';
        step.completedAt = new Date();

        // Разблокируем следующий шаг
        this.unlockNextStep(steps, step);

        updated = true;
      }
    }

    if (updated) {
      plan.steps = steps;
      plan.overallProgress = plan.calculateOverallProgress();
      plan.lastSyncAt = new Date();

      this.checkPlanCompletion(plan);
      await plan.save();
    }

    return plan;
  }

  /**
   * Обработчик события: обновился прогресс по Roadmap
   *
   * @param {number} userId - ID пользователя
   * @param {object} roadmapProgress - Обновлённый RoadmapProgress
   */
  async onRoadmapProgressChanged(userId, roadmapProgress) {
    const plan = await this.getActivePlan(userId);
    if (!plan) return null;

    let updated = false;
    const steps = plan.steps || [];

    for (const step of steps) {
      if (step.type !== 'roadmap') continue;
      if (step.status === 'completed') continue;
      if (step.roadmapId !== roadmapProgress.roadmapId) continue;

      // Обновляем текущий прогресс
      step.currentProgress = roadmapProgress.progress || 0;

      if (!step.startedAt && roadmapProgress.startedAt) {
        step.startedAt = roadmapProgress.startedAt;
      }

      // Проверяем завершение
      if (step.currentProgress >= step.requiredProgress) {
        step.status = 'completed';
        step.completedAt = new Date();

        // Разблокируем следующий шаг
        this.unlockNextStep(steps, step);
      } else if (step.status === 'locked') {
        // Если начали проходить - разблокируем
        const previousSteps = steps.filter(s => s.order < step.order);
        const allPreviousCompleted = previousSteps.every(s => s.status === 'completed');

        if (allPreviousCompleted || previousSteps.length === 0) {
          step.status = 'in_progress';
          step.unlockedAt = new Date();
        }
      }

      updated = true;
    }

    if (updated) {
      plan.steps = steps;
      plan.overallProgress = plan.calculateOverallProgress();
      plan.lastSyncAt = new Date();

      this.checkPlanCompletion(plan);
      await plan.save();
    }

    return plan;
  }

  /**
   * Обработчик события: завершено интервью (AI, audio или practice)
   *
   * @param {number} userId - ID пользователя
   * @param {object} interviewSession - Сессия интервью с полем type: 'ai' | 'audio' | 'practice'
   */
  async onInterviewCompleted(userId, interviewSession) {
    const plan = await this.getActivePlan(userId);
    if (!plan) return null;

    let updated = false;
    const steps = plan.steps || [];
    const interviewType = interviewSession.type || 'ai'; // ai, audio, practice
    const percentage = interviewSession.percentage || 0;

    for (const step of steps) {
      if (step.type !== 'interview') continue;
      if (step.status === 'completed') continue;

      // Проверяем, соответствует ли тип интервью требованиям шага
      const stepInterviewType = step.interviewType || 'any'; // any, ai, audio, practice
      if (stepInterviewType !== 'any' && stepInterviewType !== interviewType) {
        continue;
      }

      // Минимальный процент для засчитывания (по умолчанию 70%)
      const minPassPercentage = step.minPassPercentage || 70;

      // Для практики с вопросами - засчитываем только успешные прохождения (>=70%)
      const isSuccessful = interviewType !== 'practice' || percentage >= minPassPercentage;

      // Сохраняем информацию о прохождении по типам (все попытки)
      if (!step.sessionsByType) {
        step.sessionsByType = { ai: 0, audio: 0, practice: 0 };
      }
      step.sessionsByType[interviewType] = (step.sessionsByType[interviewType] || 0) + 1;

      if (!step.startedAt) {
        step.startedAt = new Date();
      }

      // Для практики с вопросами учитываем статистику
      if (interviewType === 'practice' && interviewSession.percentage !== undefined) {
        if (!step.practiceStats) {
          step.practiceStats = { attempts: 0, totalPercentage: 0, successfulAttempts: 0, categories: {} };
        }
        step.practiceStats.attempts++;
        step.practiceStats.totalPercentage += percentage;

        // Учитываем успешные попытки
        if (isSuccessful) {
          step.practiceStats.successfulAttempts = (step.practiceStats.successfulAttempts || 0) + 1;
        }

        // Учитываем категорию
        const category = interviewSession.category || 'unknown';
        if (!step.practiceStats.categories[category]) {
          step.practiceStats.categories[category] = { attempts: 0, bestPercentage: 0, successfulAttempts: 0 };
        }
        step.practiceStats.categories[category].attempts++;
        step.practiceStats.categories[category].bestPercentage = Math.max(
          step.practiceStats.categories[category].bestPercentage,
          percentage
        );
        if (isSuccessful) {
          step.practiceStats.categories[category].successfulAttempts =
            (step.practiceStats.categories[category].successfulAttempts || 0) + 1;
        }
      }

      // Увеличиваем счётчик только для успешных прохождений
      if (isSuccessful) {
        step.completedSessions = (step.completedSessions || 0) + 1;

        // Проверяем завершение
        if (step.completedSessions >= step.requiredSessions) {
          step.status = 'completed';
          step.completedAt = new Date();

          this.unlockNextStep(steps, step);
        }
      }

      // Разблокируем шаг если все предыдущие завершены
      if (step.status === 'locked') {
        const previousSteps = steps.filter(s => s.order < step.order);
        const allPreviousCompleted = previousSteps.every(s => s.status === 'completed');

        if (allPreviousCompleted) {
          step.status = 'in_progress';
          step.unlockedAt = new Date();
        }
      }

      updated = true;
    }

    if (updated) {
      plan.steps = steps;
      plan.overallProgress = plan.calculateOverallProgress();
      plan.lastSyncAt = new Date();

      this.checkPlanCompletion(plan);
      await plan.save();
    }

    return plan;
  }

  /**
   * Синхронизация с обновлённым радаром навыков
   *
   * @param {number} userId - ID пользователя
   * @param {object} skillScore - Обновлённый SkillScore
   */
  async syncWithRadar(userId, skillScore) {
    const plan = await this.getActivePlan(userId);
    if (!plan) return null;

    const currentRadar = skillScore.calculatedRadar || {};
    const targetSkills = plan.targetSkills || {};

    // Обновляем прогресс по каждому навыку
    const skillProgress = {};
    for (const [skill, targetValue] of Object.entries(targetSkills)) {
      const currentValue = currentRadar[skill] || 0;
      skillProgress[skill] = Math.min(100, Math.round((currentValue / targetValue) * 100));
    }
    plan.skillProgress = skillProgress;

    // Проверяем автозавершение шагов по достижению целевого навыка
    let updated = false;
    const steps = plan.steps || [];

    for (const step of steps) {
      if (step.status === 'completed') continue;
      if (!step.targetSkill || !step.targetValue) continue;

      const currentValue = currentRadar[step.targetSkill] || 0;

      if (currentValue >= step.targetValue) {
        step.status = 'completed';
        step.completedAt = new Date();

        this.unlockNextStep(steps, step);
        updated = true;
      }
    }

    if (updated) {
      plan.steps = steps;
    }

    plan.overallProgress = plan.calculateOverallProgress();
    plan.lastSyncAt = new Date();

    this.checkPlanCompletion(plan);
    await plan.save();

    return plan;
  }

  /**
   * Полная синхронизация плана со всеми источниками
   */
  async fullSync(userId) {
    const plan = await this.getActivePlan(userId);
    if (!plan) return null;

    // Получаем актуальный радар
    const skillScore = await skillAggregator.getOrRecalculate(userId, true);

    // Синхронизируем с радаром
    await this.syncWithRadar(userId, skillScore);

    // Получаем прогресс по roadmaps
    const roadmapProgress = await db.RoadmapProgress.findAll({
      where: { userId }
    });

    // Обновляем шаги roadmap
    const steps = plan.steps || [];
    for (const step of steps) {
      if (step.type === 'roadmap' && step.roadmapId) {
        const rp = roadmapProgress.find(p => p.roadmapId === step.roadmapId);
        if (rp) {
          step.currentProgress = rp.progress || 0;

          if (rp.progress >= step.requiredProgress && step.status !== 'completed') {
            step.status = 'completed';
            step.completedAt = new Date();
            this.unlockNextStep(steps, step);
          }
        }
      }
    }

    // Получаем статистику CodeBattle
    const codebattleData = skillScore.codebattle || {};

    // Обновляем шаги с требованиями по рейтингу
    for (const step of steps) {
      if (step.type === 'codebattle' && step.codebattleFilter?.targetRating) {
        if (codebattleData.rating >= step.codebattleFilter.targetRating && step.status !== 'completed') {
          step.status = 'completed';
          step.completedAt = new Date();
          this.unlockNextStep(steps, step);
        }
      }
    }

    plan.steps = steps;
    plan.overallProgress = plan.calculateOverallProgress();
    plan.lastSyncAt = new Date();

    this.checkPlanCompletion(plan);
    await plan.save();

    return plan;
  }

  /**
   * Проверить соответствие задачи фильтру шага CodeBattle
   */
  matchesCodeBattleFilter(session, task, filter) {
    if (!filter) return true;

    // Проверка категорий
    if (filter.categories && filter.categories.length > 0) {
      if (!filter.categories.includes(task.category)) {
        return false;
      }
    }

    // Проверка сложности
    if (filter.difficulties && filter.difficulties.length > 0) {
      if (!filter.difficulties.includes(task.difficulty)) {
        return false;
      }
    }

    // Проверка языка
    if (filter.languages && filter.languages.length > 0) {
      if (!filter.languages.includes(session.language)) {
        return false;
      }
    }

    // Проверка режима (solo, vs_ai, pvp)
    if (filter.mode) {
      if (filter.mode === 'pvp') {
        // PvP матчи обрабатываются отдельно через onRatingChanged
        return false;
      }
      if (session.mode !== filter.mode) {
        return false;
      }
    }

    return true;
  }

  /**
   * Разблокировать следующий шаг после завершения текущего
   */
  unlockNextStep(steps, completedStep) {
    // Находим следующий locked шаг
    const nextStep = steps.find(s =>
      s.order > completedStep.order && s.status === 'locked'
    );

    if (nextStep) {
      // Проверяем, что все предыдущие шаги завершены
      const previousSteps = steps.filter(s => s.order < nextStep.order);
      const allCompleted = previousSteps.every(s => s.status === 'completed');

      if (allCompleted) {
        nextStep.status = 'in_progress';
        nextStep.unlockedAt = new Date();
      }
    }
  }

  /**
   * Проверить завершение всего плана
   */
  checkPlanCompletion(plan) {
    const steps = plan.steps || [];

    if (steps.length === 0) return;

    const allCompleted = steps.every(s => s.status === 'completed');

    if (allCompleted && plan.status === 'active') {
      plan.status = 'completed';
      plan.completedAt = new Date();
      plan.overallProgress = 100;
    }
  }

  /**
   * Получить рекомендуемые задачи CodeBattle для текущего шага плана
   */
  async getRecommendedTasks(userId, limit = 10) {
    const plan = await this.getActivePlan(userId);
    if (!plan) return [];

    // Находим текущий активный шаг CodeBattle
    const currentStep = plan.steps?.find(s =>
      s.type === 'codebattle' &&
      s.status === 'in_progress'
    );

    if (!currentStep || !currentStep.codebattleFilter) {
      return [];
    }

    const filter = currentStep.codebattleFilter;
    const where = { isActive: true };

    // Применяем фильтры
    if (filter.categories && filter.categories.length > 0) {
      where.category = filter.categories;
    }

    if (filter.difficulties && filter.difficulties.length > 0) {
      where.difficulty = filter.difficulties;
    }

    // Исключаем уже решённые задачи
    const solvedIds = currentStep.solvedTaskIds || [];
    if (solvedIds.length > 0) {
      where.id = { [db.Sequelize.Op.notIn]: solvedIds };
    }

    const tasks = await db.GameTask.findAll({
      where,
      order: [['solvedCount', 'DESC']],
      limit
    });

    return tasks.map(task => ({
      ...task.toJSON(),
      isInPlan: true,
      stepTitle: currentStep.title,
      stepProgress: `${currentStep.completedTasks}/${currentStep.requiredTasks}`
    }));
  }

  /**
   * Получить статус плана с детальной информацией
   */
  async getPlanStatus(userId) {
    const plan = await this.getActivePlan(userId);
    if (!plan) {
      return {
        hasPlan: false,
        plan: null
      };
    }

    const currentStep = plan.getCurrentStep();
    const nextStep = plan.getNextLockedStep();
    const stepsStats = plan.getStepsStats();

    // Получаем актуальный радар для сравнения
    const skillScore = await skillAggregator.getOrRecalculate(userId);
    const currentRadar = skillScore?.calculatedRadar || {};

    // Рассчитываем GAP
    const gaps = plan.getSkillGaps(currentRadar);

    return {
      hasPlan: true,
      plan: {
        id: plan.id,
        targetPosition: plan.targetPosition,
        targetPositionTitle: plan.targetPositionTitle,
        targetPositionIcon: plan.targetPositionIcon,
        targetPositionLevel: plan.targetPositionLevel,
        overallProgress: plan.overallProgress,
        status: plan.status,
        estimatedWeeks: plan.estimatedWeeks,
        createdAt: plan.createdAt,
        lastSyncAt: plan.lastSyncAt
      },
      currentStep,
      nextStep,
      stepsStats,
      skillProgress: plan.skillProgress,
      gaps,
      steps: plan.steps
    };
  }
}

module.exports = new DevelopmentPlanSyncService();
