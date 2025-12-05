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
   */
  async generateGreeting(persona, position) {
    const personaConfig = this.getPersonaConfig(persona);
    if (!personaConfig) {
      throw new Error('Invalid persona');
    }

    const systemPrompt = `${personaConfig.style}

СИТУАЦИЯ: Начало собеседования на позицию "${position}".

ПРАВИЛА:
1. Представься по имени (${personaConfig.name}) и должности
2. Можешь добавить что-то человечное (как добрались, не волнуйтесь и т.п.)
3. Задай первый вопрос - он должен быть лёгким для разогрева (расскажите о себе / своём опыте / почему эта позиция)
4. Общая длина - 3-4 предложения, говори естественно`;

    const messages = [
      { role: 'system', text: systemPrompt },
      { role: 'user', text: 'Начни собеседование' }
    ];

    try {
      return await yandexGPTService.sendRequest(messages, { temperature: 0.7, maxTokens: 250 });
    } catch (error) {
      console.error('Error generating greeting:', error);
      // Fallback
      return `Привет! Меня зовут ${personaConfig.name}, я ${personaConfig.title.toLowerCase()}. Рад познакомиться! Расскажи немного о себе и своём опыте в ${position}.`;
    }
  }

  /**
   * Генерировать следующий вопрос на основе предыдущих ответов
   * Поддерживает естественный диалог и отвлечённые темы
   */
  async generateNextQuestion(persona, position, messageHistory, questionNumber, totalQuestions) {
    const personaConfig = this.getPersonaConfig(persona);
    if (!personaConfig) {
      throw new Error('Invalid persona');
    }

    // Анализируем последнее сообщение - это вопрос или отвлечённая тема?
    const lastUserMessage = messageHistory.filter(m => m.role === 'user').pop();
    const isOffTopic = lastUserMessage && this.isOffTopicMessage(lastUserMessage.content);

    const systemPrompt = `${personaConfig.style}

КОНТЕКСТ:
- Позиция: "${position}"
- Прогресс: вопрос ${questionNumber} из ${totalQuestions}
- Ты ведёшь ЖИВОЙ диалог, а не допрос

ПРАВИЛА ОБЩЕНИЯ:
1. Отвечай ЕСТЕСТВЕННО, как реальный человек на собеседовании
2. Если кандидат задаёт вопрос тебе - отвечай! Это нормальная часть интервью
3. Если кандидат говорит на отвлечённую тему (погода, кофе, волнение) - поддержи коротко, потом мягко вернись к делу
4. Если кандидат просит уточнить вопрос - уточни
5. После обмена репликами задай следующий вопрос по специальности

ФОРМАТ ОТВЕТА:
- Если это ответ на вопрос по делу: "[Короткая реакция на ответ]. [Следующий вопрос]"
- Если это отвлечённая тема: "[Поддержать 1-2 предложения]. Но вернёмся к интервью - [вопрос]"
- Если кандидат спрашивает тебя: "[Твой ответ]. А у тебя как с этим? / Кстати, [вопрос]"

Максимум 4 предложения в ответе.`;

    const messages = [
      { role: 'system', text: systemPrompt },
      ...messageHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        text: msg.content
      }))
    ];

    try {
      return await yandexGPTService.sendRequest(messages, { temperature: 0.8, maxTokens: 300 });
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
