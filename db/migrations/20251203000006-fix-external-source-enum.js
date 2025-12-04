'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Добавляем новые значения в ENUM если они еще не существуют
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_GameTasks_externalSource" ADD VALUE IF NOT EXISTS 'codeforces';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_GameTasks_externalSource" ADD VALUE IF NOT EXISTS 'leetcode';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_GameTasks_externalSource" ADD VALUE IF NOT EXISTS 'hackerrank';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  },

  async down(queryInterface, Sequelize) {
    // ENUM values cannot be easily removed in PostgreSQL
  }
};
