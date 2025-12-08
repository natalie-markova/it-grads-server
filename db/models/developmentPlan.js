'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DevelopmentPlan extends Model {
    static associate(models) {
      DevelopmentPlan.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }

    // Получить текущий активный шаг
    getCurrentStep() {
      const steps = this.steps || [];
      return steps.find(step => step.status === 'in_progress') ||
             steps.find(step => step.status === 'unlocked') ||
             null;
    }

    // Получить следующий заблокированный шаг
    getNextLockedStep() {
      const steps = this.steps || [];
      return steps.find(step => step.status === 'locked');
    }

    // Проверить, соответствует ли задача фильтру шага
    matchesStepFilter(step, task) {
      if (!step.codebattleFilter) return false;

      const filter = step.codebattleFilter;

      // Проверка категории
      if (filter.categories && filter.categories.length > 0) {
        if (!filter.categories.includes(task.category)) return false;
      }

      // Проверка сложности
      if (filter.difficulties && filter.difficulties.length > 0) {
        if (!filter.difficulties.includes(task.difficulty)) return false;
      }

      // Проверка языка
      if (filter.languages && filter.languages.length > 0) {
        // Язык проверяется по сессии, не по задаче
      }

      return true;
    }

    // Рассчитать общий прогресс плана
    calculateOverallProgress() {
      const steps = this.steps || [];
      if (steps.length === 0) return 0;

      let totalWeight = 0;
      let completedWeight = 0;

      for (const step of steps) {
        const weight = step.weight || 1;
        totalWeight += weight;

        if (step.status === 'completed') {
          completedWeight += weight;
        } else if (step.status === 'in_progress' && step.requiredTasks > 0) {
          // Частичный прогресс для шагов CodeBattle
          const stepProgress = (step.completedTasks || 0) / step.requiredTasks;
          completedWeight += weight * stepProgress;
        } else if (step.status === 'in_progress' && step.requiredProgress) {
          // Частичный прогресс для шагов Roadmap
          const stepProgress = (step.currentProgress || 0) / step.requiredProgress;
          completedWeight += weight * stepProgress;
        }
      }

      return Math.round((completedWeight / totalWeight) * 100);
    }

    // Получить статистику по шагам
    getStepsStats() {
      const steps = this.steps || [];
      return {
        total: steps.length,
        completed: steps.filter(s => s.status === 'completed').length,
        inProgress: steps.filter(s => s.status === 'in_progress').length,
        unlocked: steps.filter(s => s.status === 'unlocked').length,
        locked: steps.filter(s => s.status === 'locked').length
      };
    }

    // Проверить достижение цели по навыку
    isSkillGoalReached(skill, currentRadar) {
      const targetValue = this.targetSkills?.[skill];
      const currentValue = currentRadar?.[skill] || 0;
      return targetValue && currentValue >= targetValue;
    }

    // Получить GAP между текущими и целевыми навыками
    getSkillGaps(currentRadar) {
      const gaps = {};
      const targetSkills = this.targetSkills || {};

      for (const [skill, targetValue] of Object.entries(targetSkills)) {
        const currentValue = currentRadar?.[skill] || 0;
        if (currentValue < targetValue) {
          gaps[skill] = {
            current: currentValue,
            target: targetValue,
            gap: targetValue - currentValue,
            progress: Math.round((currentValue / targetValue) * 100)
          };
        }
      }

      return gaps;
    }
  }

  DevelopmentPlan.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },

    // === ЦЕЛЬ ===
    targetPosition: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'ID целевой позиции (например: middle-frontend)'
    },

    targetPositionTitle: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Название позиции для отображения'
    },

    targetPositionTitleEn: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Название позиции на английском'
    },

    targetPositionIcon: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '🎯'
    },

    targetPositionLevel: {
      type: DataTypes.ENUM('junior', 'middle', 'senior', 'lead'),
      allowNull: false,
      defaultValue: 'middle'
    },

    // Целевые значения навыков
    targetSkills: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Целевые значения навыков: { programming: 70, algorithms: 55, ... }'
    },

    // Снимок навыков на момент создания плана
    initialSkills: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Начальные значения навыков при создании плана'
    },

    // Текущий прогресс по навыкам (обновляется при синхронизации)
    skillProgress: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Прогресс по каждому навыку в %: { programming: 85, algorithms: 60, ... }'
    },

    // === ШАГИ ПЛАНА ===
    steps: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: `Массив шагов плана:
      [
        {
          id: "step-uuid",
          order: 1,
          type: "codebattle" | "roadmap" | "course" | "project" | "interview",
          title: "Решить 10 задач на алгоритмы",
          titleEn: "Solve 10 algorithm problems",
          description: "Сложность: medium+",
          descriptionEn: "Difficulty: medium+",
          targetSkill: "algorithms",
          targetValue: 50,
          weight: 1,

          // Для type: codebattle
          requiredTasks: 10,
          completedTasks: 3,
          codebattleFilter: {
            categories: ["algorithms", "data-structures"],
            difficulties: ["medium", "hard"],
            languages: ["javascript"]
          },
          solvedTaskIds: [1, 5, 12],

          // Для type: roadmap
          roadmapSlug: "react",
          requiredProgress: 100,
          currentProgress: 45,

          // Общее
          status: "locked" | "unlocked" | "in_progress" | "completed",
          unlockedAt: Date | null,
          startedAt: Date | null,
          completedAt: Date | null
        }
      ]`
    },

    // === ТРЕБОВАНИЯ ===
    requiredRoadmaps: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Список обязательных roadmap slugs'
    },

    codebattleRequirements: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        minRating: 1000,
        minSolved: 0
      },
      comment: 'Требования по CodeBattle'
    },

    // === ПРОГРЕСС ===
    overallProgress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Общий прогресс плана 0-100%'
    },

    // === СТАТУС ===
    status: {
      type: DataTypes.ENUM('active', 'completed', 'paused', 'abandoned'),
      allowNull: false,
      defaultValue: 'active'
    },

    // === МЕТАДАННЫЕ ===
    matchScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Процент совпадения профиля с целью на момент создания'
    },

    estimatedWeeks: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Оценка времени достижения цели в неделях'
    },

    lastSyncAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Последняя синхронизация с источниками данных'
    },

    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },

    pausedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },

    abandonedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'DevelopmentPlan',
    tableName: 'DevelopmentPlans',
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['targetPosition']
      }
    ]
  });

  return DevelopmentPlan;
};
