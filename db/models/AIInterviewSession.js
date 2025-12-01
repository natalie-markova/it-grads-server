'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AIInterviewSession extends Model {
    static associate(models) {
        
      AIInterviewSession.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });

      AIInterviewSession.hasMany(models.AIInterviewMessage, {
        foreignKey: 'sessionId',
        as: 'messages'
      });
    }
  }

  AIInterviewSession.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      }
    },
    direction: {
      type: DataTypes.ENUM('frontend', 'backend', 'fullstack'),
      allowNull: true
    },
    technologies: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    level: {
      type: DataTypes.ENUM('junior', 'middle', 'senior'),
      allowNull: true
    },
    questionsCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    },
    strengths: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    },
    weaknesses: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    },
    detailedFeedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Audio interview fields
    interviewerPersona: {
      type: DataTypes.ENUM('strict_hr', 'friendly_tech', 'direct_ceo'),
      allowNull: true
    },
    position: {
      type: DataTypes.STRING,
      allowNull: true
    },
    overallScore: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'AIInterviewSession',
    tableName: 'AIInterviewSessions'
  });

  return AIInterviewSession;
};