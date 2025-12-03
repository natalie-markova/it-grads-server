const personaPresets = {
  strict_hr: {
    title: 'Строгий HR-директор',
    tone: 'профессиональный и требовательный',
  },
  friendly_tech: {
    title: 'Дружелюбный тимлид',
    tone: 'технический и поддерживающий',
  },
  direct_ceo: {
    title: 'Прямолинейный CEO',
    tone: 'деловой и конкретный',
  },
};

// Вопросы по позициям
const positionQuestions = {
  'Frontend разработчик': [
    'Расскажите о своем опыте работы с React, Vue или Angular. Какой фреймворк предпочитаете и почему?',
    'Как вы оптимизируете производительность веб-приложений? Приведите конкретный пример.',
    'Опишите ваш подход к написанию CSS. Используете ли препроцессоры или CSS-in-JS?',
    'Как вы организуете state management в больших приложениях?',
    'Расскажите о сложном UI-компоненте, который вы создавали. Какие были трудности?',
  ],
  'Backend разработчик': [
    'Какие языки и фреймворки вы используете для backend-разработки?',
    'Как вы проектируете REST API? Какие принципы считаете важными?',
    'Расскажите об опыте работы с базами данных. SQL vs NoSQL - когда что использовать?',
    'Как вы обеспечиваете безопасность backend-приложений?',
    'Опишите опыт оптимизации производительности серверных приложений.',
  ],
  'Fullstack разработчик': [
    'Как вы распределяете время между frontend и backend задачами?',
    'Расскажите о проекте, где вы отвечали за весь стек технологий.',
    'Какие технологии предпочитаете для full-stack разработки и почему?',
    'Как организуете взаимодействие между клиентом и сервером?',
    'Опишите ваш подход к деплою и DevOps практикам.',
  ],
  'React разработчик': [
    'Объясните разницу между функциональными компонентами и классами. Что предпочитаете?',
    'Как вы управляете состоянием в React приложениях? Redux, MobX, Context API?',
    'Расскажите об оптимизации React приложений: memo, useMemo, useCallback.',
    'Как вы тестируете React компоненты? Какие инструменты используете?',
    'Опишите работу с серверным рендерингом (SSR) или Next.js.',
  ],
  'Node.js разработчик': [
    'Расскажите об асинхронной модели Node.js. Event Loop, callbacks, Promises.',
    'Какие фреймворки используете: Express, Fastify, NestJS? Почему?',
    'Как обрабатываете ошибки в Node.js приложениях?',
    'Опишите опыт работы с микросервисной архитектурой.',
    'Как масштабируете Node.js приложения под высокую нагрузку?',
  ],
  'Python разработчик': [
    'Какие фреймворки Python вы используете: Django, Flask, FastAPI?',
    'Расскажите об опыте работы с ORM: SQLAlchemy, Django ORM.',
    'Как вы пишете тесты на Python? pytest, unittest?',
    'Опишите опыт работы с асинхронным Python (asyncio).',
    'Как организуете структуру больших Python проектов?',
  ],
  'Java разработчик': [
    'Расскажите об опыте работы со Spring Framework.',
    'Как вы используете паттерны проектирования в Java?',
    'Опишите работу с многопоточностью в Java.',
    'Какой опыт с микросервисами на Java: Spring Boot, Quarkus?',
    'Как профилируете и оптимизируете Java приложения?',
  ],
  'DevOps инженер': [
    'Какие инструменты CI/CD вы использовали? Jenkins, GitLab CI, GitHub Actions?',
    'Расскажите об опыте работы с Docker и Kubernetes.',
    'Как вы настраиваете мониторинг и алертинг инфраструктуры?',
    'Опишите опыт работы с облачными провайдерами: AWS, GCP, Azure.',
    'Как автоматизируете инфраструктуру? Terraform, Ansible?',
  ],
  'QA инженер': [
    'Расскажите о вашем подходе к тест-дизайну. Какие техники используете?',
    'Какие инструменты автоматизации тестирования предпочитаете?',
    'Как организуете тестирование API? Postman, REST Assured?',
    'Опишите опыт нагрузочного тестирования.',
    'Как интегрируете тесты в CI/CD pipeline?',
  ],
  'Data Scientist': [
    'Расскажите о проекте машинного обучения, которым гордитесь.',
    'Какие библиотеки ML используете: scikit-learn, TensorFlow, PyTorch?',
    'Как подходите к feature engineering и отбору признаков?',
    'Опишите процесс валидации и оценки моделей.',
    'Как деплоите ML модели в production?',
  ],
  'Data Analyst': [
    'Какие инструменты используете для анализа данных? SQL, Python, R?',
    'Расскажите об опыте визуализации данных. Tableau, Power BI, matplotlib?',
    'Как проводите A/B тестирование и анализируете результаты?',
    'Опишите процесс построения дашбордов для бизнеса.',
    'Как работаете с большими объемами данных?',
  ],
  'Mobile разработчик (iOS)': [
    'Расскажите об опыте разработки на Swift/Objective-C.',
    'Как работаете с UIKit и SwiftUI? Что предпочитаете?',
    'Опишите архитектурные паттерны в iOS: MVC, MVVM, VIPER.',
    'Как тестируете iOS приложения? XCTest, UI Testing?',
    'Расскажите о публикации приложений в App Store.',
  ],
  'Mobile разработчик (Android)': [
    'Какой опыт разработки на Kotlin и Java для Android?',
    'Расскажите о работе с Jetpack Compose vs XML layouts.',
    'Как организуете архитектуру Android приложений? MVVM, Clean Architecture?',
    'Опишите работу с Android SDK и библиотеками.',
    'Как оптимизируете производительность Android приложений?',
  ],
  'UI/UX дизайнер': [
    'Расскажите о вашем процессе дизайна от исследования до прототипа.',
    'Какие инструменты используете: Figma, Sketch, Adobe XD?',
    'Как проводите пользовательские исследования и тестирования?',
    'Опишите работу с дизайн-системами и UI Kit.',
    'Как взаимодействуете с разработчиками при передаче макетов?',
  ],
  'Product Manager': [
    'Как вы приоритизируете фичи в бэклоге? Какие методики используете?',
    'Расскажите о запуске продукта или крупной фичи.',
    'Как собираете и анализируете обратную связь от пользователей?',
    'Опишите работу с метриками продукта. Какие KPI отслеживаете?',
    'Как координируете работу кросс-функциональных команд?',
  ],
  'Project Manager': [
    'Какие методологии управления проектами используете: Agile, Scrum, Kanban?',
    'Расскажите о сложном проекте и как справились с трудностями.',
    'Как оцениваете сроки и ресурсы на проект?',
    'Опишите работу с рисками проекта.',
    'Как ведете коммуникацию со стейкхолдерами?',
  ],
  'System Administrator': [
    'Какие операционные системы администрируете: Linux, Windows Server?',
    'Расскажите о настройке и поддержке сетевой инфраструктуры.',
    'Как обеспечиваете безопасность серверов и сети?',
    'Опишите опыт работы с виртуализацией: VMware, Hyper-V, KVM.',
    'Как автоматизируете рутинные задачи администрирования?',
  ],
  'Бизнес-аналитик': [
    'Как вы собираете и документируете требования?',
    'Расскажите об опыте моделирования бизнес-процессов. BPMN, UML?',
    'Как проводите анализ stakeholders и их потребностей?',
    'Опишите работу с техническими и бизнес командами.',
    'Какие инструменты используете для аналитики: Jira, Confluence?',
  ],
  'ML инженер': [
    'Расскажите об архитектуре ML pipeline в production.',
    'Как организуете версионирование моделей и данных?',
    'Опишите опыт работы с MLOps инструментами: MLflow, Kubeflow.',
    'Как оптимизируете inference моделей?',
    'Расскажите о масштабировании ML систем.',
  ],
  'Технический писатель': [
    'Какие инструменты используете для документации? Markdown, Confluence, GitBook?',
    'Расскажите о подходе к структурированию технической документации.',
    'Как адаптируете контент для разных аудиторий: разработчики, пользователи?',
    'Опишите опыт создания API документации.',
    'Как поддерживаете документацию в актуальном состоянии?',
  ],
};

