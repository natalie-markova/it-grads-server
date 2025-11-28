'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('AIInterviewSessions', 'strengths', {
      type: Sequelize.ARRAY(Sequelize.TEXT),
      allowNull: true,
      defaultValue: []
    });

    await queryInterface.addColumn('AIInterviewSessions', 'weaknesses', {
      type: Sequelize.ARRAY(Sequelize.TEXT),
      allowNull: true,
      defaultValue: []
    });

    await queryInterface.addColumn('AIInterviewSessions', 'detailedFeedback', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('AIInterviewSessions', 'strengths');
    await queryInterface.removeColumn('AIInterviewSessions', 'weaknesses');
    await queryInterface.removeColumn('AIInterviewSessions', 'detailedFeedback');
  }
};
