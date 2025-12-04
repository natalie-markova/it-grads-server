'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SkillScore extends Model {
    static associate(models) {
      SkillScore.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }

    // Получить уровень навыка (0-5) по значению (0-100)
    static getSkillLevel(value) {
      if (value >= 90) return 5;
      if (value >= 70) return 4;
      if (value >= 50) return 3;
      if (value >= 30) return 2;
      if (value >= 10) return 1;
      return 0;
    }

    // Получить название уровня
    static getLevelName(level) {
      const names = {
        0: 'Не определён',
        1: 'Начинающий',
        2: 'Базовый',
        3: 'Средний',
        4: 'Продвинутый',
        5: 'Эксперт'
      };
      return names[level] || 'Не определён';
    }

    // Рассчитать процент заполненности радара
    getCompleteness() {
      const radar = this.calculatedRadar || {};
      const values = Object.values(radar);
      if (values.length === 0) return 0;

      const filledCount = values.filter(v => v > 0).length;
      return Math.round((filledCount / values.length) * 100);
    }

    // Получить сильные стороны (топ-3)
    getStrengths() {
      const radar = this.calculatedRadar || {};
      return Object.entries(radar)
        .filter(([_, value]) => value > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([skill, value]) => ({ skill, value, level: SkillScore.getSkillLevel(value) }));
    }

    // Получить зоны роста (топ-3 слабых)
    getGrowthAreas() {
      const radar = this.calculatedRadar || {};
      return Object.entries(radar)
        .filter(([_, value]) => value < 50)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .map(([skill, value]) => ({ skill, value, level: SkillScore.getSkillLevel(value) }));
    }
  }

  SkillScore.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },

    // === CODE BATTLE метрики ===
    codebattle: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        totalSolved: 0,
        easySolved: 0,
        mediumSolved: 0,
        hardSolved: 0,
        avgSolveTime: 0,
        firstAttemptSuccess: 0,
        languages: {},
        categories: {},
        pvpWinRate: 0,
        pvpGames: 0,
        rating: 1000,
        maxRating: 1000,
        league: 'bronze',
        streak: 0,
        dailyChallengeStreak: 0,
        beatAiCount: 0,
        totalAiGames: 0
      }
    },

    // === RESUME метрики ===
    resume: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        hasPortfolio: false,
        portfolioUrl: null,
        experienceYears: 0,
        technologies: [],
        level: 'junior',
        completeness: 0,
        hasDescription: false,
        hasEducation: false,
        location: null
      }
    },

    // === AI INTERVIEW метрики ===
    aiInterview: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        sessionsCompleted: 0,
        totalSessions: 0,
        avgScore: 0,
        maxScore: 0,
        strongAreas: [],
        weakAreas: [],
        directions: {},
        technologies: {},
        levels: {}
      }
    },

    // === AUDIO INTERVIEW метрики ===
    audioInterview: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        sessionsCompleted: 0,
        totalSessions: 0,
        avgScore: 0,
        maxScore: 0,
        personaScores: {
          strict_hr: { count: 0, avgScore: 0 },
          friendly_tech: { count: 0, avgScore: 0 },
          direct_ceo: { count: 0, avgScore: 0 }
        },
        communicationScore: 0,
        stressResistanceScore: 0,
        avgDuration: 0
      }
    },

    // === ROADMAP метрики ===
    roadmap: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        totalStarted: 0,
        totalCompleted: 0,
        avgProgress: 0,
        totalStepsCompleted: 0,
        categories: {},
        activeRoadmaps: []
      }
    },

    // === QUIZ/PRACTICE метрики (будущее расширение) ===
    quiz: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        totalAnswered: 0,
        correctAnswers: 0,
        correctRate: 0,
        categories: {},
        lastQuizAt: null
      }
    },

    // === ИТОГОВЫЙ РАДАР (12 категорий, значения 0-100) ===
    calculatedRadar: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        programming: 0,      // Программирование
        databases: 0,        // Базы данных
        cloud: 0,            // Облачные технологии
        devops: 0,           // DevOps
        testing: 0,          // Тестирование
        networking: 0,       // Сети и администрирование
        security: 0,         // Безопасность
        ai_ml: 0,            // ML & AI
        data_science: 0,     // Data Science
        management: 0,       // Управление проектами
        ui_ux: 0,            // UI/UX дизайн
        mobile: 0,           // Мобильная разработка
        communication: 0,    // Коммуникация (soft skills)
        algorithms: 0        // Алгоритмы
      }
    },

    // === ДЕТАЛЬНАЯ РАЗБИВКА (откуда берётся каждый навык) ===
    radarBreakdown: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        programming: { codebattle: 0, resume: 0, roadmap: 0, interview: 0 },
        databases: { quiz: 0, roadmap: 0, resume: 0, interview: 0 },
        cloud: { roadmap: 0, quiz: 0, resume: 0 },
        devops: { roadmap: 0, quiz: 0, resume: 0 },
        testing: { codebattle: 0, quiz: 0, resume: 0 },
        networking: { quiz: 0, roadmap: 0, resume: 0 },
        security: { quiz: 0, roadmap: 0, resume: 0 },
        ai_ml: { quiz: 0, roadmap: 0, interview: 0, resume: 0 },
        data_science: { quiz: 0, roadmap: 0, resume: 0 },
        management: { roadmap: 0, quiz: 0, resume: 0 },
        ui_ux: { roadmap: 0, quiz: 0, resume: 0 },
        mobile: { roadmap: 0, quiz: 0, codebattle: 0, resume: 0 },
        communication: { audioInterview: 0, aiInterview: 0 },
        algorithms: { codebattle: 0 }
      }
    },

    // === РЕКОМЕНДАЦИИ ===
    recommendations: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },

    // === ДОСТИЖЕНИЯ И БЕЙДЖИ ===
    achievements: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },

    // === МЕТАДАННЫЕ ===
    lastCalculatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },

    calculationVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Версия алгоритма расчёта (для миграций)'
    }
  }, {
    sequelize,
    modelName: 'SkillScore',
    tableName: 'SkillScores',
    indexes: [
      {
        unique: true,
        fields: ['userId']
      }
    ]
  });

  return SkillScore;
};