// Общие вопросы (fallback)
const defaultQuestions = [
  'Расскажите о себе и своем профессиональном опыте.',
  'Какими проектами вы гордитесь больше всего?',
  'Как вы подходите к решению сложных задач?',
  'Расскажите о работе в команде и взаимодействии с коллегами.',
  'Какие ваши карьерные цели на ближайшие годы?',
];

const keywordGroups = [
  { keywords: ['команда', 'вместе', 'лидер', 'коммуника', 'коллег'], label: 'Командное взаимодействие' },
  { keywords: ['результат', 'метрика', 'улучшил', 'рост', 'оптимиз'], label: 'Ориентация на результат' },
  { keywords: ['ошибка', 'урок', 'исправил', 'анализ', 'debug'], label: 'Рефлексия и обучение' },
  { keywords: ['технолог', 'стек', 'инструмент', 'фреймворк', 'библиотек'], label: 'Техническая насмотренность' },
  { keywords: ['тест', 'качеств', 'проверк', 'валидац'], label: 'Внимание к качеству' },
  { keywords: ['архитектур', 'паттерн', 'структур', 'организ'], label: 'Системное мышление' },
];

class AudioInterviewService {
  getPersonaConfig(persona) {
    return personaPresets[persona] || null;
  }

  getQuestion(persona, index, position) {
    // Получаем вопросы для конкретной позиции или используем дефолтные
    const questions = positionQuestions[position] || defaultQuestions;
    return questions[index] || null;
  }

