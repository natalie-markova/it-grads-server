'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PracticeQuizResults', {
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
      category: {
        type: Sequelize.STRING,
        allowNull: false
      },
      totalQuestions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      correctAnswers: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      percentage: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      answers: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
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

    // Добавляем индекс для быстрого поиска по userId
    await queryInterface.addIndex('PracticeQuizResults', ['userId']);
    await queryInterface.addIndex('PracticeQuizResults', ['category']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('PracticeQuizResults');
  }
};
