'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const companies = [
      'Яндекс', 'Сбер', 'VK', 'Авито', 'Тинькофф', 'Ozon', 'Wildberries', 'Kaspersky',
      'ЦИАН', 'Lamoda', 'Delivery Club', 'СберМаркет', 'Ростелеком', 'МТС', 'Мегафон',
      'Билайн', 'X5 Group', 'Газпромбанк', 'ВТБ', 'Альфа-Банк', 'Райффайзенбанк',
      'Mail.ru', 'JetBrains', 'Skyeng', 'Нетология', 'GeekBrains', 'Skillbox',
      'Рамблер', 'Okko', 'Kinopoisk', 'Dodo Pizza', 'Рокет', 'Ситимобил'
    ];

    const positions = [
      { title: 'Frontend Developer', skills: ['JavaScript', 'React', 'TypeScript', 'HTML', 'CSS'] },
      { title: 'Backend Developer', skills: ['Node.js', 'Python', 'PostgreSQL', 'REST API', 'Docker'] },
      { title: 'Full Stack Developer', skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Git'] },
      { title: 'DevOps Engineer', skills: ['Docker', 'Kubernetes', 'CI/CD', 'Linux', 'AWS'] },
      { title: 'QA Engineer', skills: ['Selenium', 'Python', 'API Testing', 'Git', 'SQL'] },
      { title: 'Mobile Developer (iOS)', skills: ['Swift', 'SwiftUI', 'Xcode', 'REST API', 'Git'] },
      { title: 'Mobile Developer (Android)', skills: ['Kotlin', 'Java', 'Android SDK', 'REST API', 'Git'] },
      { title: 'Data Analyst', skills: ['Python', 'SQL', 'Tableau', 'Excel', 'Statistics'] },
      { title: 'Data Scientist', skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL', 'Statistics'] },
      { title: 'UI/UX Designer', skills: ['Figma', 'Adobe XD', 'Photoshop', 'Prototyping', 'User Research'] },
      { title: 'Product Manager', skills: ['Agile', 'Jira', 'Analytics', 'Product Strategy', 'Communication'] },
      { title: 'Project Manager', skills: ['Agile', 'Scrum', 'Jira', 'Communication', 'Leadership'] },
      { title: 'System Analyst', skills: ['UML', 'BPMN', 'SQL', 'Requirements', 'Documentation'] },
      { title: 'Database Administrator', skills: ['PostgreSQL', 'MySQL', 'Backup', 'Performance Tuning', 'Security'] },
      { title: 'Security Engineer', skills: ['Network Security', 'Penetration Testing', 'Linux', 'Python', 'Cryptography'] }
    ];

    const locations = [
      'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
      'Нижний Новгород', 'Красноярск', 'Челябинск', 'Самара', 'Уфа',
      'Ростов-на-Дону', 'Краснодар', 'Омск', 'Воронеж', 'Пермь', 'Удаленно'
    ];

    const levels = ['junior', 'middle', 'senior', 'lead'];
    const employmentTypes = ['full-time', 'part-time', 'contract'];

    const descriptions = [
      'В нашей команде мы создаем инновационные продукты, которые используют миллионы пользователей. Мы ищем талантливого специалиста для работы над амбициозными проектами.',
      'Присоединяйтесь к нашей динамичной команде разработки! Мы работаем с современными технологиями и постоянно развиваемся.',
      'Ищем профессионала для работы над крупным проектом. У нас дружная команда, интересные задачи и возможности для роста.',
      'Компания является лидером в своей области. Предлагаем работу над высоконагруженными системами с миллионами пользователей.',
      'Мы молодая и амбициозная компания. Ищем специалиста, который хочет расти вместе с нами и влиять на продукт.',
      'Работа в офисе с комфортными условиями труда. Дружная команда, интересные задачи, современный стек технологий.'
    ];

    const requirements = [
      'Опыт коммерческой разработки, знание современных технологий, умение работать в команде.',
      'Уверенное знание профессионального стека, опыт работы с Git, понимание принципов ООП.',
      'Опыт разработки от 1 года, знание паттернов проектирования, опыт работы в Agile.',
      'Высшее техническое образование, желание развиваться, умение быстро обучаться.',
      'Портфолио проектов, знание английского языка на уровне чтения документации.',
      'Опыт работы с API, понимание принципов RESTful, знание SQL и реляционных БД.'
    ];

    const benefits = [
      'ДМС, корпоративное обучение, гибкий график',
      'Оплачиваемые курсы и конференции, спортзал, питание в офисе',
      'Возможность удаленной работы, оплата больничных, бонусы за проекты',
      'Современный офис, кухня с фруктами, тимбилдинги',
      'Компенсация обучения, карьерный рост, дружная команда',
      'Бесплатный обед, парковка, корпоративный транспорт'
    ];

    // Get one employer user to associate vacancies with
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE role = 'employer' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    let employerId = 1; // Default fallback
    if (users.length > 0) {
      employerId = users[0].id;
    }

    const vacancies = [];

    for (let i = 0; i < 200; i++) {
      const position = positions[i % positions.length];
      const company = companies[i % companies.length];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const employmentType = employmentTypes[Math.floor(Math.random() * employmentTypes.length)];
      const location = locations[i % locations.length];

      let salaryMultiplier = 1;
      if (level === 'junior') salaryMultiplier = 1;
      else if (level === 'middle') salaryMultiplier = 1.8;
      else if (level === 'senior') salaryMultiplier = 2.8;
      else if (level === 'lead') salaryMultiplier = 3.8;

      const baseSalary = Math.floor(Math.random() * 50000) + 80000;
      const salary = Math.floor(baseSalary * salaryMultiplier);

      vacancies.push({
        employerId,
        companyName: company,
        title: `${position.title} (${level})`,
        description: descriptions[i % descriptions.length],
        requirements: requirements[i % requirements.length],
        salary,
        location,
        employmentType,
        level,
        skills: JSON.stringify(position.skills),
        benefits: benefits[i % benefits.length],
        isActive: Math.random() > 0.1, // 90% active
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await queryInterface.bulkInsert('Vacancies', vacancies, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Vacancies', null, {});
  }
};
