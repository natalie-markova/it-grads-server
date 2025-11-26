'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AIInterviewSessions', {
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
      direction: {
        type: Sequelize.ENUM('frontend', 'backend', 'fullstack'),
        allowNull: false
      },
      technologies: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
        defaultValue: []
      },
      level: {
        type: Sequelize.ENUM('junior', 'middle', 'senior'),
        allowNull: false
      },
      questionsCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      status: {
        type: Sequelize.ENUM('setup', 'in-progress', 'completed'),
        allowNull: false,
        defaultValue: 'setup'
      },
      currentQuestionIndex: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      totalScore: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      recommendations: {
        type: Sequelize.ARRAY(Sequelize.TEXT),
        allowNull: true,
        defaultValue: []
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

    await queryInterface.addIndex('AIInterviewSessions', ['userId']);
    await queryInterface.addIndex('AIInterviewSessions', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('AIInterviewSessions');
  }
};