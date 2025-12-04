'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GameMatch extends Model {
    static associate(models) {
      GameMatch.belongsTo(models.User, { foreignKey: 'player1Id', as: 'player1' });
      GameMatch.belongsTo(models.User, { foreignKey: 'player2Id', as: 'player2' });
      GameMatch.belongsTo(models.User, { foreignKey: 'winnerId', as: 'winner' });
      GameMatch.belongsTo(models.GameTask, { foreignKey: 'taskId', as: 'task' });
    }
  }

  GameMatch.init({
    player1Id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    player2Id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'GameTasks',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('waiting', 'in_progress', 'completed', 'cancelled', 'timeout'),
      allowNull: false,
      defaultValue: 'waiting'
    },
    winnerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    isDraw: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    player1Code: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    player2Code: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    player1Language: {
      type: DataTypes.STRING,
      allowNull: true
    },
    player2Language: {
      type: DataTypes.STRING,
      allowNull: true
    },
    player1Solved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    player2Solved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    player1SolveTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Время решения player1 в секундах'
    },
    player2SolveTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Время решения player2 в секундах'
    },
    player1TestsPassed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    player2TestsPassed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    totalTests: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    player1RatingBefore: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    player2RatingBefore: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    player1RatingChange: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    player2RatingChange: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    timeLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 300,
      comment: 'Лимит времени в секундах'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    finishedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    roomCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Код приватной комнаты (если есть)'
    }
  }, {
    sequelize,
    modelName: 'GameMatch',
    tableName: 'GameMatches'
  });

  return GameMatch;
};