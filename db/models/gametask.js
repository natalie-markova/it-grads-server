'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GameTask extends Model {
    static associate(models) {
      GameTask.hasMany(models.GameSession, { foreignKey: 'taskId', as: 'sessions' });
      GameTask.hasMany(models.GameMatch, { foreignKey: 'taskId', as: 'matches' });
    }
  }

  GameTask.init({
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    difficulty: {
      type: DataTypes.ENUM('easy', 'medium', 'hard'),
      allowNull: false,
      defaultValue: 'easy'
    },
    timeLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 300, // 5 минут в секундах
      comment: 'Время на решение в секундах (180=3мин, 300=5мин, 600=10мин)'
    },
    languages: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: ['javascript', 'python'],
      comment: 'Поддерживаемые языки программирования'
    },
    testCases: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: 'Тестовые случаи: [{input, expectedOutput, isHidden}]'
    },
    starterCode: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Начальный код для каждого языка: {javascript: "...", python: "..."}'
    },
    solution: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Решения для каждого языка (для режима vs AI)'
    },
    hints: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Подсказки для задачи'
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Категория: arrays, strings, algorithms, data-structures, etc.'
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Теги задачи'
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      comment: 'Базовые очки за решение'
    },
    solvedCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Сколько раз задача была решена'
    },
    attemptCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Сколько раз задачу пытались решить'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    isDailyChallenge: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Ежедневный челлендж'
    },
    dailyChallengeDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Дата когда задача была/будет ежедневным челленджем'
    },
    // Поля для внешних источников
    externalId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      comment: 'ID задачи из внешнего источника (cf-1234-A)'
    },
    externalSource: {
      type: DataTypes.ENUM('local', 'codeforces', 'leetcode', 'hackerrank'),
      defaultValue: 'local',
      comment: 'Источник задачи'
    },
    externalRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Рейтинг из внешнего источника'
    },
    externalUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL на оригинальную задачу'
    }
  }, {
    sequelize,
    modelName: 'GameTask',
    tableName: 'GameTasks'
  });

  return GameTask;
};