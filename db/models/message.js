'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    static associate(models) {
      Message.belongsTo(models.Chat, {
        foreignKey: 'chatId',
        as: 'chat'
      });

      Message.belongsTo(models.User, {
        foreignKey: 'senderId',
        as: 'sender'
      });
    }
  }

  Message.init({
    chatId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'Message',
    tableName: 'Messages'
  });

  return Message;
};