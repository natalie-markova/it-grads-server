'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Conversations extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Conversations.belongsTo(models.Graduates, { foreignKey: 'graduateId', as: 'graduate' });
      Conversations.belongsTo(models.Employers, { foreignKey: 'employerId', as: 'employer' });
    }
  }
  Conversations.init({
    graduateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Graduates',
        key: 'id'
      }
    },
    employerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Employers',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Conversations',
  });
  return Conversations;
};

