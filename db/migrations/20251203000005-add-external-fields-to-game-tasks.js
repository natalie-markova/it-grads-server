'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Добавляем поля для внешних источников задач
    await queryInterface.addColumn('GameTasks', 'externalId', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
      comment: 'External ID from source (e.g., cf-1234-A)'
    });

    await queryInterface.addColumn('GameTasks', 'externalSource', {
      type: Sequelize.ENUM('local', 'codeforces', 'leetcode', 'hackerrank'),
      defaultValue: 'local',
      comment: 'Source of the task'
    });

    await queryInterface.addColumn('GameTasks', 'externalRating', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Original rating from external source'
    });

    await queryInterface.addColumn('GameTasks', 'externalUrl', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'URL to original problem'
    });

    // Индекс для быстрого поиска по externalId
    await queryInterface.addIndex('GameTasks', ['externalId'], {
      name: 'game_tasks_external_id_idx'
    });

    // Индекс для поиска по источнику
    await queryInterface.addIndex('GameTasks', ['externalSource'], {
      name: 'game_tasks_external_source_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('GameTasks', 'game_tasks_external_source_idx');
    await queryInterface.removeIndex('GameTasks', 'game_tasks_external_id_idx');
    await queryInterface.removeColumn('GameTasks', 'externalUrl');
    await queryInterface.removeColumn('GameTasks', 'externalRating');
    await queryInterface.removeColumn('GameTasks', 'externalSource');
    await queryInterface.removeColumn('GameTasks', 'externalId');
  }
};