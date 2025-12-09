'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Resume, { foreignKey: 'userId', as: 'resumes' });
      User.hasMany(models.Vacancy, { foreignKey: 'employerId', as: 'vacancies' });
      User.hasMany(models.AIInterviewSession, { foreignKey: 'userId', as: 'aiInterviewSessions' });
      User.hasMany(models.Chat, { foreignKey: 'user1Id', as: 'chatsAsUser1' });
      User.hasMany(models.Chat, { foreignKey: 'user2Id', as: 'chatsAsUser2' });
      User.hasMany(models.Message, { foreignKey: 'senderId', as: 'sentMessages' });
      User.hasMany(models.Application, { foreignKey: 'userId', as: 'applications' });
      User.hasMany(models.Favorite, { foreignKey: 'userId', as: 'favorites' });
      User.hasMany(models.Review, { foreignKey: 'employerId', as: 'receivedReviews' });
      User.hasMany(models.Review, { foreignKey: 'userId', as: 'givenReviews' });
      // Code Battle Arena associations
      User.hasOne(models.PlayerRating, { foreignKey: 'userId', as: 'playerRating' });
      User.hasMany(models.GameSession, { foreignKey: 'userId', as: 'gameSessions' });
      User.hasMany(models.GameMatch, { foreignKey: 'player1Id', as: 'matchesAsPlayer1' });
      User.hasMany(models.GameMatch, { foreignKey: 'player2Id', as: 'matchesAsPlayer2' });
    }
  }

  User.init({
    username: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    emailVerified: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false, },
    emailVerificationToken: { type: DataTypes.STRING, allowNull: true, },
    emailVerificationExpires: { type: DataTypes.DATE, allowNull: true, },
    password: { type: DataTypes.STRING, allowNull: true },
    googleId: { type: DataTypes.STRING, allowNull: true, unique: true },
    passwordResetToken: { type: DataTypes.STRING, allowNull: true },
    passwordResetExpires: { type: DataTypes.DATE, allowNull: true },
    role: { type: DataTypes.ENUM('graduate', 'employer'), allowNull: false, defaultValue: 'graduate' },
    phone: { type: DataTypes.STRING },
    avatar: { type: DataTypes.STRING },
    companyName: { type: DataTypes.STRING, allowNull: true },
    companyDescription: { type: DataTypes.TEXT, allowNull: true },
    companyWebsite: { type: DataTypes.STRING, allowNull: true },
    companyAddress: { type: DataTypes.STRING, allowNull: true },
    companySize: { type: DataTypes.STRING, allowNull: true },
    industry: { type: DataTypes.STRING, allowNull: true },
    photo: { type: DataTypes.STRING, allowNull: true },
    lastName: { type: DataTypes.STRING, allowNull: true },
    firstName: { type: DataTypes.STRING, allowNull: true },
    middleName: { type: DataTypes.STRING, allowNull: true },
    birthDate: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    education: { type: DataTypes.TEXT, allowNull: true },
    experience: { type: DataTypes.TEXT, allowNull: true },
    about: { type: DataTypes.TEXT, allowNull: true },
    github: { type: DataTypes.STRING, allowNull: true },
    linkedin: { type: DataTypes.STRING, allowNull: true },
    portfolio: { type: DataTypes.STRING, allowNull: true },
    skills: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
    projects: { type: DataTypes.JSON, allowNull: true, defaultValue: [] }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users'
  });

  return User;
};
