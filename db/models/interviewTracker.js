"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class InterviewTracker extends Model {
    static associate(models) {
      // Связь с выпускником (владелец записи)
      InterviewTracker.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
      });

      // Связь с работодателем (для синхронизации)
      InterviewTracker.belongsTo(models.User, {
        foreignKey: "employerId",
        as: "employer",
      });

      // Связь с выпускником (для записей работодателя)
      InterviewTracker.belongsTo(models.User, {
        foreignKey: "graduateId",
        as: "graduate",
      });

      // Связь с привязанным собеседованием
      InterviewTracker.belongsTo(models.InterviewTracker, {
        foreignKey: "linkedInterviewId",
        as: "linkedInterview",
      });

      // Связь с вакансией (опционально)
      InterviewTracker.belongsTo(models.Vacancy, {
        foreignKey: "vacancyId",
        as: "vacancy",
      });
    }
  }

  InterviewTracker.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
      },
      employerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Users",
          key: "id",
        },
        comment: "ID работодателя для синхронизации",
      },
      graduateId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Users",
          key: "id",
        },
        comment: "ID выпускника (для записей работодателя)",
      },
      linkedInterviewId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "InterviewTrackers",
          key: "id",
        },
        comment: "ID связанного собеседования (синхронизация)",
      },
      vacancyId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Vacancies",
          key: "id",
        },
      },
      company: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      position: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      time: {
        type: DataTypes.STRING(5),
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM("online", "offline", "phone"),
        defaultValue: "online",
      },
      status: {
        type: DataTypes.ENUM("scheduled", "completed", "cancelled"),
        defaultValue: "scheduled",
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      meetingLink: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      contactPerson: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      contactPhone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reminder: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      result: {
        type: DataTypes.ENUM("passed", "failed", "pending"),
        allowNull: true,
      },
      feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Поля для синхронизации с работодателем
      employerConfirmed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Подтверждено ли собеседование работодателем",
      },
      employerNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Заметки от работодателя",
      },
      sharedWithEmployer: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Открыт ли доступ работодателю",
      },
      // Статус приглашения (для собеседований от работодателя)
      invitationStatus: {
        type: DataTypes.ENUM("none", "pending", "accepted", "declined"),
        defaultValue: "none",
        comment: "Статус приглашения: none - обычная запись, pending - ожидает ответа, accepted - принято, declined - отклонено",
      },
    },
    {
      sequelize,
      modelName: "InterviewTracker",
      tableName: "InterviewTrackers",
    }
  );

  return InterviewTracker;
};





