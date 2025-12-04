'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const roadmapsData = [
      // Frontend Developer
      {
        title: 'Frontend разработчик',
        titleEn: 'Frontend Developer',
        slug: 'frontend-developer',
        category: 'role',
        description: 'Научитесь создавать современные веб-интерфейсы с использованием HTML, CSS, JavaScript и популярных фреймворков.',
        descriptionEn: 'Learn to create modern web interfaces using HTML, CSS, JavaScript and popular frameworks.',
        icon: '💻',
        color: '#3B82F6',
        difficulty: 'beginner',
        estimatedMonths: 6,
        prerequisites: JSON.stringify([
          'Базовые знания компьютера',
          'Английский язык на уровне чтения документации'
        ]),
        prerequisitesEn: JSON.stringify([
          'Basic computer knowledge',
          'English at documentation reading level'
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
        learningPathEn: JSON.stringify([
          {
            title: 'Web Development Basics',
            description: 'Learn HTML and CSS to create structure and style web pages',
            topics: ['HTML5', 'CSS3', 'Flexbox', 'Grid', 'Responsive Design']
          },
          {
            title: 'JavaScript Basics',
            description: 'Master the fundamentals of JavaScript programming',
            topics: ['Variables and Data Types', 'Functions', 'Arrays and Objects', 'DOM Manipulation', 'Events']
          },
          {
            title: 'Modern JavaScript',
            description: 'Learn ES6+ features and asynchronous programming',
            topics: ['ES6+', 'Promises', 'Async/Await', 'Modules', 'Destructuring']
          },
          {
            title: 'React or Vue.js',
            description: 'Master a popular framework for creating interactive interfaces',
            topics: ['Components', 'State and Props', 'Hooks', 'Routing', 'State Management']
          },
          {
            title: 'Development Tools',
            description: 'Learn to use modern frontend development tools',
            topics: ['Git', 'npm/yarn', 'Webpack/Vite', 'ESLint', 'Prettier']
          }
        ]),
        resources: JSON.stringify([
          { title: 'MDN Web Docs', url: 'https://developer.mozilla.org', type: 'documentation' },
          { title: 'JavaScript.info', url: 'https://javascript.info', type: 'course' },
          { title: 'React документация', url: 'https://react.dev', type: 'documentation' }
        ]),
        resourcesEn: JSON.stringify([
          { title: 'MDN Web Docs', url: 'https://developer.mozilla.org', type: 'documentation' },
          { title: 'JavaScript.info', url: 'https://javascript.info', type: 'course' },
          { title: 'React Documentation', url: 'https://react.dev', type: 'documentation' }
        ]),
        relatedRoadmaps: JSON.stringify(['JavaScript', 'React', 'Vue.js']),
        relatedRoadmapsEn: JSON.stringify(['JavaScript', 'React', 'Vue.js']),
        popularityScore: 95
      },

      // Backend Developer
      {
        title: 'Backend разработчик',
        titleEn: 'Backend Developer',
        slug: 'backend-developer',
        category: 'role',
        description: 'Создавайте серверную логику, API и работайте с базами данных для веб-приложений.',
        descriptionEn: 'Create server-side logic, APIs and work with databases for web applications.',
        icon: '⚙️',
        color: '#10B981',
        difficulty: 'intermediate',
        estimatedMonths: 8,
        prerequisites: JSON.stringify([
          'Базовые знания программирования',
          'Понимание принципов работы веб-приложений'
        ]),
        prerequisitesEn: JSON.stringify([
          'Basic programming knowledge',
          'Understanding of web application principles'
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
        learningPathEn: JSON.stringify([
          {
            title: 'Choosing a Programming Language',
            description: 'Master one of the popular backend languages',
            topics: ['Node.js', 'Python', 'Java', 'C#', 'Go']
          },
          {
            title: 'Database Fundamentals',
            description: 'Learn to work with relational and NoSQL databases',
            topics: ['SQL', 'PostgreSQL', 'MongoDB', 'Redis', 'ORM']
          },
          {
            title: 'RESTful API',
            description: 'Learn to design and create REST APIs',
            topics: ['HTTP Methods', 'Status Codes', 'Authentication', 'CRUD Operations']
          },
          {
            title: 'Security',
            description: 'Master web security fundamentals',
            topics: ['HTTPS', 'JWT', 'OAuth', 'XSS', 'CSRF', 'SQL Injection']
          },
          {
            title: 'Deployment and DevOps',
            description: 'Learn to deploy and maintain applications',
            topics: ['Docker', 'CI/CD', 'AWS/Azure', 'Nginx', 'Monitoring']
          }
        ]),
        resources: JSON.stringify([
          { title: 'Node.js документация', url: 'https://nodejs.org/docs', type: 'documentation' },
          { title: 'PostgreSQL Tutorial', url: 'https://www.postgresqltutorial.com', type: 'course' }
        ]),
        resourcesEn: JSON.stringify([
          { title: 'Node.js Documentation', url: 'https://nodejs.org/docs', type: 'documentation' },
          { title: 'PostgreSQL Tutorial', url: 'https://www.postgresqltutorial.com', type: 'course' }
        ]),
        relatedRoadmaps: JSON.stringify(['Node.js', 'Python', 'PostgreSQL']),
        relatedRoadmapsEn: JSON.stringify(['Node.js', 'Python', 'PostgreSQL']),
        popularityScore: 90
      },

      // Full Stack Developer
      {
        title: 'Full Stack разработчик',
        titleEn: 'Full Stack Developer',
        slug: 'fullstack-developer',
        category: 'role',
        description: 'Станьте универсальным разработчиком, способным работать как с frontend, так и с backend.',
        descriptionEn: 'Become a versatile developer capable of working with both frontend and backend.',
        icon: '🚀',
        color: '#8B5CF6',
        difficulty: 'advanced',
        estimatedMonths: 12,
        prerequisites: JSON.stringify([
          'Опыт в frontend или backend разработке',
          'Знание JavaScript'
        ]),
        prerequisitesEn: JSON.stringify([
          'Experience in frontend or backend development',
          'JavaScript knowledge'
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
        learningPathEn: JSON.stringify([
          {
            title: 'Frontend Technologies',
            description: 'Master the modern frontend stack',
            topics: ['React/Vue', 'TypeScript', 'State Management', 'CSS Frameworks']
          },
          {
            title: 'Backend Technologies',
            description: 'Learn server-side development',
            topics: ['Node.js/Express', 'REST API', 'GraphQL', 'Databases']
          },
          {
            title: 'DevOps Practices',
            description: 'Learn to deploy full-fledged applications',
            topics: ['Docker', 'Kubernetes', 'CI/CD', 'Cloud Services']
          },
          {
            title: 'Application Architecture',
            description: 'Understanding complex system design',
            topics: ['Microservices', 'Design Patterns', 'Scaling']
          }
        ]),
        resources: JSON.stringify([
          { title: 'Full Stack Open', url: 'https://fullstackopen.com', type: 'course' }
        ]),
        resourcesEn: JSON.stringify([
          { title: 'Full Stack Open', url: 'https://fullstackopen.com', type: 'course' }
        ]),
        relatedRoadmaps: JSON.stringify(['Frontend разработчик', 'Backend разработчик']),
        relatedRoadmapsEn: JSON.stringify(['Frontend Developer', 'Backend Developer']),
        popularityScore: 85
      },

      // JavaScript
      {
        title: 'JavaScript',
        titleEn: 'JavaScript',
        slug: 'javascript',
        category: 'language',
        description: 'Освойте самый популярный язык программирования для веб-разработки.',
        descriptionEn: 'Master the most popular programming language for web development.',
        icon: '📜',
        color: '#D4B800',
        difficulty: 'beginner',
        estimatedMonths: 4,
        prerequisites: JSON.stringify([
          'Базовое понимание HTML и CSS'
        ]),
        prerequisitesEn: JSON.stringify([
          'Basic understanding of HTML and CSS'
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
        learningPathEn: JSON.stringify([
          {
            title: 'Syntax Basics',
            description: 'Learn the basic language constructs',
            topics: ['Variables', 'Data Types', 'Operators', 'Conditions', 'Loops']
          },
          {
            title: 'Functions and Scope',
            description: 'Understanding functions and closures',
            topics: ['Function Declaration', 'Arrow Functions', 'Closure', 'this', 'call/apply/bind']
          },
          {
            title: 'Objects and Prototypes',
            description: 'OOP in JavaScript',
            topics: ['Objects', 'Prototypes', 'Classes', 'Inheritance']
          },
          {
            title: 'Asynchronous Programming',
            description: 'Working with asynchronous code',
            topics: ['Callbacks', 'Promises', 'Async/Await', 'Event Loop']
          },
          {
            title: 'ES6+ Features',
            description: 'Modern JavaScript capabilities',
            topics: ['Destructuring', 'Spread/Rest', 'Modules', 'Template Literals']
          }
        ]),
        resources: JSON.stringify([
          { title: 'JavaScript.info', url: 'https://javascript.info', type: 'course' },
          { title: 'MDN JavaScript', url: 'https://developer.mozilla.org/ru/docs/Web/JavaScript', type: 'documentation' }
        ]),
        resourcesEn: JSON.stringify([
          { title: 'JavaScript.info', url: 'https://javascript.info', type: 'course' },
          { title: 'MDN JavaScript', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', type: 'documentation' }
        ]),
        relatedRoadmaps: JSON.stringify(['TypeScript', 'Node.js']),
        relatedRoadmapsEn: JSON.stringify(['TypeScript', 'Node.js']),
        popularityScore: 100
      },

      // Python
      {
        title: 'Python',
        titleEn: 'Python',
        slug: 'python',
        category: 'language',
        description: 'Изучите универсальный язык программирования для веб-разработки, data science и автоматизации.',
        descriptionEn: 'Learn a versatile programming language for web development, data science, and automation.',
        icon: '🐍',
        color: '#3776AB',
        difficulty: 'beginner',
        estimatedMonths: 5,
        prerequisites: JSON.stringify([
          'Базовая компьютерная грамотность'
        ]),
        prerequisitesEn: JSON.stringify([
          'Basic computer literacy'
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
        learningPathEn: JSON.stringify([
          {
            title: 'Python Basics',
            description: 'Syntax and basic concepts',
            topics: ['Variables', 'Data Types', 'Lists', 'Dictionaries', 'Conditions and Loops']
          },
          {
            title: 'Functions and Modules',
            description: 'Code organization',
            topics: ['Functions', 'Lambda', 'Decorators', 'Modules', 'Packages']
          },
          {
            title: 'OOP in Python',
            description: 'Object-oriented programming',
            topics: ['Classes', 'Inheritance', 'Encapsulation', 'Polymorphism']
          },
          {
            title: 'Working with Data',
            description: 'Libraries for working with files and data',
            topics: ['File I/O', 'JSON', 'CSV', 'Regular Expressions']
          },
          {
            title: 'Web Development with Python',
            description: 'Frameworks for building web applications',
            topics: ['Django', 'Flask', 'FastAPI', 'SQLAlchemy']
          }
        ]),
        resources: JSON.stringify([
          { title: 'Python.org Tutorial', url: 'https://docs.python.org/3/tutorial/', type: 'documentation' },
          { title: 'Real Python', url: 'https://realpython.com', type: 'course' }
        ]),
        resourcesEn: JSON.stringify([
          { title: 'Python.org Tutorial', url: 'https://docs.python.org/3/tutorial/', type: 'documentation' },
          { title: 'Real Python', url: 'https://realpython.com', type: 'course' }
        ]),
        relatedRoadmaps: JSON.stringify(['Django', 'Data Science']),
        relatedRoadmapsEn: JSON.stringify(['Django', 'Data Science']),
        popularityScore: 92
      },

      // React
      {
        title: 'React',
        titleEn: 'React',
        slug: 'react',
        category: 'framework',
        description: 'Освойте самую популярную библиотеку для создания пользовательских интерфейсов.',
        descriptionEn: 'Master the most popular library for building user interfaces.',
        icon: '⚛️',
        color: '#4AB8D9',
        difficulty: 'intermediate',
        estimatedMonths: 4,
        prerequisites: JSON.stringify([
          'Хорошее знание JavaScript',
          'Понимание HTML и CSS'
        ]),
        prerequisitesEn: JSON.stringify([
          'Good knowledge of JavaScript',
          'Understanding of HTML and CSS'
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
        learningPathEn: JSON.stringify([
          {
            title: 'React Basics',
            description: 'Components and JSX',
            topics: ['JSX', 'Components', 'Props', 'State', 'Events']
          },
          {
            title: 'React Hooks',
            description: 'Modern approach to React',
            topics: ['useState', 'useEffect', 'useContext', 'useRef', 'Custom Hooks']
          },
          {
            title: 'State Management',
            description: 'State management solutions',
            topics: ['Context API', 'Redux', 'Zustand', 'React Query']
          },
          {
            title: 'Routing',
            description: 'Navigation in React applications',
            topics: ['React Router', 'Dynamic Routes', 'Protected Routes']
          },
          {
            title: 'Optimization',
            description: 'React application performance',
            topics: ['Memo', 'useMemo', 'useCallback', 'Code Splitting', 'Lazy Loading']
          }
        ]),
        resources: JSON.stringify([
          { title: 'React Docs', url: 'https://react.dev', type: 'documentation' },
          { title: 'Epic React', url: 'https://epicreact.dev', type: 'course' }
        ]),
        resourcesEn: JSON.stringify([
          { title: 'React Docs', url: 'https://react.dev', type: 'documentation' },
          { title: 'Epic React', url: 'https://epicreact.dev', type: 'course' }
        ]),
        relatedRoadmaps: JSON.stringify(['JavaScript', 'TypeScript', 'Frontend разработчик']),
        relatedRoadmapsEn: JSON.stringify(['JavaScript', 'TypeScript', 'Frontend Developer']),
        popularityScore: 98
      },

      // DevOps Engineer
      {
        title: 'DevOps инженер',
        titleEn: 'DevOps Engineer',
        slug: 'devops-engineer',
        category: 'role',
        description: 'Научитесь автоматизировать развертывание и поддержку приложений в продакшене.',
        descriptionEn: 'Learn to automate deployment and maintenance of applications in production.',
        icon: '🔧',
        color: '#D94A4A',
        difficulty: 'advanced',
        estimatedMonths: 10,
        prerequisites: JSON.stringify([
          'Опыт работы с Linux',
          'Базовые знания сетей',
          'Знание любого языка программирования'
        ]),
        prerequisitesEn: JSON.stringify([
          'Experience with Linux',
          'Basic networking knowledge',
          'Knowledge of any programming language'
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
        learningPathEn: JSON.stringify([
          {
            title: 'Linux and Command Line',
            description: 'Working with the operating system',
            topics: ['Bash', 'File System', 'Processes', 'Networking', 'SSH']
          },
          {
            title: 'Containerization',
            description: 'Docker and orchestration',
            topics: ['Docker', 'Dockerfile', 'Docker Compose', 'Kubernetes', 'Helm']
          },
          {
            title: 'CI/CD',
            description: 'Deployment automation',
            topics: ['GitLab CI', 'GitHub Actions', 'Jenkins', 'ArgoCD']
          },
          {
            title: 'Infrastructure as Code',
            description: 'Managing infrastructure through code',
            topics: ['Terraform', 'Ansible', 'CloudFormation']
          },
          {
            title: 'Monitoring and Logging',
            description: 'System observability',
            topics: ['Prometheus', 'Grafana', 'ELK Stack', 'Logging']
          }
        ]),
        resources: JSON.stringify([
          { title: 'Docker Documentation', url: 'https://docs.docker.com', type: 'documentation' },
          { title: 'Kubernetes Docs', url: 'https://kubernetes.io/docs', type: 'documentation' }
        ]),
        resourcesEn: JSON.stringify([
          { title: 'Docker Documentation', url: 'https://docs.docker.com', type: 'documentation' },
          { title: 'Kubernetes Docs', url: 'https://kubernetes.io/docs', type: 'documentation' }
        ]),
        relatedRoadmaps: JSON.stringify(['Linux', 'Docker', 'Kubernetes']),
        relatedRoadmapsEn: JSON.stringify(['Linux', 'Docker', 'Kubernetes']),
        popularityScore: 88
      },

      // Data Scientist
      {
        title: 'Data Scientist',
        titleEn: 'Data Scientist',
        slug: 'data-scientist',
        category: 'role',
        description: 'Анализируйте данные и создавайте модели машинного обучения.',
        descriptionEn: 'Analyze data and build machine learning models.',
        icon: '📊',
        color: '#D97B00',
        difficulty: 'advanced',
        estimatedMonths: 12,
        prerequisites: JSON.stringify([
          'Математика (статистика, линейная алгебра)',
          'Программирование на Python'
        ]),
        prerequisitesEn: JSON.stringify([
          'Mathematics (statistics, linear algebra)',
          'Python programming'
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
        learningPathEn: JSON.stringify([
          {
            title: 'Python for Data Science',
            description: 'Libraries for working with data',
            topics: ['NumPy', 'Pandas', 'Matplotlib', 'Seaborn']
          },
          {
            title: 'Mathematics and Statistics',
            description: 'Mathematical foundations',
            topics: ['Statistics', 'Linear Algebra', 'Probability Theory']
          },
          {
            title: 'Machine Learning',
            description: 'Machine learning algorithms',
            topics: ['Scikit-learn', 'Regression', 'Classification', 'Clustering']
          },
          {
            title: 'Deep Learning',
            description: 'Neural networks',
            topics: ['TensorFlow', 'PyTorch', 'CNN', 'RNN', 'Transformers']
          },
          {
            title: 'Big Data',
            description: 'Working with large datasets',
            topics: ['Spark', 'Hadoop', 'SQL', 'NoSQL']
          }
        ]),
        resources: JSON.stringify([
          { title: 'Kaggle Learn', url: 'https://www.kaggle.com/learn', type: 'course' },
          { title: 'Fast.ai', url: 'https://www.fast.ai', type: 'course' }
        ]),
        resourcesEn: JSON.stringify([
          { title: 'Kaggle Learn', url: 'https://www.kaggle.com/learn', type: 'course' },
          { title: 'Fast.ai', url: 'https://www.fast.ai', type: 'course' }
        ]),
        relatedRoadmaps: JSON.stringify(['Python', 'Machine Learning']),
        relatedRoadmapsEn: JSON.stringify(['Python', 'Machine Learning']),
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
