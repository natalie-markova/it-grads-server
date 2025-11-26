'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Vacancies', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      employerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      requirements: {
        type: Sequelize.TEXT
      },
      salary: {
        type: Sequelize.INTEGER
      },
      location: {
        type: Sequelize.STRING
      },
      employmentType: {
        type: Sequelize.ENUM('full-time', 'part-time', 'contract', 'internship'),
        defaultValue: 'full-time'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('Vacancies', ['employerId']);
    await queryInterface.addIndex('Vacancies', ['isActive']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Vacancies');
  }
};