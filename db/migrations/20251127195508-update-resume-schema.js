'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Resumes');

    // Добавляем новые поля в таблицу Resumes только если их нет
    if (!tableInfo.pdfUrl) {
      await queryInterface.addColumn('Resumes', 'pdfUrl', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.location) {
      await queryInterface.addColumn('Resumes', 'location', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.contactInfo) {
      await queryInterface.addColumn('Resumes', 'contactInfo', {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: true
      });
    }

    // Изменяем тип поля skills на JSONB только если это TEXT
    if (tableInfo.skills && tableInfo.skills.type !== 'JSONB') {
      // Используем raw SQL для конвертации TEXT в JSONB
      await queryInterface.sequelize.query(
        'ALTER TABLE "Resumes" ALTER COLUMN "skills" TYPE JSONB USING CASE WHEN "skills" IS NULL THEN \'[]\'::jsonb ELSE "skills"::jsonb END;'
      );
    }
  },

  async down (queryInterface, Sequelize) {
    // Удаляем добавленные колонки
    await queryInterface.removeColumn('Resumes', 'pdfUrl');
    await queryInterface.removeColumn('Resumes', 'location');
    await queryInterface.removeColumn('Resumes', 'contactInfo');

    // Возвращаем skills к TEXT
    await queryInterface.changeColumn('Resumes', 'skills', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  }
};
