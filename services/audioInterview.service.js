/**
 * Audio Interview Service - YandexGPT powered
 * Генерация вопросов и оценка ответов через YandexGPT
 * Поддержка естественного диалога с отвлечёнными темами
 */

const yandexGPTService = require('./yandexGPT.service');

const personaPresets = {
  ru: {
    strict_hr: {
      title: 'Строгий HR-директор',
      name: 'Елена Викторовна',
      gender: 'female',
      tone: 'профессиональный и требовательный',
      style: `Ты строгий HR-директор Елена Викторовна из крупной IT-компании. Характер: деловая, внимательная к деталям, но справедливая.
- Говоришь коротко и по делу
- Ценишь конкретику и цифры в ответах
- Можешь пошутить, но сдержанно
- Если кандидат отвлекается - мягко возвращаешь к теме`,
    },
    friendly_tech: {
      title: 'Дружелюбный тимлид',
      name: 'Алексей',
      gender: 'male',
      tone: 'технический и поддерживающий',
      style: `Ты дружелюбный тимлид Алексей, 8 лет в разработке. Характер: открытый, с юмором, любишь обсуждать технологии.
- Общаешься на "ты", неформально
- Интересуешься опытом кандидата, задаёшь уточняющие вопросы
- Если кандидат хочет поговорить на отвлечённую тему - поддерживаешь, но потом возвращаешься к делу
- Делишься своим опытом, если это уместно`,
    },
    direct_ceo: {
      title: 'Прямолинейный CEO',
      name: 'Дмитрий',
      gender: 'male',
      tone: 'деловой и конкретный',
      style: `Ты CEO стартапа Дмитрий. Характер: энергичный, прямой, ценит время.
- Задаёшь вопросы о результатах и достижениях
- Говоришь кратко, но можешь увлечься обсуждением интересной идеи
- Интересуешься мотивацией и амбициями кандидата
- Любишь нестандартные вопросы`,
    },
  },
  en: {
    strict_hr: {
      title: 'Strict HR Director',
      name: 'Helen',
      gender: 'female',
      tone: 'professional and demanding',
      style: `You are a strict HR Director Helen from a large IT company. Character: businesslike, detail-oriented, but fair.
- You speak briefly and to the point
- You value specifics and numbers in answers
- You may joke, but restrainedly
- If the candidate gets distracted - you gently bring them back to the topic`,
    },
    friendly_tech: {
      title: 'Friendly Tech Lead',
      name: 'Alex',
      gender: 'male',
      tone: 'technical and supportive',
      style: `You are a friendly tech lead Alex, 8 years in development. Character: open, humorous, loves discussing technologies.
- You communicate informally
- You're interested in the candidate's experience, ask clarifying questions
- If the candidate wants to talk about a side topic - you support it briefly, then return to business
- You share your experience if appropriate`,
    },
    direct_ceo: {
      title: 'Direct CEO',
      name: 'David',
      gender: 'male',
      tone: 'businesslike and specific',
      style: `You are a startup CEO David. Character: energetic, direct, values time.
- You ask questions about results and achievements
- You speak briefly, but can get carried away discussing an interesting idea
- You're interested in the candidate's motivation and ambitions
- You like unconventional questions`,
    },
  },
};

class AudioInterviewService {
  getPersonaConfig(persona, lang = 'ru') {
    const langPresets = personaPresets[lang] || personaPresets.ru;
    return langPresets[persona] || null;
  }

