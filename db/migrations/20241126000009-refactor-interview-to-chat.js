'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Удаляем старую таблицу вопросов
    await queryInterface.dropTable('AIInterviewQuestions');

    // Создаём таблицу для истории сообщений чата
    await queryInterface.createTable('AIInterviewMessages', {
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
      role: {
        type: Sequelize.ENUM('assistant', 'user'),
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
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

    await queryInterface.addIndex('AIInterviewMessages', ['sessionId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('AIInterviewMessages');
    
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