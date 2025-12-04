'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('GameMatches', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      player1Id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      player2Id: {
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
      status: {
        type: Sequelize.ENUM('waiting', 'in_progress', 'completed', 'cancelled', 'timeout'),
        allowNull: false,
        defaultValue: 'waiting'
      },
      winnerId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      isDraw: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      player1Code: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      player2Code: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      player1Language: {
        type: Sequelize.STRING,
        allowNull: true
      },
      player2Language: {
        type: Sequelize.STRING,
        allowNull: true
      },
      player1Solved: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      player2Solved: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      player1SolveTime: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      player2SolveTime: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      player1TestsPassed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      player2TestsPassed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      totalTests: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      player1RatingBefore: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      player2RatingBefore: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      player1RatingChange: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      player2RatingChange: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      timeLimit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 300
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      finishedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      roomCode: {
        type: Sequelize.STRING,
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
    await queryInterface.addIndex('GameMatches', ['player1Id']);
    await queryInterface.addIndex('GameMatches', ['player2Id']);
    await queryInterface.addIndex('GameMatches', ['status']);
    await queryInterface.addIndex('GameMatches', ['roomCode']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('GameMatches');
  }
};