'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Review extends Model {
    static associate(models) {
      Review.belongsTo(models.User, {
        foreignKey: 'employerId',
        as: 'employer'
      });

      Review.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'reviewer'
      });
    }
  }

  Review.init({
    employerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    comment: {
      type: DataTypes.TEXT
    }
  }, {
    sequelize,
    modelName: 'Review',
    tableName: 'Reviews'
  });

  return Review;
};