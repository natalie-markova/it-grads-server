/**
 * Audio Interview Service - YandexGPT powered
 * Генерация вопросов и оценка ответов через YandexGPT
 * Поддержка естественного диалога с отвлечёнными темами
 */

const yandexGPTService = require('./yandexGPT.service');

const personaPresets = {
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
};

class AudioInterviewService {
  getPersonaConfig(persona) {
    return personaPresets[persona] || null;
  }

  /**
   * Генерировать приветствие и первый вопрос через YandexGPT
   * Полностью динамическая генерация для максимальной рандомизации
   */
  async generateGreeting(persona, position) {
    const personaConfig = this.getPersonaConfig(persona);
    if (!personaConfig) {
      throw new Error('Invalid persona');
    }

    // Случайные варианты первого вопроса для разнообразия
    const firstQuestionTypes = [
      'Спроси о недавнем проекте, которым кандидат гордится',
      'Попроси рассказать о самой интересной задаче за последний год',
      'Спроси, что привлекло в этой позиции',
      'Попроси кратко описать свой путь в разработке',
      'Спроси о любимом стеке технологий и почему',
      'Попроси рассказать о чём-то новом, что недавно изучал',
      'Спроси о самом сложном баге, который приходилось искать'
    ];
    const randomFirstQuestion = firstQuestionTypes[Math.floor(Math.random() * firstQuestionTypes.length)];

    // Случайное настроение/вайб для начала
    const moods = [
      'У тебя сегодня хорошее настроение, ты настроен на продуктивную беседу.',
      'Ты немного устал от формальных интервью и хочешь поговорить по-человечески.',
      'Тебе искренне интересен кандидат как специалист.',
      'Ты в приподнятом настроении после хорошего кофе.'
    ];
    const randomMood = moods[Math.floor(Math.random() * moods.length)];

    const systemPrompt = `${personaConfig.style}

${randomMood}

СИТУАЦИЯ: Начало собеседования на позицию "${position}".

ТВОЯ ЗАДАЧА:
1. Представься по имени (${personaConfig.name}) - можешь добавить что-то неформальное
2. Скажи пару слов, чтобы расслабить кандидата (погода, офис, как добрался - придумай что-то)
3. ${randomFirstQuestion}

ВАЖНО:
- Говори ЕСТЕСТВЕННО, как живой человек
- НЕ используй шаблонные фразы типа "расскажите о себе"
- Придумай что-то оригинальное
- 3-4 предложения максимум`;

    const messages = [
      { role: 'system', text: systemPrompt },
      { role: 'user', text: 'Начни собеседование' }
    ];

    try {
      return await yandexGPTService.sendRequest(messages, { temperature: 0.9, maxTokens: 300 });
    } catch (error) {
      console.error('Error generating greeting:', error);
      // Fallback
      return `Привет! Меня зовут ${personaConfig.name}, я ${personaConfig.title.toLowerCase()}. Рад познакомиться! Расскажи немного о себе и своём опыте в ${position}.`;
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
- Если кандидат задаёт вопрос тебе - отвечай!
- Если кандидат говорит на отвлечённую тему - поддержи коротко, потом вернись к делу
- Максимум 4 предложения в ответе`;

    const messages = [
      { role: 'system', text: systemPrompt },
      ...messageHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        text: msg.content
      }))
    ];

    try {
      return await yandexGPTService.sendRequest(messages, { temperature: 0.9, maxTokens: 350 });
    } catch (error) {
      console.error('Error generating next question:', error);
      return 'Интересно! А расскажи о самом сложном проекте в твоей карьере - как справился с трудностями?';
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
    const scoredMessages = messages.filter(m => m.role === 'assistant' && typeof m.score === 'number');
    let baseScore = 50;
    if (scoredMessages.length) {
      const avgScore = scoredMessages.reduce((sum, msg) => sum + msg.score, 0) / scoredMessages.length;
      baseScore = Math.round(avgScore * 10);
    }

    const systemPrompt = `Ты - СТРОГИЙ эксперт по оценке собеседований на позицию "${position}".

ШКАЛА ОЦЕНКИ (будь ЖЁСТКИМ как реальный интервьюер):
- 0-20: Провал - кандидат не знает основ, отвечает невпопад
- 21-40: Слабо - есть базовые знания, но критические пробелы
- 41-55: Ниже среднего - знает теорию поверхностно, нет практики
- 56-70: Средне - базовые знания есть, но не хватает глубины
- 71-80: Хорошо - уверенные знания, есть опыт
- 81-90: Отлично - глубокие знания, виден серьёзный опыт
- 91-100: Исключительно (редко!) - экспертный уровень

ВАЖНО:
- Средний кандидат получает 45-60 баллов
- 70+ только за качественные ответы с конкретикой
- 80+ редкость - только при глубоком понимании темы

Базовая оценка: ${baseScore}/100.

Верни JSON:
{
  "overallScore": число от 0 до 100,
  "strengths": ["конкретная сильная сторона"],
  "weaknesses": ["конкретная слабость с рекомендацией"],
  "feedback": "честный критичный отзыв в 2-3 предложения"
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
