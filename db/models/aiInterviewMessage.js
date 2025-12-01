'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AIInterviewMessage extends Model {
    static associate(models) {
      AIInterviewMessage.belongsTo(models.AIInterviewSession, {
        foreignKey: 'sessionId',
        as: 'session'
      });
    }
  }

  AIInterviewMessage.init({
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('assistant', 'user'),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // Audio interview fields
    score: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    evaluation: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'AIInterviewMessage',
    tableName: 'AIInterviewMessages'
  });

  return AIInterviewMessage;
};