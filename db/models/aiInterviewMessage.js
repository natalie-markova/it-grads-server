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
    }
  }, {
    sequelize,
    modelName: 'AIInterviewMessage',
    tableName: 'AIInterviewMessages'
  });

  return AIInterviewMessage;
};