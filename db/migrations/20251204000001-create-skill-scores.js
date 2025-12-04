'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SkillScores', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      codebattle: {
        type: Sequelize.JSONB,
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
      resume: {
        type: Sequelize.JSONB,
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
      aiInterview: {
        type: Sequelize.JSONB,
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
      audioInterview: {
        type: Sequelize.JSONB,
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
      roadmap: {
        type: Sequelize.JSONB,
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
      quiz: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          totalAnswered: 0,
          correctAnswers: 0,
          correctRate: 0,
          categories: {},
          lastQuizAt: null
        }
      },
      calculatedRadar: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          programming: 0,
          databases: 0,
          cloud: 0,
          devops: 0,
          testing: 0,
          networking: 0,
          security: 0,
          ai_ml: 0,
          data_science: 0,
          management: 0,
          ui_ux: 0,
          mobile: 0,
          communication: 0,
          algorithms: 0
        }
      },
      radarBreakdown: {
        type: Sequelize.JSONB,
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
      recommendations: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      },
      achievements: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      },
      lastCalculatedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      calculationVersion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Создаём уникальный индекс на userId
    await queryInterface.addIndex('SkillScores', ['userId'], {
      unique: true,
      name: 'skill_scores_user_id_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SkillScores');
  }
};