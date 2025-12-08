'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DevelopmentPlans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      // === ЦЕЛЬ ===
      targetPosition: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'ID целевой позиции (например: middle-frontend)'
      },
      targetPositionTitle: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Название позиции для отображения'
      },
      targetPositionTitleEn: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Название позиции на английском'
      },
      targetPositionIcon: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: '🎯'
      },
      targetPositionLevel: {
        type: Sequelize.ENUM('junior', 'middle', 'senior', 'lead'),
        allowNull: false,
        defaultValue: 'middle'
      },

      // === НАВЫКИ ===
      targetSkills: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      initialSkills: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      skillProgress: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },

      // === ШАГИ ===
      steps: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      },

      // === ТРЕБОВАНИЯ ===
      requiredRoadmaps: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      },
      codebattleRequirements: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {
          minRating: 1000,
          minSolved: 0
        }
      },

      // === ПРОГРЕСС ===
      overallProgress: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },

      // === СТАТУС ===
      status: {
        type: Sequelize.ENUM('active', 'completed', 'paused', 'abandoned'),
        allowNull: false,
        defaultValue: 'active'
      },

      // === МЕТАДАННЫЕ ===
      matchScore: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      estimatedWeeks: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      lastSyncAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      pausedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      abandonedAt: {
        type: Sequelize.DATE,
        allowNull: true
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

    // Индексы
    await queryInterface.addIndex('DevelopmentPlans', ['userId'], {
      name: 'development_plans_user_id'
    });
    await queryInterface.addIndex('DevelopmentPlans', ['status'], {
      name: 'development_plans_status'
    });
    await queryInterface.addIndex('DevelopmentPlans', ['targetPosition'], {
      name: 'development_plans_target_position'
    });
    await queryInterface.addIndex('DevelopmentPlans', ['userId', 'status'], {
      name: 'development_plans_user_status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('DevelopmentPlans');
  }
};