  /**
   * Генерировать приветствие и первый вопрос через YandexGPT
   * Полностью динамическая генерация для максимальной рандомизации
   */
  async generateGreeting(persona, position, lang = 'ru') {
    const personaConfig = this.getPersonaConfig(persona, lang);
    if (!personaConfig) {
      throw new Error('Invalid persona');
    }

    // Случайные варианты первого вопроса для разнообразия
    const firstQuestionTypes = lang === 'en' ? [
      'Ask about a recent project the candidate is proud of',
      'Ask them to tell about the most interesting task in the last year',
      'Ask what attracted them to this position',
      'Ask them to briefly describe their path in development',
      'Ask about their favorite tech stack and why',
      'Ask them to tell about something new they recently learned',
      'Ask about the most difficult bug they had to find'
    ] : [
      'Спроси о недавнем проекте, которым кандидат гордится',
      'Попроси рассказать о самой интересной задаче за последний год',
      'Спроси, что привлекло в этой позиции',
      'Попроси кратко описать свой путь в разработке',
      'Спроси о любимом стеке технологий и почему',
      'Попроси рассказать о чём-то новом, что недавно изучал',
      'Спроси о самом сложном баге, который приходилось искать'
    ];
    const randomFirstQuestion = firstQuestionTypes[Math.floor(Math.random() * firstQuestionTypes.length)];

    const systemPrompt = lang === 'en'
      ? `${personaConfig.style}

SITUATION: Beginning of an interview for the "${position}" position.

YOUR TASK:
1. Introduce yourself briefly (${personaConfig.name}, position - 1 sentence)
2. Immediately ${randomFirstQuestion}

IMPORTANT:
- Speak naturally but to the point
- No unnecessary introductions about weather/coffee/journey
- 2-3 sentences maximum
- Get straight to the point
- RESPOND ONLY IN ENGLISH`
      : `${personaConfig.style}

СИТУАЦИЯ: Начало собеседования на позицию "${position}".

ТВОЯ ЗАДАЧА:
1. Представься коротко (${personaConfig.name}, должность - 1 предложение)
2. Сразу ${randomFirstQuestion}

ВАЖНО:
- Говори естественно, но по делу
- Без лишних вступлений про погоду/кофе/дорогу
- 2-3 предложения максимум
- Сразу к сути`;

    const messages = [
      { role: 'system', text: systemPrompt },
      { role: 'user', text: lang === 'en' ? 'Start the interview' : 'Начни собеседование' }
    ];

    try {
      return await yandexGPTService.sendRequest(messages, { temperature: 0.85, maxTokens: 200 });
    } catch (error) {
      console.error('Error generating greeting:', error);
      // Fallback
      return lang === 'en'
        ? `Hi! My name is ${personaConfig.name}, I'm a ${personaConfig.title.toLowerCase()}. Nice to meet you! Tell me a bit about yourself and your experience in ${position}.`
        : `Привет! Меня зовут ${personaConfig.name}, я ${personaConfig.title.toLowerCase()}. Рад познакомиться! Расскажи немного о себе и своём опыте в ${position}.`;
    }
  }

