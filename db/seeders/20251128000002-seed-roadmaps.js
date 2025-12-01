'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const roadmapsData = [
      // Frontend Developer
      {
        title: 'Frontend разработчик',
        slug: 'frontend-developer',
        category: 'role',
        description: 'Научитесь создавать современные веб-интерфейсы с использованием HTML, CSS, JavaScript и популярных фреймворков.',
        icon: '💻',
        color: '#3B82F6',
        difficulty: 'beginner',
        estimatedMonths: 6,
        prerequisites: JSON.stringify([
          'Базовые знания компьютера',
          'Английский язык на уровне чтения документации'
        ]),
        learningPath: JSON.stringify([
          {
            title: 'Основы веб-разработки',
            description: 'Изучите HTML и CSS для создания структуры и стилизации веб-страниц',
            topics: ['HTML5', 'CSS3', 'Flexbox', 'Grid', 'Responsive Design']
          },
          {
            title: 'JavaScript основы',
            description: 'Освойте основы программирования на JavaScript',
            topics: ['Переменные и типы данных', 'Функции', 'Массивы и объекты', 'DOM манипуляции', 'События']
          },
          {
            title: 'Современный JavaScript',
            description: 'Изучите ES6+ возможности и асинхронное программирование',
            topics: ['ES6+', 'Promises', 'Async/Await', 'Модули', 'Деструктуризация']
          },
          {
            title: 'React или Vue.js',
            description: 'Освойте популярный фреймворк для создания интерактивных интерфейсов',
            topics: ['Компоненты', 'State и Props', 'Хуки', 'Роутинг', 'Управление состоянием']
          },
          {
            title: 'Инструменты разработки',
            description: 'Научитесь использовать современные инструменты frontend разработки',
            topics: ['Git', 'npm/yarn', 'Webpack/Vite', 'ESLint', 'Prettier']
          }
        ]),
        resources: JSON.stringify([
          { title: 'MDN Web Docs', url: 'https://developer.mozilla.org', type: 'documentation' },
          { title: 'JavaScript.info', url: 'https://javascript.info', type: 'course' },
          { title: 'React документация', url: 'https://react.dev', type: 'documentation' }
        ]),
        relatedRoadmaps: JSON.stringify(['JavaScript', 'React', 'Vue.js']),
        popularityScore: 95
      },

      // Backend Developer
      {
        title: 'Backend разработчик',
        slug: 'backend-developer',
        category: 'role',
        description: 'Создавайте серверную логику, API и работайте с базами данных для веб-приложений.',
        icon: '⚙️',
        color: '#10B981',
        difficulty: 'intermediate',
        estimatedMonths: 8,
        prerequisites: JSON.stringify([
          'Базовые знания программирования',
          'Понимание принципов работы веб-приложений'
        ]),
        learningPath: JSON.stringify([
          {
            title: 'Выбор языка программирования',
            description: 'Освойте один из популярных backend языков',
            topics: ['Node.js', 'Python', 'Java', 'C#', 'Go']
          },
          {
            title: 'Основы баз данных',
            description: 'Изучите работу с реляционными и NoSQL базами данных',
            topics: ['SQL', 'PostgreSQL', 'MongoDB', 'Redis', 'ORM']
          },
          {
            title: 'RESTful API',
            description: 'Научитесь проектировать и создавать REST API',
            topics: ['HTTP методы', 'Статус коды', 'Аутентификация', 'CRUD операции']
          },
          {
            title: 'Безопасность',
            description: 'Освойте основы веб-безопасности',
            topics: ['HTTPS', 'JWT', 'OAuth', 'XSS', 'CSRF', 'SQL Injection']
          },
          {
            title: 'Развертывание и DevOps',
            description: 'Научитесь деплоить и поддерживать приложения',
            topics: ['Docker', 'CI/CD', 'AWS/Azure', 'Nginx', 'Мониторинг']
          }
        ]),
        resources: JSON.stringify([
          { title: 'Node.js документация', url: 'https://nodejs.org/docs', type: 'documentation' },
          { title: 'PostgreSQL Tutorial', url: 'https://www.postgresqltutorial.com', type: 'course' }
        ]),
        relatedRoadmaps: JSON.stringify(['Node.js', 'Python', 'PostgreSQL']),
        popularityScore: 90
      },

      // Full Stack Developer
      {
        title: 'Full Stack разработчик',
        slug: 'fullstack-developer',
        category: 'role',
        description: 'Станьте универсальным разработчиком, способным работать как с frontend, так и с backend.',
        icon: '🚀',
        color: '#8B5CF6',
        difficulty: 'advanced',
        estimatedMonths: 12,
        prerequisites: JSON.stringify([
          'Опыт в frontend или backend разработке',
          'Знание JavaScript'
        ]),
        learningPath: JSON.stringify([
          {
            title: 'Frontend технологии',
            description: 'Освойте современный frontend стек',
            topics: ['React/Vue', 'TypeScript', 'State Management', 'CSS Frameworks']
          },
          {
            title: 'Backend технологии',
            description: 'Изучите серверную разработку',
            topics: ['Node.js/Express', 'REST API', 'GraphQL', 'Базы данных']
          },
          {
            title: 'DevOps практики',
            description: 'Научитесь деплоить полноценные приложения',
            topics: ['Docker', 'Kubernetes', 'CI/CD', 'Cloud сервисы']
          },
          {
            title: 'Архитектура приложений',
            description: 'Понимание проектирования сложных систем',
            topics: ['Микросервисы', 'Паттерны проектирования', 'Масштабирование']
          }
        ]),
        resources: JSON.stringify([
          { title: 'Full Stack Open', url: 'https://fullstackopen.com', type: 'course' }
        ]),
        relatedRoadmaps: JSON.stringify(['Frontend разработчик', 'Backend разработчик']),
        popularityScore: 85
      },

      // JavaScript
      {
        title: 'JavaScript',
        slug: 'javascript',
        category: 'language',
        description: 'Освойте самый популярный язык программирования для веб-разработки.',
        icon: '📜',
        color: '#D4B800',
        difficulty: 'beginner',
        estimatedMonths: 4,
        prerequisites: JSON.stringify([
          'Базовое понимание HTML и CSS'
        ]),
        learningPath: JSON.stringify([
          {
            title: 'Основы синтаксиса',
            description: 'Изучите базовые конструкции языка',
            topics: ['Переменные', 'Типы данных', 'Операторы', 'Условия', 'Циклы']
          },
          {
            title: 'Функции и область видимости',
            description: 'Понимание функций и замыканий',
            topics: ['Function Declaration', 'Arrow Functions', 'Closure', 'this', 'call/apply/bind']
          },
          {
            title: 'Объекты и прототипы',
            description: 'ООП в JavaScript',
            topics: ['Объекты', 'Прототипы', 'Классы', 'Наследование']
          },
          {
            title: 'Асинхронность',
            description: 'Работа с асинхронным кодом',
            topics: ['Callbacks', 'Promises', 'Async/Await', 'Event Loop']
          },
          {
            title: 'ES6+ фичи',
            description: 'Современные возможности JavaScript',
            topics: ['Деструктуризация', 'Spread/Rest', 'Модули', 'Template Literals']
          }
        ]),
        resources: JSON.stringify([
          { title: 'JavaScript.info', url: 'https://javascript.info', type: 'course' },
          { title: 'MDN JavaScript', url: 'https://developer.mozilla.org/ru/docs/Web/JavaScript', type: 'documentation' }
        ]),
        relatedRoadmaps: JSON.stringify(['TypeScript', 'Node.js']),
        popularityScore: 100
      },

      // Python
      {
        title: 'Python',
        slug: 'python',
        category: 'language',
        description: 'Изучите универсальный язык программирования для веб-разработки, data science и автоматизации.',
        icon: '🐍',
        color: '#3776AB',
        difficulty: 'beginner',
        estimatedMonths: 5,
        prerequisites: JSON.stringify([
          'Базовая компьютерная грамотность'
        ]),
        learningPath: JSON.stringify([
          {
            title: 'Основы Python',
            description: 'Синтаксис и базовые концепции',
            topics: ['Переменные', 'Типы данных', 'Списки', 'Словари', 'Условия и циклы']
          },
          {
            title: 'Функции и модули',
            description: 'Организация кода',
            topics: ['Функции', 'Lambda', 'Декораторы', 'Модули', 'Пакеты']
          },
          {
            title: 'ООП в Python',
            description: 'Объектно-ориентированное программирование',
            topics: ['Классы', 'Наследование', 'Инкапсуляция', 'Полиморфизм']
          },
          {
            title: 'Работа с данными',
            description: 'Библиотеки для работы с файлами и данными',
            topics: ['File I/O', 'JSON', 'CSV', 'Regular Expressions']
          },
          {
            title: 'Веб-разработка на Python',
            description: 'Фреймворки для создания веб-приложений',
            topics: ['Django', 'Flask', 'FastAPI', 'SQLAlchemy']
          }
        ]),
        resources: JSON.stringify([
          { title: 'Python.org Tutorial', url: 'https://docs.python.org/3/tutorial/', type: 'documentation' },
          { title: 'Real Python', url: 'https://realpython.com', type: 'course' }
        ]),
        relatedRoadmaps: JSON.stringify(['Django', 'Data Science']),
        popularityScore: 92
      },

      // React
      {
        title: 'React',
        slug: 'react',
        category: 'framework',
        description: 'Освойте самую популярную библиотеку для создания пользовательских интерфейсов.',
        icon: '⚛️',
        color: '#4AB8D9',
        difficulty: 'intermediate',
        estimatedMonths: 4,
        prerequisites: JSON.stringify([
          'Хорошее знание JavaScript',
          'Понимание HTML и CSS'
        ]),
        learningPath: JSON.stringify([
          {
            title: 'Основы React',
            description: 'Компоненты и JSX',
            topics: ['JSX', 'Компоненты', 'Props', 'State', 'События']
          },
          {
            title: 'React Hooks',
            description: 'Современный подход к React',
            topics: ['useState', 'useEffect', 'useContext', 'useRef', 'Custom Hooks']
          },
          {
            title: 'Управление состоянием',
            description: 'State management решения',
            topics: ['Context API', 'Redux', 'Zustand', 'React Query']
          },
          {
            title: 'Роутинг',
            description: 'Навигация в React приложениях',
            topics: ['React Router', 'Динамические маршруты', 'Protected routes']
          },
          {
            title: 'Оптимизация',
            description: 'Производительность React приложений',
            topics: ['Memo', 'useMemo', 'useCallback', 'Code Splitting', 'Lazy Loading']
          }
        ]),
        resources: JSON.stringify([
          { title: 'React Docs', url: 'https://react.dev', type: 'documentation' },
          { title: 'Epic React', url: 'https://epicreact.dev', type: 'course' }
        ]),
        relatedRoadmaps: JSON.stringify(['JavaScript', 'TypeScript', 'Frontend разработчик']),
        popularityScore: 98
      },

      // DevOps Engineer
      {
        title: 'DevOps инженер',
        slug: 'devops-engineer',
        category: 'role',
        description: 'Научитесь автоматизировать развертывание и поддержку приложений в продакшене.',
        icon: '🔧',
        color: '#D94A4A',
        difficulty: 'advanced',
        estimatedMonths: 10,
        prerequisites: JSON.stringify([
          'Опыт работы с Linux',
          'Базовые знания сетей',
          'Знание любого языка программирования'
        ]),
        learningPath: JSON.stringify([
          {
            title: 'Linux и командная строка',
            description: 'Работа с операционной системой',
            topics: ['Bash', 'File System', 'Processes', 'Networking', 'SSH']
          },
          {
            title: 'Контейнеризация',
            description: 'Docker и оркестрация',
            topics: ['Docker', 'Dockerfile', 'Docker Compose', 'Kubernetes', 'Helm']
          },
          {
            title: 'CI/CD',
            description: 'Автоматизация развертывания',
            topics: ['GitLab CI', 'GitHub Actions', 'Jenkins', 'ArgoCD']
          },
          {
            title: 'Infrastructure as Code',
            description: 'Управление инфраструктурой через код',
            topics: ['Terraform', 'Ansible', 'CloudFormation']
          },
          {
            title: 'Мониторинг и логирование',
            description: 'Наблюдение за системами',
            topics: ['Prometheus', 'Grafana', 'ELK Stack', 'Logging']
          }
        ]),
        resources: JSON.stringify([
          { title: 'Docker Documentation', url: 'https://docs.docker.com', type: 'documentation' },
          { title: 'Kubernetes Docs', url: 'https://kubernetes.io/docs', type: 'documentation' }
        ]),
        relatedRoadmaps: JSON.stringify(['Linux', 'Docker', 'Kubernetes']),
        popularityScore: 88
      },

      // Data Scientist
      {
        title: 'Data Scientist',
        slug: 'data-scientist',
        category: 'role',
        description: 'Анализируйте данные и создавайте модели машинного обучения.',
        icon: '📊',
        color: '#D97B00',
        difficulty: 'advanced',
        estimatedMonths: 12,
        prerequisites: JSON.stringify([
          'Математика (статистика, линейная алгебра)',
          'Программирование на Python'
        ]),
        learningPath: JSON.stringify([
          {
            title: 'Python для Data Science',
            description: 'Библиотеки для работы с данными',
            topics: ['NumPy', 'Pandas', 'Matplotlib', 'Seaborn']
          },
          {
            title: 'Математика и статистика',
            description: 'Математические основы',
            topics: ['Статистика', 'Линейная алгебра', 'Теория вероятностей']
          },
          {
            title: 'Machine Learning',
            description: 'Алгоритмы машинного обучения',
            topics: ['Scikit-learn', 'Регрессия', 'Классификация', 'Кластеризация']
          },
          {
            title: 'Deep Learning',
            description: 'Нейронные сети',
            topics: ['TensorFlow', 'PyTorch', 'CNN', 'RNN', 'Transformers']
          },
          {
            title: 'Big Data',
            description: 'Работа с большими данными',
            topics: ['Spark', 'Hadoop', 'SQL', 'NoSQL']
          }
        ]),
        resources: JSON.stringify([
          { title: 'Kaggle Learn', url: 'https://www.kaggle.com/learn', type: 'course' },
          { title: 'Fast.ai', url: 'https://www.fast.ai', type: 'course' }
        ]),
        relatedRoadmaps: JSON.stringify(['Python', 'Machine Learning']),
        popularityScore: 87
      }
    ];

    await queryInterface.bulkInsert('Roadmaps', roadmapsData.map(roadmap => ({
      ...roadmap,
      createdAt: new Date(),
      updatedAt: new Date()
    })), {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Roadmaps', null, {});
  }
};
