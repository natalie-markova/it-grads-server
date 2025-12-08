'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PracticeQuizResult extends Model {
    static associate(models) {
      PracticeQuizResult.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }

  PracticeQuizResult.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      }
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false
    },
    totalQuestions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10
    },
    correctAnswers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    percentage: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    answers: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'PracticeQuizResult',
    tableName: 'PracticeQuizResults'
  });

  return PracticeQuizResult;
};
