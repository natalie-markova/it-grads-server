'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PlayerRatings', {
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
      rating: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1000
      },
      maxRating: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1000
      },
      league: {
        type: Sequelize.ENUM('bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster'),
        allowNull: false,
        defaultValue: 'bronze'
      },
      wins: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      losses: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      draws: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      streak: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      maxStreak: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      totalGames: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      totalSolved: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      favoriteLanguage: {
        type: Sequelize.STRING,
        allowNull: true
      },
      avgSolveTime: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      lastMatchAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      achievements: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      },
      dailyChallengeStreak: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      lastDailyChallengeAt: {
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

    // Индексы для лидерборда
    await queryInterface.addIndex('PlayerRatings', ['rating']);
    await queryInterface.addIndex('PlayerRatings', ['league']);
    await queryInterface.addIndex('PlayerRatings', ['totalGames']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PlayerRatings');
  }
};