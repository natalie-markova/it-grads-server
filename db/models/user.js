'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // User has many Resumes (for graduates)
      User.hasMany(models.Resume, {
        foreignKey: 'userId',
        as: 'resumes'
      });

      // User has many Vacancies (for employers)
      User.hasMany(models.Vacancy, {
        foreignKey: 'employerId',
        as: 'vacancies'
      });

      User.hasMany(models.AIInterviewSession, {
        foreignKey: 'userId',
        as: 'aiInterviewSessions'
      });

      // User has many Chats
      User.hasMany(models.Chat, {
        foreignKey: 'user1Id',
        as: 'chatsAsUser1'
      });

      User.hasMany(models.Chat, {
        foreignKey: 'user2Id',
        as: 'chatsAsUser2'
      });

      // User has many Messages
      User.hasMany(models.Message, {
        foreignKey: 'senderId',
        as: 'sentMessages'
      });
    }
  }

  User.init({
    username: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('graduate', 'employer'),
      allowNull: false,
      defaultValue: 'graduate'
    },
    phone: {
      type: DataTypes.STRING
    },
    avatar: {
      type: DataTypes.STRING
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    companyDescription: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    companyWebsite: {
      type: DataTypes.STRING,
      allowNull: true
    },
    companyAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    companySize: {
      type: DataTypes.STRING,
      allowNull: true
    },
    industry: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users'
  });

  return User;
};