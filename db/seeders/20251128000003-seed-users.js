'use strict';
const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('password123', 10);

    await queryInterface.bulkInsert('Users', [
      {
        username: 'Работодатель Demo',
        email: 'employer@demo.com',
        password: hashedPassword,
        role: 'employer',
        companyName: 'Demo Company',
        companyDescription: 'Демонстрационная компания для тестирования',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        username: 'Студент Demo',
        email: 'student@demo.com',
        password: hashedPassword,
        role: 'graduate',
        firstName: 'Иван',
        lastName: 'Иванов',
        city: 'Москва',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', {
      email: { [Sequelize.Op.in]: ['employer@demo.com', 'student@demo.com'] }
    }, {});
  }
};