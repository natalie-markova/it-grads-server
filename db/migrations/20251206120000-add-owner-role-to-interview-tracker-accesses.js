'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('InterviewTrackerAccesses', 'ownerRole', {
      type: Sequelize.STRING,
      allowNull: true, // Временно разрешаем null для обратной совместимости
      comment: 'Роль владельца календаря (кто предоставляет доступ): graduate или employer'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('InterviewTrackerAccesses', 'ownerRole');
  }
};

