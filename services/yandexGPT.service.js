const axios = require('axios');

class YandexGPTService {
  // Геттеры для динамического получения env переменных (после загрузки dotenv)
  get apiKey() {
    return process.env.YANDEX_API_KEY;
  }

  get folderId() {
    return process.env.YANDEX_FOLDER_ID;
  }

  get apiUrl() {
    return process.env.YANDEX_API_URL || 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
  }

  /**
   * Отправить запрос к YandexGPT
   */
  async sendRequest(messages, options = {}) {
    if (!this.apiKey || !this.folderId) {
      console.error('YandexGPT: Missing credentials - API_KEY:', !!this.apiKey, 'FOLDER_ID:', !!this.folderId);
      throw new Error('YandexGPT credentials not configured');
    }

    const {
      temperature = 0.7,
      maxTokens = 2000
    } = options;

    try {
      console.log('YandexGPT: Sending request to', this.apiUrl);
      console.log('YandexGPT: Folder ID:', this.folderId);
      console.log('YandexGPT: API Key (first 10 chars):', this.apiKey?.substring(0, 10) + '...');

      const response = await axios.post(
        this.apiUrl,
        {
          modelUri: `gpt://${this.folderId}/yandexgpt-lite/latest`,
          completionOptions: {
            stream: false,
            temperature,
            maxTokens
          },
          messages: messages.map(msg => ({
            role: msg.role,
            text: msg.text
          }))
        },
        {
          headers: {
            'Authorization': `Api-Key ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.result.alternatives[0].message.text;
    } catch (error) {
      console.error('YandexGPT API Error:', error.response?.data || error.message);
      throw new Error('Failed to get response from YandexGPT');
    }
  }

  /**
 * Создать приветственное сообщение для начала интервью
 * Полностью генерируется нейросетью для максимальной рандомизации
 */
async generateGreeting(direction, technologies, level, questionsCount) {
    const levelContext = {
      'junior': 'начинающего специалиста (0-1 год опыта)',
      'middle': 'middle-разработчика (2-4 года опыта)',
      'senior': 'senior-разработчика (5+ лет опыта)'
    };

    const firstTech = technologies[0];

    // Случайный стиль интервьюера для разнообразия
    const interviewerStyles = [
      'Ты дружелюбный, но требовательный интервьюер. Создаёшь комфортную атмосферу.',
      'Ты технический эксперт, который любит копать вглубь. Задаёшь уточняющие вопросы.',
      'Ты практик с большим опытом. Интересуют реальные кейсы и решения.',
      'Ты строгий, но справедливый интервьюер. Ценишь точность и конкретику.'
    ];
    const randomStyle = interviewerStyles[Math.floor(Math.random() * interviewerStyles.length)];

    // Случайный тип первого вопроса
    const questionTypes = [
      'концептуальный вопрос на понимание основ',
      'практический вопрос из реального опыта',
      'вопрос на сравнение подходов или технологий',
      'вопрос про best practices и паттерны',
      'вопрос про решение типичной проблемы'
    ];
    const randomQuestionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

    const systemPrompt = `${randomStyle}

Проводишь собеседование на позицию ${direction}-разработчика уровня ${levelContext[level] || 'middle'}.
Технологии: ${technologies.join(', ')}.
Всего будет ${questionsCount} вопросов.

ТВОЯ ЗАДАЧА:
1. Представься коротко (имя, должность - 1 предложение)
2. Сразу переходи к делу - задай ПЕРВЫЙ вопрос по ${firstTech}

ТРЕБОВАНИЯ К ПЕРВОМУ ВОПРОСУ:
- Тип вопроса: ${randomQuestionType}
- НЕ задавай банальные вопросы типа "что такое ${firstTech}"
- Придумай УНИКАЛЬНЫЙ вопрос для реального собеседования
- Вопрос должен соответствовать уровню ${level}

ВАЖНО: Меньше вступлений, больше сути. Не нужно расшаркиваться.`;

    const messages = [
        { role: 'system', text: systemPrompt },
        { role: 'user', text: 'Начни интервью' }
    ];

    return await this.sendRequest(messages, { temperature: 0.9 });
}

/**
 * Получить следующий вопрос на основе истории диалога
 * Вопросы генерируются нейросетью полностью динамически
 */
async generateNextMessage(direction, technologies, level, questionsCount, messageHistory) {
  const aiMessagesCount = messageHistory.filter(msg => msg.role === 'assistant').length;

  if (aiMessagesCount >= questionsCount) {
    return 'Спасибо за ответы! Интервью завершено.';
  }

  const questionsPerTech = Math.ceil(questionsCount / technologies.length);
  const currentTechIndex = Math.min(
    Math.floor((aiMessagesCount - 1) / questionsPerTech),
    technologies.length - 1
  );
  const currentTech = technologies[currentTechIndex];

  const levelContext = {
    'junior': 'Уровень junior: спрашивай про основы, но не банальности. Ищи понимание концепций.',
    'middle': 'Уровень middle: практические кейсы, архитектурные решения, реальные проблемы и их решения.',
    'senior': 'Уровень senior: глубокие вопросы про архитектуру, оптимизацию, trade-offs, масштабирование.'
  };

  // Случайные модификаторы для разнообразия вопросов
  const questionAngles = [
    'Спроси про конкретную проблему, которую кандидат мог встретить',
    'Попроси сравнить два подхода или решения',
    'Задай вопрос про оптимизацию или производительность',
    'Спроси про отладку или поиск багов',
    'Попроси объяснить как работает что-то "под капотом"',
    'Задай практический кейс из реальной разработки',
    'Спроси про edge cases или нетипичные сценарии',
    'Попроси привести пример из личного опыта',
    'Спроси про best practices и почему они важны',
    'Задай вопрос про интеграцию с другими технологиями'
  ];
  const randomAngle = questionAngles[Math.floor(Math.random() * questionAngles.length)];

  const systemPrompt = `Ты опытный технический интервьюер. ${levelContext[level] || levelContext['middle']}

КОНТЕКСТ:
- Позиция: ${direction}-разработчик
- Технологии на интервью: ${technologies.join(', ')}
- Прогресс: вопрос ${aiMessagesCount} из ${questionsCount}
- Сейчас проверяем: ${currentTech}

ТВОЯ ЗАДАЧА:
1. Прочитай последний ответ кандидата
2. Дай короткую, но СОДЕРЖАТЕЛЬНУЮ обратную связь (что хорошо, что можно улучшить, что упущено)
3. Задай НОВЫЙ вопрос по ${currentTech}

ТРЕБОВАНИЯ К ВОПРОСУ:
- ${randomAngle}
- НЕ повторяй темы из предыдущих вопросов (смотри историю)
- Вопрос должен быть УНИКАЛЬНЫМ и интересным
- Избегай шаблонных вопросов типа "что такое X" или "какие типы X бывают"
- Придумай сценарий, проблему или ситуацию

ФОРМАТ:
[Краткая обратная связь 1-2 предложения] + [Следующий вопрос]

Без лишней воды, сразу к делу.`;

  const messages = [
    { role: 'system', text: systemPrompt },
    ...messageHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      text: msg.content
    }))
  ];

  return await this.sendRequest(messages, { temperature: 0.8, maxTokens: 300 });
}

  /**
   * Сгенерировать итоговую оценку интервью
   */
  async generateFeedback(direction, technologies, level, messageHistory) {
    const levelExpectations = {
      'junior': 'Для junior ожидается: понимание базовых концепций, способность объяснить простые вещи, готовность учиться.',
      'middle': 'Для middle ожидается: уверенное владение технологиями, понимание best practices, опыт решения реальных задач.',
      'senior': 'Для senior ожидается: глубокое понимание архитектуры, оптимизации, паттернов, способность принимать технические решения.'
    };

    // Форматируем историю для лучшего анализа
    const formattedHistory = messageHistory.map((msg, i) => {
      if (msg.role === 'assistant') {
        return `ИНТЕРВЬЮЕР: ${msg.content}`;
      }
      return `КАНДИДАТ: ${msg.content}`;
    }).join('\n\n');

    const systemPrompt = `Ты - эксперт по оценке технических интервью. Проанализируй интервью на позицию ${direction}-разработчика уровня ${level}.

Технологии: ${technologies.join(', ')}
${levelExpectations[level] || levelExpectations['middle']}

КРИТЕРИИ ОЦЕНКИ:
- Правильность ответов (знание фактов)
- Глубина понимания (не просто заучил, а понимает)
- Полнота ответов (раскрыл тему)
- Практический опыт (примеры из практики)

ПРАВИЛА ОЦЕНКИ:
- 0-30: Не знает основ, критические пробелы
- 31-50: Знает базу, но много пробелов
- 51-70: Средний уровень, есть пробелы
- 71-85: Хороший уровень, незначительные пробелы
- 86-100: Отличный уровень, глубокие знания

Верни ТОЛЬКО JSON без дополнительного текста:
{
  "totalScore": число,
  "strengths": ["конкретная сильная сторона 1", "конкретная сильная сторона 2"],
  "weaknesses": ["конкретная слабость 1", "конкретная слабость 2"],
  "recommendations": ["конкретная рекомендация 1", "конкретная рекомендация 2"],
  "detailedFeedback": "подробный отзыв 3-5 предложений"
}`;

    const messages = [
      { role: 'system', text: systemPrompt },
      { role: 'user', text: `ИСТОРИЯ ИНТЕРВЬЮ:\n\n${formattedHistory}\n\nСоздай итоговую оценку.` }
    ];

    const response = await this.sendRequest(messages, { temperature: 0.3, maxTokens: 800 });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Валидация структуры
        return {
          totalScore: Math.min(100, Math.max(0, parseInt(parsed.totalScore) || 50)),
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Участие в интервью'],
          weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : ['Требуется дополнительный анализ'],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['Продолжайте развиваться'],
          detailedFeedback: parsed.detailedFeedback || response
        };
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Failed to parse feedback JSON:', error, 'Response:', response);
      return {
        totalScore: 50,
        strengths: ['Участие в интервью'],
        weaknesses: ['Не удалось детально проанализировать'],
        recommendations: ['Продолжайте практиковаться'],
        detailedFeedback: response
      };
    }
  }
}

module.exports = new YandexGPTService();