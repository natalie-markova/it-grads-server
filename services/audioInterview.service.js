const personaPresets = {
  strict_hr: {
    title: 'Строгий HR-директор',
    tone: 'профессиональный и требовательный',
    questions: [
      'Расскажите о своем последнем месте работы и причинах ухода.',
      'Как вы справляетесь со стрессом и жесткими дедлайнами?',
      'Опишите пример ошибки, которую вы допустили, и как вы ее исправили.',
      'Почему вы хотите работать в нашей компании?',
      'Какую ценность вы сможете дать команде в первые 3 месяца?',
    ],
  },
  friendly_tech: {
    title: 'Дружелюбный тимлид',
    tone: 'технический и поддерживающий',
    questions: [
      'Расскажите о проекте, которым вы гордитесь больше всего.',
      'Какие технологии используете сейчас и что изучаете дополнительно?',
      'Как вы подходите к сложным техническим задачам?',
      'Опишите опыт командной работы: роли, процессы, взаимодействие.',
      'Что вас мотивирует развиваться как разработчика?',
    ],
  },
  direct_ceo: {
    title: 'Прямолинейный CEO',
    tone: 'деловой и конкретный',
    questions: [
      'За что вы отвечали на последнем месте работы? Каких результатов достигли?',
      'Какую измеримую ценность вы принесете бизнесу в ближайшие месяцы?',
      'Готовы ли вы работать сверхурочно при необходимости? Приведите пример.',
      'Назовите три главных недостатка и как вы с ними работаете.',
      'Где вы видите себя через три года и почему?',
    ],
  },
};

const keywordGroups = [
  { keywords: ['команда', 'вместе', 'лидер', 'коммуника'], label: 'Командное взаимодействие' },
  { keywords: ['результат', 'метрика', 'улучшил', 'рост'], label: 'Ориентация на результат' },
  { keywords: ['ошибка', 'урок', 'исправил', 'анализ'], label: 'Рефлексия и обучение' },
  { keywords: ['технолог', 'стек', 'инструмент'], label: 'Техническая насмотренность' },
];

class AudioInterviewService {
  getPersonaConfig(persona) {
    return personaPresets[persona] || null;
  }

  getQuestion(persona, index) {
    const preset = this.getPersonaConfig(persona);
    if (!preset) return null;
    return preset.questions[index] || null;
  }

  evaluateAnswer(answer) {
    if (!answer || typeof answer !== 'string') {
      return { score: 2, evaluation: 'Ответ не распознан. Постарайтесь говорить четко и по делу.' };
    }

    const normalized = answer.toLowerCase();
    const lengthScore = Math.min(10, Math.floor(normalized.split(' ').length / 5));

    let keywordScore = 0;
    const matchedGroups = [];
    keywordGroups.forEach(group => {
      if (group.keywords.some(keyword => normalized.includes(keyword))) {
        keywordScore += 2;
        matchedGroups.push(group.label);
      }
    });

    const totalScore = Math.max(4, Math.min(10, lengthScore + keywordScore));
    const remarks = [];
    if (lengthScore >= 6) {
      remarks.push('Ответ структурирован и достаточно подробный.');
    } else {
      remarks.push('Добавьте конкретики и деталей, чтобы ответ звучал увереннее.');
    }

    if (matchedGroups.length) {
      remarks.push(`Хорошо раскрыты аспекты: ${matchedGroups.join(', ')}.`);
    } else {
      remarks.push('Попробуйте подчеркнуть результаты и личный вклад.');
    }

    return {
      score: totalScore,
      evaluation: remarks.join(' '),
    };
  }

  buildSummary(messages) {
    const userAnswers = messages.filter(m => m.role === 'user');
    if (!userAnswers.length) {
      return {
        overallScore: 50,
        strengths: ['Вы начали интервью, но не завершили его'],
        weaknesses: ['Ответы отсутствуют, сложно оценить уровень'],
        feedback: 'Постарайтесь пройти интервью полностью, чтобы получить фидбек.',
      };
    }

    const scoredMessages = messages.filter(m => m.role === 'assistant' && typeof m.score === 'number');
    const overallScore = scoredMessages.length
      ? Math.round(scoredMessages.reduce((sum, msg) => sum + msg.score, 0) / scoredMessages.length * 10)
      : 60;

    const strengths = [];
    const weaknesses = [];

    if (overallScore > 70) {
      strengths.push('Хорошая структура ответов и уверенный тон');
    } else {
      weaknesses.push('Ответы требуют дополнительной структуры и конкретики');
    }

    const longAnswers = userAnswers.filter(a => a.content.split(' ').length > 40);
    if (longAnswers.length >= 2) {
      strengths.push('Вы приводите развернутые примеры из опыта');
    } else {
      weaknesses.push('Добавьте подробные кейсы из практики');
    }

    return {
      overallScore: Math.min(100, Math.max(40, overallScore)),
      strengths: strengths.length ? strengths : ['Вы готовы развиваться и совершенствовать навыки'],
      weaknesses: weaknesses.length ? weaknesses : ['Продолжайте тренироваться и анализировать ответы'],
      feedback: overallScore > 70
        ? 'Отличная работа! Продолжайте практиковаться и закрепляйте сильные стороны.'
        : 'Есть потенциал для роста — уделите внимание структуре ответов и конкретным примерам.',
    };
  }
}

module.exports = new AudioInterviewService();


