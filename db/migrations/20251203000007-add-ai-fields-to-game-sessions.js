'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Добавляем поля для реального AI
    await queryInterface.addColumn('GameSessions', 'aiSolved', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      comment: 'Решил ли AI задачу'
    });

    await queryInterface.addColumn('GameSessions', 'aiCode', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Код решения AI'
    });

    await queryInterface.addColumn('GameSessions', 'aiTestsPassed', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Сколько тестов прошёл AI'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('GameSessions', 'aiSolved');
    await queryInterface.removeColumn('GameSessions', 'aiCode');
    await queryInterface.removeColumn('GameSessions', 'aiTestsPassed');
  }
};
