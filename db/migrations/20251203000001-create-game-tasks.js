'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('GameTasks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      difficulty: {
        type: Sequelize.ENUM('easy', 'medium', 'hard'),
        allowNull: false,
        defaultValue: 'easy'
      },
      timeLimit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 300
      },
      languages: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: ['javascript', 'python']
      },
      testCases: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: []
      },
      starterCode: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      },
      solution: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      },
      hints: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      points: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      solvedCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      attemptCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      isDailyChallenge: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      dailyChallengeDate: {
        type: Sequelize.DATEONLY,
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

    // Индексы для быстрого поиска
    await queryInterface.addIndex('GameTasks', ['difficulty']);
    await queryInterface.addIndex('GameTasks', ['category']);
    await queryInterface.addIndex('GameTasks', ['isActive']);
    await queryInterface.addIndex('GameTasks', ['isDailyChallenge', 'dailyChallengeDate']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('GameTasks');
  }
};