  /**
   * Генерировать следующий вопрос на основе предыдущих ответов
   * Поддерживает естественный диалог и уникальные вопросы
   */
  async generateNextQuestion(persona, position, messageHistory, questionNumber, totalQuestions) {
    const personaConfig = this.getPersonaConfig(persona);
    if (!personaConfig) {
      throw new Error('Invalid persona');
    }

    // Случайные направления для вопросов - чтобы каждый раз было по-разному
    const questionDirections = [
      'Задай вопрос про конкретную проблему из практики',
      'Спроси про архитектурное решение или trade-off',
      'Попроси сравнить два подхода к решению задачи',
      'Задай вопрос про работу в команде и код-ревью',
      'Спроси про оптимизацию или производительность',
      'Задай вопрос про дебаг сложной проблемы',
      'Спроси про работу с легаси кодом',
      'Задай вопрос про тестирование и качество кода',
      'Спроси про взаимодействие с другими отделами (дизайн, PM)',
      'Задай вопрос про техдолг и рефакторинг',
      'Спроси про CI/CD и деплой',
      'Задай вопрос про мониторинг и логирование'
    ];
    const randomDirection = questionDirections[Math.floor(Math.random() * questionDirections.length)];

    // Стиль реакции на ответ
    const reactionStyles = [
      'Реагируй с интересом, если ответ хороший',
      'Можешь мягко указать на пробелы, если они есть',
      'Попроси уточнить интересный момент из ответа',
      'Поделись похожим опытом из своей практики (коротко)'
    ];
    const randomReaction = reactionStyles[Math.floor(Math.random() * reactionStyles.length)];

    const systemPrompt = `${personaConfig.style}

КОНТЕКСТ:
- Позиция: "${position}"
- Прогресс: вопрос ${questionNumber} из ${totalQuestions}
- Это ЖИВАЯ беседа, не допрос

ТВОЯ ЗАДАЧА:
1. Прочитай последний ответ кандидата
2. ${randomReaction}
3. Задай НОВЫЙ вопрос (${randomDirection})

ТРЕБОВАНИЯ К ВОПРОСУ:
- НЕ повторяй темы из предыдущих вопросов
- Придумай УНИКАЛЬНЫЙ вопрос, а не шаблонный
- Вопрос должен быть связан с позицией ${position}
- Можешь придумать конкретную ситуацию или сценарий

ПРАВИЛА ДИАЛОГА:
- Если кандидат задаёт вопрос - ответь коротко и вернись к теме
- Отвлечённые темы - 1 фраза максимум, сразу к делу
- Максимум 3 предложения в ответе
- Меньше болтовни, больше сути`;

    const messages = [
      { role: 'system', text: systemPrompt },
      ...messageHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        text: msg.content
      }))
    ];

    try {
      return await yandexGPTService.sendRequest(messages, { temperature: 0.85, maxTokens: 250 });
    } catch (error) {
      console.error('Error generating next question:', error);
      return 'Понял. А какой самый сложный проект у тебя был?';
    }
  }

  /**
   * Проверить, является ли сообщение отвлечённой темой
   */
  isOffTopicMessage(message) {
    const offTopicPatterns = [
      /как (дела|настроение|погода|день)/i,
      /привет|здравствуй/i,
      /кофе|чай|вод/i,
      /волну|нервнича|переживаю/i,
      /а (ты|вы) (как|откуда|где|сколько)/i,
      /расскажи(те)? о себе/i,
      /какой (у вас|у тебя)/i,
    ];
    return offTopicPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Оценить ответ пользователя через YandexGPT
   * ЖЁСТКАЯ оценка - как на реальном собеседовании
   */
  async evaluateAnswer(answer, position, questionContext) {
    if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
      return {
        score: 0,
        evaluation: 'Ответ отсутствует. Автоматический отказ.'
      };
    }

    const wordCount = answer.trim().split(/\s+/).filter(w => w.length > 0).length;

    // Слишком короткий ответ - жёсткая оценка
    if (wordCount < 5) {
      return {
        score: 1,
        evaluation: 'Ответ из нескольких слов неприемлем. Требуется развёрнутый ответ.'
      };
    }

    if (wordCount < 15) {
      return {
        score: 2,
        evaluation: 'Слишком краткий ответ. На собеседовании ожидается детальное объяснение.'
      };
    }

    const systemPrompt = `Ты - СТРОГИЙ эксперт по оценке ответов на IT-собеседованиях.
Позиция: "${position}"

КРИТЕРИИ ОЦЕНКИ (будь ЖЁСТКИМ):
- 1-2: Ответ не по теме, полная чушь, или "не знаю"
- 3-4: Очень поверхностный ответ, нет понимания сути, общие фразы без конкретики
- 5: Базовое понимание есть, но много неточностей или пробелов
- 6: Средний ответ - знает основы, но не хватает глубины или примеров
- 7: Хороший ответ - правильно, с примерами, но можно глубже
- 8: Отличный ответ - глубокое понимание, практический опыт виден
- 9: Превосходный ответ - экспертный уровень, нюансы, edge cases
- 10: Идеальный ответ (ставится ОЧЕНЬ редко) - исчерпывающе, с архитектурным мышлением

ВАЖНО:
- НЕ завышай оценки! Средний кандидат получает 4-6 баллов
- Оценка 7+ только за действительно качественные ответы с конкретикой
- Оценка 8+ только если видно реальный опыт и глубокое понимание
- Общие фразы типа "это важно для производительности" без деталей = максимум 5

Верни СТРОГО JSON: {"score": число, "evaluation": "краткая критичная оценка в 1 предложение"}`;

    const messages = [
      { role: 'system', text: systemPrompt },
      { role: 'user', text: `Контекст вопроса: ${questionContext || 'Вопрос по специальности'}\n\nОтвет кандидата: ${answer}` }
    ];

    try {
      const response = await yandexGPTService.sendRequest(messages, { temperature: 0.3, maxTokens: 150 });

      // Пытаемся распарсить JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          score: Math.max(1, Math.min(10, parsed.score || 5)),
          evaluation: parsed.evaluation || 'Ответ оценён.'
        };
      }

      // Fallback если не JSON - даём среднюю оценку
      return { score: 4, evaluation: response.slice(0, 200) };
    } catch (error) {
      console.error('Error evaluating answer:', error);

      // Fallback на строгую оценку по длине
      let score = 4;
      if (wordCount >= 100) score = 6;
      else if (wordCount >= 60) score = 5;
      else if (wordCount >= 30) score = 4;
      else score = 3;

      return {
        score,
        evaluation: wordCount >= 30 ? 'Ответ требует анализа.' : 'Недостаточно развёрнутый ответ.'
      };
    }
  }

  /**
   * Сгенерировать итоговую оценку интервью через YandexGPT
   */
  async buildSummary(messages, position) {
    const userAnswers = messages.filter(m => m.role === 'user');

    if (!userAnswers.length) {
      return {
        overallScore: 0,
        strengths: [],
        weaknesses: ['Интервью не пройдено - ответы отсутствуют'],
        feedback: 'Вы не дали ни одного ответа. На реальном собеседовании это означает отказ.',
      };
    }

    // Если есть оценки от AI, используем их как базу
    // Применяем более строгую формулу: оценка 5/10 = 45%, 7/10 = 65%, 10/10 = 100%
    const scoredMessages = messages.filter(m => m.role === 'assistant' && typeof m.score === 'number');
    let baseScore = 40; // Базовая оценка снижена
    if (scoredMessages.length) {
      const avgScore = scoredMessages.reduce((sum, msg) => sum + msg.score, 0) / scoredMessages.length;
      // Строгая конвертация: score 5 = 45%, score 6 = 55%, score 7 = 65%, score 8 = 75%
      baseScore = Math.round((avgScore - 1) * 11.1); // 1->0, 5->44, 7->67, 10->100
      baseScore = Math.max(0, Math.min(100, baseScore));
    }

    const systemPrompt = `Ты - СТРОГИЙ эксперт по оценке собеседований на позицию "${position}".

ШКАЛА ОЦЕНКИ (как на реальном собеседовании в IT-компании):
- 0-20: Провал - не знает основ, отвечает невпопад или молчит
- 21-35: Очень слабо - отрывочные знания, серьёзные пробелы
- 36-50: Слабо - базовые знания есть, но много ошибок
- 51-60: Ниже среднего - знает теорию, но поверхностно
- 61-70: Средне - понимает основы, но не хватает глубины/практики
- 71-80: Хорошо - уверенные знания, есть релевантный опыт
- 81-90: Отлично - глубокое понимание, сильный практический опыт
- 91-100: Эксперт (ОЧЕНЬ редко) - исчерпывающие знания

ШТРАФЫ (применяй обязательно):
- Неправильный ответ: -15 баллов от возможных
- "Не знаю" или молчание: -20 баллов
- Поверхностный ответ без деталей: -10 баллов
- Отсутствие примеров из практики: -5 баллов

ВАЖНО:
- Базовая оценка по ответам: ${baseScore}/100
- НЕ завышай! Типичный кандидат получает 40-60 баллов
- 70+ только за конкретные, глубокие ответы с примерами
- 80+ исключительно редко - только при экспертных ответах
- Корректируй baseScore в меньшую сторону при слабых ответах!

Проанализируй каждый ответ критично. Верни JSON:
{
  "overallScore": число (может быть НИЖЕ baseScore при слабых ответах!),
  "strengths": ["конкретная сильная сторона из ответов"],
  "weaknesses": ["конкретная слабость/ошибка + что изучить"],
  "feedback": "честный критичный отзыв: что хорошо, что плохо, общая рекомендация"
}`;

    const conversationText = messages.map(m =>
      `${m.role === 'user' ? 'Кандидат' : 'Интервьюер'}: ${m.content}`
    ).join('\n\n');

    const gptMessages = [
      { role: 'system', text: systemPrompt },
      { role: 'user', text: conversationText }
    ];

    try {
      const response = await yandexGPTService.sendRequest(gptMessages, { temperature: 0.3, maxTokens: 500 });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          overallScore: Math.max(0, Math.min(100, parsed.overallScore || baseScore)),
          strengths: parsed.strengths || ['Участие в интервью'],
          weaknesses: parsed.weaknesses || [],
          feedback: parsed.feedback || 'Интервью завершено.',
        };
      }

      throw new Error('No JSON in response');
    } catch (error) {
      console.error('Error building summary:', error);

      // Fallback на базовую оценку
      const strengths = [];
      const weaknesses = [];
      let feedback = '';

      if (baseScore >= 80) {
        strengths.push('Отличные развёрнутые ответы');
        feedback = 'Отличное интервью! Вы показали профессионализм.';
      } else if (baseScore >= 60) {
        strengths.push('Хорошие ответы на вопросы');
        feedback = 'Неплохое интервью. Есть над чем работать.';
      } else if (baseScore >= 40) {
        weaknesses.push('Ответы поверхностные');
        feedback = 'Слабое интервью. Нужна подготовка.';
      } else {
        weaknesses.push('Критически слабые ответы');
        feedback = 'Требуется серьёзная подготовка к собеседованиям.';
      }

      return {
        overallScore: baseScore,
        strengths: strengths.length ? strengths : ['Вы пытались отвечать'],
        weaknesses,
        feedback,
      };
    }
  }
}

module.exports = new AudioInterviewService();
