'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AIInterviewQuestion extends Model {
    static associate(models) {
      AIInterviewQuestion.belongsTo(models.AIInterviewSession, {
        foreignKey: 'sessionId',
        as: 'session'
      });
    }
  }

  AIInterviewQuestion.init({
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'AIInterviewSessions',
        key: 'id'
      }
    },
    question: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    difficulty: {
      type: DataTypes.ENUM('junior', 'middle', 'senior'),
      allowNull: false
    },
    technology: {
      type: DataTypes.STRING,
      allowNull: false
    },
    hints: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: []
    },
    userAnswer: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    answeredAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'AIInterviewQuestion',
    tableName: 'AIInterviewQuestions'
  });

  return AIInterviewQuestion;
};