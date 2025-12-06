"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class InterviewTrackerAccess extends Model {
    static associate(models) {
      // Связь с выпускником (владелец календаря)
      InterviewTrackerAccess.belongsTo(models.User, {
        foreignKey: "graduateId",
        as: "graduate",
      });

      // Связь с работодателем (компания с доступом)
      InterviewTrackerAccess.belongsTo(models.User, {
        foreignKey: "employerId",
        as: "employer",
      });
    }
  }

  InterviewTrackerAccess.init(
    {
      graduateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
      },
      employerId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Может быть null для обратной совместимости
        references: {
          model: "Users",
          key: "id",
        },
      },
      companyName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      ownerRole: {
        type: DataTypes.STRING,
        allowNull: true, // Временно разрешаем null для обратной совместимости
        comment: 'Роль владельца календаря (кто предоставляет доступ): graduate или employer'
      },
    },
    {
      sequelize,
      modelName: "InterviewTrackerAccess",
      tableName: "InterviewTrackerAccesses",
    }
  );

  return InterviewTrackerAccess;
};






