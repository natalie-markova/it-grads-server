'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Favorite extends Model {
    static associate(models) {
      Favorite.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });

      Favorite.belongsTo(models.Vacancy, {
        foreignKey: 'vacancyId',
        as: 'vacancy'
      });
    }
  }

  Favorite.init({
    vacancyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Favorite',
    tableName: 'Favorites'
  });

  return Favorite;
};