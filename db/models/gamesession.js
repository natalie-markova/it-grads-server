'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GameSession extends Model {
    static associate(models) {
      GameSession.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      GameSession.belongsTo(models.GameTask, { foreignKey: 'taskId', as: 'task' });
    }
  }

  GameSession.init({
    userId: {
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
    mode: {
      type: DataTypes.ENUM('solo', 'vs_ai', 'daily_challenge'),
      allowNull: false,
      defaultValue: 'solo'
    },
    status: {
      type: DataTypes.ENUM('in_progress', 'completed', 'abandoned', 'timeout'),
      allowNull: false,
      defaultValue: 'in_progress'
    },
    code: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    language: {
      type: DataTypes.STRING,
      allowNull: true
    },
    solved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    testsPassed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    totalTests: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    timeSpent: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Время решения в секундах'
    },
    hintsUsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    pointsEarned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    aiDifficulty: {
      type: DataTypes.ENUM('easy', 'medium', 'hard'),
      allowNull: true,
      comment: 'Сложность AI (для режима vs_ai)'
    },
    aiSolveTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Время за которое AI решил задачу (в секундах)'
    },
    aiSolved: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'Решил ли AI задачу'
    },
    aiCode: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Код решения AI'
    },
    aiTestsPassed: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Сколько тестов прошёл AI'
    },
    beatAi: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'Победил ли игрок AI'
    },
    executionTime: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Время выполнения кода в ms'
    },
    memoryUsed: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Использованная память в KB'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    finishedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'GameSession',
    tableName: 'GameSessions'
  });

  return GameSession;
};