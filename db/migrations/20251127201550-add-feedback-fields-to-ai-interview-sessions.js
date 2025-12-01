'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('AIInterviewSessions');

    if (!tableInfo.strengths) {
      await queryInterface.addColumn('AIInterviewSessions', 'strengths', {
        type: Sequelize.ARRAY(Sequelize.TEXT),
        allowNull: true,
        defaultValue: []
      });
    }

    if (!tableInfo.weaknesses) {
      await queryInterface.addColumn('AIInterviewSessions', 'weaknesses', {
        type: Sequelize.ARRAY(Sequelize.TEXT),
        allowNull: true,
        defaultValue: []
      });
    }

    if (!tableInfo.detailedFeedback) {
      await queryInterface.addColumn('AIInterviewSessions', 'detailedFeedback', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
  },

  async down (queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('AIInterviewSessions');
    if (tableInfo.strengths) await queryInterface.removeColumn('AIInterviewSessions', 'strengths');
    if (tableInfo.weaknesses) await queryInterface.removeColumn('AIInterviewSessions', 'weaknesses');
    if (tableInfo.detailedFeedback) await queryInterface.removeColumn('AIInterviewSessions', 'detailedFeedback');
  }
};
