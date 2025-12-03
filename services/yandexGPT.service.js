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
 */
    async generateGreeting(direction, technologies, level, questionsCount) {
        const systemPrompt = `Ты - технический интервьюер. Собеседование на позицию ${direction}-разработчика уровня ${level}.
    Технологии: ${technologies.join(', ')}.

    ПРАВИЛА:
    - Будь профессиональным, но не слишком формальным
    - Задавай ТОЛЬКО ОДИН вопрос за раз
    - Вопросы должны быть конкретными и техническими

    Начни с короткого приветствия и задай первый вопрос.`;

        const messages = [
            { role: 'system', text: systemPrompt },
            { role: 'user', text: 'Начни интервью' }
        ];

        return await this.sendRequest(messages, { temperature: 0.6 });
    }

/**
 * Получить следующий вопрос на основе истории диалога
 */
async generateNextMessage(direction, technologies, level, questionsCount, messageHistory) {
  // Подсчитываем количество вопросов от AI
  const aiMessagesCount = messageHistory.filter(msg => msg.role === 'assistant').length;

  // Проверяем, не превышено ли общее количество вопросов
  if (aiMessagesCount >= questionsCount) {
    return 'Спасибо за ответы! Интервью завершено.';
  }

  // Определяем количество вопросов на каждую технологию
  const questionsPerTech = Math.ceil(questionsCount / technologies.length);

  // Определяем текущую технологию
  const currentTechIndex = Math.min(
    Math.floor((aiMessagesCount - 1) / questionsPerTech),
    technologies.length - 1
  );
  const currentTech = technologies[currentTechIndex];
  const questionInCurrentTech = ((aiMessagesCount - 1) % questionsPerTech) + 1;

  const systemPrompt = `Ты - технический интервьюер. Позиция: ${direction} ${level}.

    ПРОГРЕСС: Вопрос ${aiMessagesCount}/${questionsCount}
    ТЕХНОЛОГИЯ: ${currentTech} (вопрос ${questionInCurrentTech}/${questionsPerTech})

    СТРОГИЕ ПРАВИЛА:
    1. Сначала дай КОРОТКУЮ обратную связь на последний ответ (1 предложение: "Верно" / "Не совсем верно" / "Неправильно")
    2. Затем задай ТОЛЬКО ОДИН новый вопрос по ${currentTech}
    3. Вопрос должен быть коротким (максимум 10 слов)
    4. НЕ повторяй уже заданные вопросы из истории диалога
    5. Игнорируй качество ответов - ВСЕГДА задавай новый вопрос по ДРУГОЙ теме
    6. Формат ответа: "Верно/Не верно. Следующий вопрос: ..."

    ТЕМЫ ПО ${currentTech}:
    ${currentTech === 'React' ? 'хуки, Virtual DOM, props, state, context, lifecycle, refs, мемоизация' : ''}
    ${currentTech === 'JavaScript' ? 'замыкания, переменные, промисы, event loop, this, прототипы, классы, модули' : ''}
    ${currentTech === 'TypeScript' ? 'типы, интерфейсы, дженерики, enum, декораторы, утилиты, type guards' : ''}
    ${currentTech === 'Node.js' ? 'модули, event loop, streams, buffer, middleware, async, process, cluster' : ''}

    Пример правильного ответа: "Верно! Что такое замыкание?"`;

  const messages = [
    { role: 'system', text: systemPrompt },
    ...messageHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      text: msg.content
    }))
  ];

  return await this.sendRequest(messages, { temperature: 0.7, maxTokens: 200 });
}

  /**
   * Сгенерировать итоговую оценку интервью
   */
  async generateFeedback(direction, technologies, level, messageHistory) {
    const systemPrompt = `Ты - эксперт по техническим интервью. Проанализируй прошедшее интервью для ${direction} разработчика уровня ${level} по технологиям: ${technologies.join(', ')}.

    Оцени:
    1. Общий уровень знаний (балл от 0 до 100)
    2. Сильные стороны (массив строк)
    3. Слабые стороны (массив строк)
    4. Рекомендации для улучшения (массив строк)
    5. Детальный отзыв

    Верни результат СТРОГО в формате JSON:
    {
    "totalScore": число от 0 до 100,
    "strengths": ["сильная сторона 1", "сильная сторона 2"],
    "weaknesses": ["слабость 1", "слабость 2"],
    "recommendations": ["рекомендация 1", "рекомендация 2"],
    "detailedFeedback": "подробный текстовый отзыв"
    }`;

    const messages = [
      { role: 'system', text: systemPrompt },
      { role: 'user', text: 'История интервью:\n' + JSON.stringify(messageHistory, null, 2) },
      { role: 'user', text: 'Создай итоговую оценку в формате JSON' }
    ];

    const response = await this.sendRequest(messages, { temperature: 0.3 });
    
    try {
      // Попытка извлечь JSON из ответа
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Failed to parse feedback JSON:', error);
      // Фолбэк на простую структуру
      return {
        totalScore: 70,
        strengths: ['Участие в интервью'],
        weaknesses: ['Не удалось определить'],
        recommendations: ['Продолжайте развиваться'],
        detailedFeedback: response
      };
    }
  }
}

module.exports = new YandexGPTService();