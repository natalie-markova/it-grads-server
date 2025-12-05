'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Добавляем graduateId
    await queryInterface.addColumn('InterviewTrackers', 'graduateId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID выпускника (для записей работодателя)',
    });

    // Добавляем linkedInterviewId
    await queryInterface.addColumn('InterviewTrackers', 'linkedInterviewId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'InterviewTrackers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID связанного собеседования (синхронизация)',
    });

    // Создаем индексы
    await queryInterface.addIndex('InterviewTrackers', ['graduateId']);
    await queryInterface.addIndex('InterviewTrackers', ['linkedInterviewId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('InterviewTrackers', 'graduateId');
    await queryInterface.removeColumn('InterviewTrackers', 'linkedInterviewId');
  },
};
