'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('InterviewTrackers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      employerId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID работодателя для синхронизации'
      },
      vacancyId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Vacancies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      company: {
        type: Sequelize.STRING,
        allowNull: false
      },
      position: {
        type: Sequelize.STRING,
        allowNull: false
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      time: {
        type: Sequelize.STRING(5),
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('online', 'offline', 'phone'),
        defaultValue: 'online'
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'completed', 'cancelled'),
        defaultValue: 'scheduled'
      },
      location: {
        type: Sequelize.STRING,
        allowNull: true
      },
      meetingLink: {
        type: Sequelize.STRING,
        allowNull: true
      },
      contactPerson: {
        type: Sequelize.STRING,
        allowNull: true
      },
      contactPhone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      reminder: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      result: {
        type: Sequelize.ENUM('passed', 'failed', 'pending'),
        allowNull: true
      },
      feedback: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      employerConfirmed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Подтверждено ли собеседование работодателем'
      },
      employerNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Заметки от работодателя'
      },
      sharedWithEmployer: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Открыт ли доступ работодателю'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Индексы для оптимизации запросов
    await queryInterface.addIndex('InterviewTrackers', ['userId']);
    await queryInterface.addIndex('InterviewTrackers', ['employerId']);
    await queryInterface.addIndex('InterviewTrackers', ['date']);
    await queryInterface.addIndex('InterviewTrackers', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('InterviewTrackers');
  }
};
