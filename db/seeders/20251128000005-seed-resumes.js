'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const names = [
      'Алексей Петров', 'Мария Иванова', 'Дмитрий Смирнов', 'Анна Кузнецова', 'Сергей Попов',
      'Елена Соколова', 'Михаил Лебедев', 'Ольга Козлова', 'Андрей Новиков', 'Татьяна Морозова',
      'Владимир Волков', 'Наталья Соловьева', 'Игорь Васильев', 'Екатерина Зайцева', 'Павел Федоров',
      'Ирина Михайлова', 'Артем Григорьев', 'Юлия Семенова', 'Константин Давыдов', 'Светлана Егорова',
      'Максим Борисов', 'Виктория Романова', 'Илья Яковлев', 'Анастасия Николаева', 'Денис Захаров'
    ];

    const positions = [
      'Frontend разработчик',
      'Backend разработчик',
      'Full Stack разработчик',
      'DevOps инженер',
      'QA инженер',
      'Mobile разработчик',
      'Data Analyst',
      'UI/UX дизайнер',
      'Python разработчик',
      'React разработчик'
    ];

    const skillSets = [
      ['JavaScript', 'React', 'TypeScript', 'HTML', 'CSS', 'Redux', 'Webpack'],
      ['Node.js', 'Express', 'PostgreSQL', 'MongoDB', 'Docker', 'REST API', 'GraphQL'],
      ['Python', 'Django', 'Flask', 'PostgreSQL', 'Redis', 'Celery', 'Docker'],
      ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'MongoDB', 'Git', 'Docker'],
      ['Docker', 'Kubernetes', 'CI/CD', 'Linux', 'AWS', 'Terraform', 'Ansible'],
      ['Selenium', 'Python', 'Jest', 'Cypress', 'Postman', 'API Testing', 'Git'],
      ['Swift', 'SwiftUI', 'UIKit', 'Core Data', 'REST API', 'Git', 'Xcode'],
      ['Kotlin', 'Java', 'Android SDK', 'Jetpack Compose', 'Room', 'Retrofit'],
      ['Python', 'Pandas', 'SQL', 'Tableau', 'Power BI', 'Excel', 'Statistics'],
      ['Figma', 'Adobe XD', 'Sketch', 'Photoshop', 'Prototyping', 'User Research']
    ];

    const descriptions = [
      'Опытный разработчик с passion к созданию качественных продуктов. Люблю изучать новые технологии и делиться знаниями с командой.',
      'Профессионал с фокусом на производительность и качество кода. Имею опыт работы в стартапах и крупных компаниях.',
      'Целеустремленный специалист, ориентированный на результат. Быстро обучаюсь и адаптируюсь к новым технологиям.',
      'Коммуникабельный разработчик с сильными техническими навыками. Ищу возможность для профессионального роста.',
      'Креативный подход к решению задач. Опыт работы в Agile командах и ведения проектов от идеи до релиза.'
    ];

    const experiences = [
      'Работал в компании "TechCorp" над разработкой высоконагруженных систем. Участвовал в оптимизации производительности, что позволило увеличить скорость работы приложения на 40%.',
      'Опыт работы в стартапе "InnovateLab". Разрабатывал MVP продукта с нуля, работал напрямую с заказчиками и product owner.',
      'В компании "DataSystems" занимался разработкой микросервисной архитектуры. Внедрил CI/CD процессы и контейнеризацию.',
      'Работал в международной команде над enterprise решением. Опыт code review, менторства junior разработчиков.',
      'Фриланс проекты для различных клиентов. Опыт работы с удаленными командами и самостоятельная организация рабочего процесса.'
    ];

    const educations = [
      'МГУ, Факультет Вычислительной Математики и Кибернетики, 2020',
      'СПбГУ, Прикладная математика и информатика, 2019',
      'МФТИ, Информатика и вычислительная техника, 2021',
      'НГУ, Программная инженерия, 2018',
      'Высшая школа экономики, Программирование, 2022',
      'ИТМО, Информационные технологии, 2020',
      'Курсы от Яндекс.Практикум, Full Stack разработчик, 2021',
      'GeekBrains, Frontend разработчик, 2020'
    ];

    const portfolios = [
      'GitHub: github.com/developer, Pet-проект: интернет-магазин на React + Node.js',
      'Портфолио: portfolio.com, Разработал несколько мобильных приложений с 10k+ скачиваний',
      'GitHub: github.com/coder, Контрибьютор в Open Source проекты (React, Vue)',
      'Личный сайт: mysite.com, Блог о программировании с техническими статьями',
      'Behance: behance.net/designer, Портфолио UI/UX проектов для различных индустрий'
    ];

    const locations = [
      'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
      'Нижний Новгород', 'Красноярск', 'Челябинск', 'Самара', 'Уфа', 'Удаленно'
    ];

    const levels = ['junior', 'middle', 'senior'];

    // Get one graduate user to associate resumes with
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE role = 'graduate' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    let userId = 1; // Default fallback
    if (users.length > 0) {
      userId = users[0].id;
    }

    const resumes = [];

    for (let i = 0; i < 100; i++) {
      const position = positions[i % positions.length];
      const skillSet = skillSets[i % skillSets.length];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const location = locations[i % locations.length];

      let salaryMultiplier = 1;
      if (level === 'junior') salaryMultiplier = 1;
      else if (level === 'middle') salaryMultiplier = 2;
      else if (level === 'senior') salaryMultiplier = 3;

      const baseSalary = Math.floor(Math.random() * 40000) + 60000;
      const desiredSalary = Math.floor(baseSalary * salaryMultiplier);

      resumes.push({
        userId,
        title: `${position} (${level})`,
        description: descriptions[i % descriptions.length],
        skills: JSON.stringify(skillSet), // Convert to JSON for jsonb field
        skillsArray: JSON.stringify(skillSet),
        experience: experiences[i % experiences.length],
        education: educations[i % educations.length],
        portfolio: portfolios[i % portfolios.length],
        desiredSalary,
        location,
        level,
        isActive: Math.random() > 0.15, // 85% active
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await queryInterface.bulkInsert('Resumes', resumes, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Resumes', null, {});
  }
};
