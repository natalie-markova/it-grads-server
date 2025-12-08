/**
 * Plan Generator Service
 *
 * Генерирует персональный план развития на основе:
 * - Текущего радара навыков пользователя
 * - Целевой позиции
 * - Доступных roadmaps
 * - Задач CodeBattle
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../db/models');
const {
  POSITION_REQUIREMENTS,
  getPositionRequirements,
  getPositionGap,
  calculatePositionMatch
} = require('../config/positionRequirements');
const skillAggregator = require('./skillAggregator.service');

// Маппинг навыков к категориям CodeBattle
const SKILL_TO_CODEBATTLE_CATEGORIES = {
  algorithms: ['algorithms', 'data-structures', 'dynamic-programming', 'graphs', 'trees', 'sorting', 'searching', 'recursion'],
  programming: ['arrays', 'strings', 'math'],
  databases: ['sql', 'databases']
};

// Маппинг навыков к roadmaps
const SKILL_TO_ROADMAPS = {
  programming: ['javascript', 'typescript', 'python', 'java', 'go', 'rust'],
  ui_ux: ['react', 'vue', 'angular'],
  databases: ['postgresql', 'mongodb'],
  devops: ['docker', 'kubernetes'],
  cloud: ['aws'],
  testing: ['testing'],
  security: ['security'],
  mobile: ['react-native', 'flutter'],
  ai_ml: ['ml-engineer'],
  data_science: ['data-science']
};

class PlanGeneratorService {
  /**
   * Создать план развития для пользователя
   */
  async generatePlan(userId, targetPositionId) {
    // Получить требования позиции
    const positionReqs = getPositionRequirements(targetPositionId);
    if (!positionReqs) {
      throw new Error(`Позиция не найдена: ${targetPositionId}`);
    }

    // Получить текущий радар пользователя
    const skillScore = await skillAggregator.getOrRecalculate(userId, true);
    const currentRadar = skillScore.calculatedRadar || {};

    // Рассчитать GAP
    const gapAnalysis = getPositionGap(currentRadar, targetPositionId);

    // Рассчитать совпадение
    const matchScore = calculatePositionMatch(currentRadar, targetPositionId);

    // Получить доступные roadmaps
    const roadmaps = await db.Roadmap.findAll({
      where: { slug: positionReqs.requiredRoadmaps || [] }
    });

    // Получить прогресс пользователя по roadmaps
    const roadmapProgress = await db.RoadmapProgress.findAll({
      where: { userId }
    });
    const progressByRoadmap = {};
    roadmapProgress.forEach(rp => {
      progressByRoadmap[rp.roadmapId] = rp;
    });

    // Генерируем шаги плана
    const steps = await this.generateSteps(
      userId,
      positionReqs,
      currentRadar,
      gapAnalysis,
      roadmaps,
      progressByRoadmap,
      skillScore
    );

    // Оценка времени достижения
    const estimatedWeeks = this.estimateTimeToComplete(steps, gapAnalysis);

    // Проверяем, есть ли уже активный план
    const existingPlan = await db.DevelopmentPlan.findOne({
      where: { userId, status: 'active' }
    });

    if (existingPlan) {
      // Архивируем старый план
      existingPlan.status = 'abandoned';
      existingPlan.abandonedAt = new Date();
      await existingPlan.save();
    }

    // Создаём новый план
    const plan = await db.DevelopmentPlan.create({
      userId,
      targetPosition: targetPositionId,
      targetPositionTitle: positionReqs.title,
      targetPositionTitleEn: positionReqs.titleEn,
      targetPositionIcon: positionReqs.icon,
      targetPositionLevel: positionReqs.level,
      targetSkills: positionReqs.skills,
      initialSkills: currentRadar,
      skillProgress: this.calculateInitialSkillProgress(currentRadar, positionReqs.skills),
      steps,
      requiredRoadmaps: positionReqs.requiredRoadmaps || [],
      codebattleRequirements: positionReqs.codebattle || { minRating: 1000, minSolved: 0 },
      overallProgress: 0,
      status: 'active',
      matchScore,
      estimatedWeeks,
      lastSyncAt: new Date()
    });

    // Пересчитываем прогресс
    plan.overallProgress = plan.calculateOverallProgress();
    await plan.save();

    return plan;
  }

  /**
   * Генерация шагов плана
   * Порядок: Roadmap и CodeBattle вперемешку, тренажер в конце
   */
  async generateSteps(userId, positionReqs, currentRadar, gapAnalysis, roadmaps, progressByRoadmap, skillScore) {
    const mainSteps = []; // Roadmap и CodeBattle
    const trainerSteps = []; // Тренажер (в конце)
    let order = 1;

    // Сортируем навыки по величине GAP (сначала те, что ближе к цели)
    const sortedGaps = Object.entries(gapAnalysis.gaps)
      .filter(([_, data]) => data.gap > 0)
      .sort((a, b) => a[1].gap - b[1].gap);

    // Получаем данные CodeBattle пользователя
    const codebattleData = skillScore.codebattle || {};
    const currentRating = codebattleData.rating || 1000;
    const currentSolved = codebattleData.totalSolved || 0;

    // Собираем шаги Roadmap
    const roadmapSteps = [];
    for (const roadmap of roadmaps) {
      const progress = progressByRoadmap[roadmap.id];
      const currentProgress = progress?.progress || 0;

      if (currentProgress < 100) {
        // Определяем, какие навыки прокачивает этот roadmap
        let targetSkill = 'programming';
        for (const [skill, roadmapSlugs] of Object.entries(SKILL_TO_ROADMAPS)) {
          if (roadmapSlugs.includes(roadmap.slug)) {
            targetSkill = skill;
            break;
          }
        }

        roadmapSteps.push({
          id: uuidv4(),
          type: 'roadmap',
          title: `Пройти Roadmap: ${roadmap.title}`,
          titleEn: `Complete Roadmap: ${roadmap.titleEn || roadmap.title}`,
          description: `Текущий прогресс: ${currentProgress}%`,
          descriptionEn: `Current progress: ${currentProgress}%`,
          targetSkill,
          targetValue: null,
          weight: 2,
          roadmapId: roadmap.id,
          roadmapSlug: roadmap.slug,
          requiredProgress: 100,
          currentProgress,
          startedAt: currentProgress > 0 ? progress?.startedAt : null
        });
      }
    }

    // Собираем шаги CodeBattle
    const codebattleSteps = [];

    // CodeBattle рейтинг (если нужен)
    const requiredRating = positionReqs.codebattle?.minRating || 1000;
    if (currentRating < requiredRating) {
      const ratingGap = requiredRating - currentRating;
      const estimatedGames = Math.ceil(ratingGap / 15);

      codebattleSteps.push({
        id: uuidv4(),
        type: 'codebattle',
        title: `Достичь рейтинга ${requiredRating} в CodeBattle`,
        titleEn: `Reach rating ${requiredRating} in CodeBattle`,
        description: `Текущий рейтинг: ${currentRating}. Играйте PvP матчи для повышения рейтинга.`,
        descriptionEn: `Current rating: ${currentRating}. Play PvP matches to increase your rating.`,
        targetSkill: 'algorithms',
        targetValue: null,
        weight: 2,
        requiredTasks: estimatedGames,
        completedTasks: 0,
        codebattleFilter: {
          mode: 'pvp',
          targetRating: requiredRating
        }
      });
    }

    // CodeBattle решённые задачи (если нужны)
    const requiredSolved = positionReqs.codebattle?.minSolved || 0;
    if (currentSolved < requiredSolved) {
      const solvedGap = requiredSolved - currentSolved;
      const difficulties = positionReqs.level === 'junior'
        ? ['easy', 'medium']
        : positionReqs.level === 'middle'
          ? ['medium', 'hard']
          : ['hard'];

      codebattleSteps.push({
        id: uuidv4(),
        type: 'codebattle',
        title: `Решить ${solvedGap} задач в CodeBattle`,
        titleEn: `Solve ${solvedGap} problems in CodeBattle`,
        description: `Текущий прогресс: ${currentSolved}/${requiredSolved}. Решайте задачи любой категории.`,
        descriptionEn: `Current progress: ${currentSolved}/${requiredSolved}. Solve problems of any category.`,
        targetSkill: 'algorithms',
        targetValue: null,
        weight: 2,
        requiredTasks: solvedGap,
        completedTasks: 0,
        solvedTaskIds: [],
        codebattleFilter: {
          difficulties,
          categories: positionReqs.codebattle?.requiredCategories || []
        }
      });
    }

    // Прокачка навыков через CodeBattle
    for (const [skill, gapData] of sortedGaps) {
      const categories = SKILL_TO_CODEBATTLE_CATEGORIES[skill];

      if (categories && gapData.gap >= 10) {
        const tasksNeeded = Math.ceil(gapData.gap / 4);

        codebattleSteps.push({
          id: uuidv4(),
          type: 'codebattle',
          title: `Прокачать ${this.getSkillName(skill)} через CodeBattle`,
          titleEn: `Level up ${this.getSkillNameEn(skill)} through CodeBattle`,
          description: `Решите ${tasksNeeded} задач категорий: ${categories.join(', ')}`,
          descriptionEn: `Solve ${tasksNeeded} problems from categories: ${categories.join(', ')}`,
          targetSkill: skill,
          targetValue: gapData.required,
          weight: 1,
          requiredTasks: tasksNeeded,
          completedTasks: 0,
          solvedTaskIds: [],
          codebattleFilter: {
            categories,
            difficulties: gapData.gap > 30 ? ['easy', 'medium'] : ['medium', 'hard']
          }
        });
      }
    }

    // === Чередуем Roadmap и CodeBattle ===
    const maxLen = Math.max(roadmapSteps.length, codebattleSteps.length);
    for (let i = 0; i < maxLen; i++) {
      // Сначала roadmap
      if (i < roadmapSteps.length) {
        mainSteps.push({
          ...roadmapSteps[i],
          order: order++,
          status: 'locked',
          unlockedAt: null,
          completedAt: null
        });
      }
      // Затем codebattle
      if (i < codebattleSteps.length) {
        mainSteps.push({
          ...codebattleSteps[i],
          order: order++,
          status: 'locked',
          unlockedAt: null,
          startedAt: null,
          completedAt: null
        });
      }
    }

    // === ШАГИ: Тренажер (в конце плана) ===
    // Минимум 70% для успешного прохождения практики с вопросами
    const MIN_PASS_PERCENTAGE = 70;

    // Практика с вопросами
    const programmingGap = gapAnalysis.gaps.programming;
    if (programmingGap && programmingGap.gap >= 10) {
      trainerSteps.push({
        id: uuidv4(),
        order: order++,
        type: 'interview',
        interviewType: 'practice',
        title: 'Практика с вопросами: JavaScript/React',
        titleEn: 'Practice Quiz: JavaScript/React',
        description: `Пройдите 5 тестов с результатом не менее ${MIN_PASS_PERCENTAGE}%`,
        descriptionEn: `Complete 5 quizzes with at least ${MIN_PASS_PERCENTAGE}% score`,
        targetSkill: 'programming',
        targetValue: programmingGap.required,
        weight: 1,
        requiredSessions: 5,
        completedSessions: 0,
        minPassPercentage: MIN_PASS_PERCENTAGE,
        sessionsByType: { ai: 0, audio: 0, practice: 0 },
        practiceStats: { attempts: 0, totalPercentage: 0, successfulAttempts: 0, categories: {} },
        status: 'locked',
        unlockedAt: null,
        startedAt: null,
        completedAt: null
      });
    }

    // AI-интервью
    const communicationGap = gapAnalysis.gaps.communication;
    if (communicationGap && communicationGap.gap >= 15) {
      trainerSteps.push({
        id: uuidv4(),
        order: order++,
        type: 'interview',
        interviewType: 'ai',
        title: 'AI-интервью: техническое собеседование',
        titleEn: 'AI Interview: Technical Interview',
        description: 'Пройдите 3 AI-интервью для отработки технических вопросов',
        descriptionEn: 'Complete 3 AI interviews to practice technical questions',
        targetSkill: 'communication',
        targetValue: communicationGap.required,
        weight: 1,
        requiredSessions: 3,
        completedSessions: 0,
        sessionsByType: { ai: 0, audio: 0, practice: 0 },
        status: 'locked',
        unlockedAt: null,
        startedAt: null,
        completedAt: null
      });
    }

    // Аудио-интервью
    if (communicationGap && communicationGap.gap >= 20) {
      trainerSteps.push({
        id: uuidv4(),
        order: order++,
        type: 'interview',
        interviewType: 'audio',
        title: 'Аудио-интервью с HR',
        titleEn: 'Audio Interview with HR',
        description: 'Пройдите 2 аудио-интервью для практики устной коммуникации',
        descriptionEn: 'Complete 2 audio interviews to practice verbal communication',
        targetSkill: 'communication',
        targetValue: communicationGap.required,
        weight: 1,
        requiredSessions: 2,
        completedSessions: 0,
        sessionsByType: { ai: 0, audio: 0, practice: 0 },
        status: 'locked',
        unlockedAt: null,
        startedAt: null,
        completedAt: null
      });
    }

    // Комбинированная практика (любой тип)
    const algorithmsGap = gapAnalysis.gaps.algorithms;
    if (algorithmsGap && algorithmsGap.gap >= 15) {
      trainerSteps.push({
        id: uuidv4(),
        order: order++,
        type: 'interview',
        interviewType: 'any',
        title: 'Тренажер: закрепление навыков',
        titleEn: 'Trainer: Skills Reinforcement',
        description: 'Пройдите 3 любых сессии тренажера (практика, AI или аудио)',
        descriptionEn: 'Complete 3 trainer sessions of any type',
        targetSkill: 'algorithms',
        targetValue: algorithmsGap.required,
        weight: 1,
        requiredSessions: 3,
        completedSessions: 0,
        minPassPercentage: MIN_PASS_PERCENTAGE,
        sessionsByType: { ai: 0, audio: 0, practice: 0 },
        status: 'locked',
        unlockedAt: null,
        startedAt: null,
        completedAt: null
      });
    }

    // Объединяем: сначала основные шаги, потом тренажер
    const steps = [...mainSteps, ...trainerSteps];

    // Разблокируем первый шаг
    if (steps.length > 0 && steps[0].status === 'locked') {
      steps[0].status = 'in_progress';
      steps[0].unlockedAt = new Date();
    }

    return steps;
  }

  /**
   * Рассчитать начальный прогресс по навыкам
   */
  calculateInitialSkillProgress(currentRadar, targetSkills) {
    const progress = {};

    for (const [skill, targetValue] of Object.entries(targetSkills)) {
      const currentValue = currentRadar[skill] || 0;
      progress[skill] = Math.min(100, Math.round((currentValue / targetValue) * 100));
    }

    return progress;
  }

  /**
   * Оценить время достижения цели
   */
  estimateTimeToComplete(steps, gapAnalysis) {
    let totalWeeks = 0;

    for (const step of steps) {
      if (step.type === 'codebattle') {
        // ~5 задач в неделю при активной практике
        totalWeeks += Math.ceil((step.requiredTasks || 0) / 5);
      } else if (step.type === 'roadmap') {
        // ~10% прогресса в неделю
        const progressNeeded = (step.requiredProgress || 100) - (step.currentProgress || 0);
        totalWeeks += Math.ceil(progressNeeded / 10);
      } else if (step.type === 'interview') {
        // 1 интервью в неделю
        totalWeeks += step.requiredSessions || 3;
      }
    }

    // Учитываем параллельное выполнение (делим на 1.5)
    return Math.ceil(totalWeeks / 1.5);
  }

  /**
   * Получить название навыка на русском
   */
  getSkillName(skill) {
    const names = {
      programming: 'Программирование',
      algorithms: 'Алгоритмы',
      databases: 'Базы данных',
      ui_ux: 'UI/UX',
      devops: 'DevOps',
      cloud: 'Облачные технологии',
      testing: 'Тестирование',
      security: 'Безопасность',
      networking: 'Сети',
      ai_ml: 'AI/ML',
      data_science: 'Data Science',
      mobile: 'Мобильная разработка',
      management: 'Менеджмент',
      communication: 'Коммуникация'
    };
    return names[skill] || skill;
  }

  /**
   * Получить название навыка на английском
   */
  getSkillNameEn(skill) {
    const names = {
      programming: 'Programming',
      algorithms: 'Algorithms',
      databases: 'Databases',
      ui_ux: 'UI/UX',
      devops: 'DevOps',
      cloud: 'Cloud',
      testing: 'Testing',
      security: 'Security',
      networking: 'Networking',
      ai_ml: 'AI/ML',
      data_science: 'Data Science',
      mobile: 'Mobile Development',
      management: 'Management',
      communication: 'Communication'
    };
    return names[skill] || skill;
  }

  /**
   * Обновить план с учётом нового прогресса
   */
  async refreshPlan(planId) {
    const plan = await db.DevelopmentPlan.findByPk(planId);
    if (!plan) return null;

    // Получаем актуальный радар
    const skillScore = await skillAggregator.getOrRecalculate(plan.userId, true);
    const currentRadar = skillScore.calculatedRadar || {};

    // Обновляем прогресс по навыкам
    plan.skillProgress = this.calculateInitialSkillProgress(currentRadar, plan.targetSkills);

    // Обновляем прогресс roadmap в шагах
    const roadmapProgress = await db.RoadmapProgress.findAll({
      where: { userId: plan.userId }
    });
    const progressByRoadmapId = {};
    roadmapProgress.forEach(rp => {
      progressByRoadmapId[rp.roadmapId] = rp;
    });

    const steps = plan.steps || [];
    for (const step of steps) {
      if (step.type === 'roadmap' && step.roadmapId) {
        const rp = progressByRoadmapId[step.roadmapId];
        if (rp) {
          step.currentProgress = rp.progress || 0;
          if (rp.progress >= step.requiredProgress && step.status !== 'completed') {
            step.status = 'completed';
            step.completedAt = new Date();
          }
        }
      }
    }

    plan.steps = steps;
    plan.overallProgress = plan.calculateOverallProgress();
    plan.lastSyncAt = new Date();

    // Проверяем завершение плана
    const allCompleted = steps.every(s => s.status === 'completed');
    if (allCompleted && plan.status === 'active') {
      plan.status = 'completed';
      plan.completedAt = new Date();
    }

    await plan.save();
    return plan;
  }
}

module.exports = new PlanGeneratorService();
