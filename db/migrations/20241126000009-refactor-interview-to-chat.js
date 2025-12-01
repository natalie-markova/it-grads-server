'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Удаляем старую таблицу вопросов (AIInterviewMessages уже создана в миграции 8)
    const tables = await queryInterface.showAllTables();
    if (tables.includes('AIInterviewQuestions')) {
      await queryInterface.dropTable('AIInterviewQuestions');
    }
  },

  async down(queryInterface, Sequelize) {
    // Восстанавливаем старую таблицу (если нужен rollback)
    await queryInterface.createTable('AIInterviewQuestions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      sessionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'AIInterviewSessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      question: {
        type: Sequelize.TEXT
      },
      difficulty: {
        type: Sequelize.ENUM('junior', 'middle', 'senior')
      },
      technology: {
        type: Sequelize.STRING
      },
      hints: {
        type: Sequelize.ARRAY(Sequelize.TEXT)
      },
      userAnswer: {
        type: Sequelize.TEXT
      },
      score: {
        type: Sequelize.FLOAT
      },
      feedback: {
        type: Sequelize.TEXT
      },
      answeredAt: {
        type: Sequelize.DATE
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
  }
};