  getQuestionsForPosition(position) {
    return positionQuestions[position] || defaultQuestions;
  }

  evaluateAnswer(answer) {
    // Пустой или невалидный ответ = 0 баллов
    if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
      return { score: 0, evaluation: 'Ответ отсутствует. На собеседовании это критическая ошибка.' };
    }

    const normalized = answer.toLowerCase().trim();
    const wordCount = normalized.split(/\s+/).filter(w => w.length > 0).length;

    // Слишком короткий ответ (менее 5 слов) = 0-2 балла
    if (wordCount < 5) {
      return { score: 1, evaluation: 'Ответ слишком короткий и неинформативный. На реальном собеседовании это будет воспринято негативно.' };
    }

    // Очень короткий ответ (5-10 слов) = низкий балл
    if (wordCount < 10) {
      return { score: 3, evaluation: 'Ответ недостаточно развёрнут. Требуется больше деталей, примеров и конкретики.' };
    }

    // Базовая оценка по длине
    let baseScore = 0;
    if (wordCount >= 10 && wordCount < 20) baseScore = 4;
    else if (wordCount >= 20 && wordCount < 40) baseScore = 5;
    else if (wordCount >= 40 && wordCount < 60) baseScore = 6;
    else if (wordCount >= 60) baseScore = 7;

    // Бонусы за ключевые слова (профессиональный контент)
    let keywordBonus = 0;
    const matchedGroups = [];
    keywordGroups.forEach(group => {
      if (group.keywords.some(keyword => normalized.includes(keyword))) {
        keywordBonus += 0.5;
        matchedGroups.push(group.label);
      }
    });
    keywordBonus = Math.min(3, keywordBonus); // Максимум +3 балла за ключевые слова

    const totalScore = Math.min(10, baseScore + keywordBonus);
    const remarks = [];

    // Строгие комментарии
    if (totalScore <= 4) {
      remarks.push('Слабый ответ. Не хватает конкретики, примеров из опыта и профессиональной лексики.');
    } else if (totalScore <= 6) {
      remarks.push('Средний ответ. Есть потенциал, но нужно больше структуры и конкретных примеров.');
    } else if (totalScore <= 8) {
      remarks.push('Хороший ответ. Структурирован и содержит релевантную информацию.');
    } else {
      remarks.push('Отличный ответ! Профессионально и по делу.');
    }

    if (matchedGroups.length >= 3) {
      remarks.push(`Хорошо раскрыты аспекты: ${matchedGroups.join(', ')}.`);
    } else if (matchedGroups.length >= 1) {
      remarks.push(`Затронуты: ${matchedGroups.join(', ')}.`);
    } else {
      remarks.push('Не упомянуты ключевые аспекты: результаты, технологии, командная работа.');
    }

