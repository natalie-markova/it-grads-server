'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PlayerRating extends Model {
    static associate(models) {
      PlayerRating.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }

    // Метод для расчёта изменения рейтинга (ELO-подобная система)
    static calculateRatingChange(winnerRating, loserRating, isDraw = false) {
      const K = 32; // Коэффициент изменения
      const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
      const expectedLoser = 1 - expectedWinner;

      if (isDraw) {
        return {
          winnerChange: Math.round(K * (0.5 - expectedWinner)),
          loserChange: Math.round(K * (0.5 - expectedLoser))
        };
      }

      return {
        winnerChange: Math.round(K * (1 - expectedWinner)),
        loserChange: Math.round(K * (0 - expectedLoser))
      };
    }

    // Определение лиги по рейтингу
    static getLeague(rating) {
      if (rating >= 2400) return 'grandmaster';
      if (rating >= 2000) return 'master';
      if (rating >= 1600) return 'diamond';
      if (rating >= 1400) return 'platinum';
      if (rating >= 1200) return 'gold';
      if (rating >= 1000) return 'silver';
      return 'bronze';
    }

    // Получение иконки лиги
    static getLeagueIcon(league) {
      const icons = {
        bronze: '🥉',
        silver: '🥈',
        gold: '🥇',
        platinum: '💎',
        diamond: '💠',
        master: '👑',
        grandmaster: '🏆'
      };
      return icons[league] || '🎮';
    }
  }

  PlayerRating.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1000,
      comment: 'Текущий рейтинг игрока'
    },
    maxRating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1000,
      comment: 'Максимальный достигнутый рейтинг'
    },
    league: {
      type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster'),
      allowNull: false,
      defaultValue: 'bronze'
    },
    wins: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    losses: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    draws: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    streak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Текущая серия побед (отрицательное = серия поражений)'
    },
    maxStreak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Максимальная серия побед'
    },
    totalGames: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    totalSolved: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Всего решённых задач (включая соло)'
    },
    favoriteLanguage: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Самый используемый язык'
    },
    avgSolveTime: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Среднее время решения в секундах'
    },
    lastMatchAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    achievements: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Достижения игрока'
    },
    dailyChallengeStreak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Серия выполненных ежедневных челленджей'
    },
    lastDailyChallengeAt: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'PlayerRating',
    tableName: 'PlayerRatings'
  });

  return PlayerRating;
};