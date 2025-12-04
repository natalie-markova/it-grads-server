'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('GameSessions', {
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
      taskId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'GameTasks',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      mode: {
        type: Sequelize.ENUM('solo', 'vs_ai', 'daily_challenge'),
        allowNull: false,
        defaultValue: 'solo'
      },
      status: {
        type: Sequelize.ENUM('in_progress', 'completed', 'abandoned', 'timeout'),
        allowNull: false,
        defaultValue: 'in_progress'
      },
      code: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      language: {
        type: Sequelize.STRING,
        allowNull: true
      },
      solved: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      testsPassed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      totalTests: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      timeSpent: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      hintsUsed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      pointsEarned: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      aiDifficulty: {
        type: Sequelize.ENUM('easy', 'medium', 'hard'),
        allowNull: true
      },
      aiSolveTime: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      beatAi: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      executionTime: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      memoryUsed: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      finishedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Индексы
    await queryInterface.addIndex('GameSessions', ['userId']);
    await queryInterface.addIndex('GameSessions', ['taskId']);
    await queryInterface.addIndex('GameSessions', ['mode']);
    await queryInterface.addIndex('GameSessions', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('GameSessions');
  }
};