    return {
      score: totalScore,
      evaluation: remarks.join(' '),
    };
  }

  buildSummary(messages) {
    const userAnswers = messages.filter(m => m.role === 'user');

    // Нет ответов = 0 баллов
    if (!userAnswers.length) {
      return {
        overallScore: 0,
        strengths: [],
        weaknesses: ['Интервью не пройдено - ответы отсутствуют'],
        feedback: 'Вы не дали ни одного ответа. На реальном собеседовании это означает отказ.',
      };
    }

    const scoredMessages = messages.filter(m => m.role === 'assistant' && typeof m.score === 'number');

    // Считаем средний балл строго
    let overallScore = 0;
    if (scoredMessages.length) {
      const avgScore = scoredMessages.reduce((sum, msg) => sum + msg.score, 0) / scoredMessages.length;
      overallScore = Math.round(avgScore * 10); // Переводим в шкалу 0-100
    }

    const strengths = [];
    const weaknesses = [];

    // Строгая оценка по среднему баллу
    if (overallScore >= 80) {
      strengths.push('Отличная структура ответов и профессиональный подход');
    } else if (overallScore >= 60) {
      strengths.push('Приемлемый уровень ответов');
    } else if (overallScore >= 40) {
      weaknesses.push('Ответы поверхностные и недостаточно структурированы');
    } else {
      weaknesses.push('Критически слабые ответы. Требуется серьёзная подготовка.');
    }

    // Анализ длины ответов
    const longAnswers = userAnswers.filter(a => a.content.split(/\s+/).length >= 40);
    const shortAnswers = userAnswers.filter(a => a.content.split(/\s+/).length < 15);

    if (longAnswers.length >= 3) {
      strengths.push('Развернутые ответы с примерами из опыта');
    } else if (longAnswers.length >= 1) {
      strengths.push('Есть развернутые ответы');
    }

    if (shortAnswers.length >= 3) {
      weaknesses.push('Слишком много коротких, неинформативных ответов');
    } else if (shortAnswers.length >= 1) {
      weaknesses.push('Некоторые ответы слишком краткие');
    }

    // Анализируем упоминание ключевых аспектов
    const allAnswers = userAnswers.map(a => a.content.toLowerCase()).join(' ');
    let aspectsFound = 0;

    if (keywordGroups[0].keywords.some(k => allAnswers.includes(k))) { // Команда
      strengths.push('Упоминание командной работы');
      aspectsFound++;
    }
    if (keywordGroups[1].keywords.some(k => allAnswers.includes(k))) { // Результаты
      strengths.push('Фокус на результатах');
      aspectsFound++;
    }
    if (keywordGroups[3].keywords.some(k => allAnswers.includes(k))) { // Технологии
      strengths.push('Знание технологий и инструментов');
      aspectsFound++;
    }

    if (aspectsFound === 0) {
      weaknesses.push('Не упомянуты важные аспекты: командная работа, результаты, технологии');
    }

    // Формируем итоговый фидбек
    let feedback;
    if (overallScore >= 80) {
      feedback = 'Отличное интервью! Вы показали профессионализм и хорошую подготовку.';
    } else if (overallScore >= 60) {
      feedback = 'Неплохое интервью. Есть над чем работать, но основа есть.';
    } else if (overallScore >= 40) {
      feedback = 'Слабое интервью. Нужна серьёзная подготовка: работайте над структурой ответов и добавляйте конкретные примеры.';
    } else if (overallScore >= 20) {
      feedback = 'Очень слабое интервью. Ответы неубедительны. Рекомендуется изучить методику STAR для ответов на собеседованиях.';
    } else {
      feedback = 'Провальное интервью. Требуется полная переподготовка к собеседованиям.';
    }

    return {
      overallScore: Math.max(0, Math.min(100, overallScore)),
      strengths: strengths.length ? strengths : ['Вы пытались отвечать на вопросы'],
      weaknesses: weaknesses.length ? weaknesses : [],
      feedback,
    };
  }
}

module.exports = new AudioInterviewService();