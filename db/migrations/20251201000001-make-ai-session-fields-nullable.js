'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Make direction, technologies, level nullable for audio interviews
    await queryInterface.changeColumn('AIInterviewSessions', 'direction', {
      type: Sequelize.ENUM('frontend', 'backend', 'fullstack'),
      allowNull: true,
    });

    await queryInterface.changeColumn('AIInterviewSessions', 'technologies', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
      defaultValue: [],
    });

    await queryInterface.changeColumn('AIInterviewSessions', 'level', {
      type: Sequelize.ENUM('junior', 'middle', 'senior'),
      allowNull: true,
    });

    await queryInterface.changeColumn('AIInterviewSessions', 'questionsCount', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 10,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('AIInterviewSessions', 'direction', {
      type: Sequelize.ENUM('frontend', 'backend', 'fullstack'),
      allowNull: false,
    });

    await queryInterface.changeColumn('AIInterviewSessions', 'technologies', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
      defaultValue: [],
    });

    await queryInterface.changeColumn('AIInterviewSessions', 'level', {
      type: Sequelize.ENUM('junior', 'middle', 'senior'),
      allowNull: false,
    });

    await queryInterface.changeColumn('AIInterviewSessions', 'questionsCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 10,
    });
  },
};