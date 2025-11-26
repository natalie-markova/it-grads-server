'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AIInterviewSession extends Model {
    static associate(models) {
        
      AIInterviewSession.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });

      AIInterviewSession.hasMany(models.AIInterviewQuestion, {
        foreignKey: 'sessionId',
        as: 'questions'
      });
    }
  }

  AIInterviewSession.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    direction: {
      type: DataTypes.ENUM('frontend', 'backend', 'fullstack'),
      allowNull: false
    },
    technologies: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: []
    },
    level: {
      type: DataTypes.ENUM('junior', 'middle', 'senior'),
      allowNull: false
    },
    questionsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10
    },
    status: {
      type: DataTypes.ENUM('setup', 'in-progress', 'completed'),
      allowNull: false,
      defaultValue: 'setup'
    },
    currentQuestionIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    totalScore: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    recommendations: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: []
    }
  }, {
    sequelize,
    modelName: 'AIInterviewSession',
    tableName: 'AIInterviewSessions'
  });

  return AIInterviewSession;
};