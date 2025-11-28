const axios = require('axios');

const YANDEX_API_KEY = process.env.YANDEX_API_KEY;
const YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID;
const YANDEX_API_URL = process.env.YANDEX_API_URL;


class YandexGPTService {
  /**
   * Отправить запрос к YandexGPT
   */
  async sendRequest(messages, options = {}) {
    if (!YANDEX_API_KEY || !YANDEX_FOLDER_ID) {
      throw new Error('YandexGPT credentials not configured');
    }

    const {
      temperature = 0.7,
      maxTokens = 2000
    } = options;

    try {
      const response = await axios.post(
        YANDEX_API_URL,
        {
          modelUri: `gpt://${YANDEX_FOLDER_ID}/yandexgpt-lite/latest`,
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
            'Authorization': `Api-Key ${YANDEX_API_KEY}`,
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
  
  // Определяем количество вопросов на каждую технологию
  const questionsPerTech = Math.floor(questionsCount / technologies.length);
  
  // Определяем текущую технологию на основе прогресса
  const currentTechIndex = Math.min(
    Math.floor((aiMessagesCount - 1) / questionsPerTech),
    technologies.length - 1
  );
  const currentTech = technologies[currentTechIndex];
  const questionInCurrentTech = ((aiMessagesCount - 1) % questionsPerTech) + 1;
  
  const systemPrompt = `Ты - технический интервьюер. Позиция: ${direction} ${level}.

    ТЕКУЩАЯ ТЕМА: ${currentTech} (вопрос ${questionInCurrentTech}/${questionsPerTech})

    КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА:
    1. ВСЕГДА задавай ТОЛЬКО ОДИН вопрос
    2. НЕ задавай уточняющих вопросов - сразу переходи к новой теме
    3. Если ответ правильный → кратко ("Верно") + новый вопрос по ${currentTech}
    4. Если ответ неполный/неточный → СРАЗУ новый вопрос по ДРУГОЙ теме в ${currentTech}
    5. НЕ проси примеры, НЕ проси уточнений - просто задавай следующий вопрос
    6. Держи нейтральный тон без восторгов

    ВОПРОСЫ ПО ${currentTech}:
    ${currentTech === 'React' ? '- Что такое хуки?\n- Объясните Virtual DOM\n- Для чего useEffect?\n- Что такое props?' : ''}
    ${currentTech === 'JavaScript' ? '- Что такое замыкание?\n- Разница var и let?\n- Что такое промисы?\n- Объясните event loop' : ''}
    ${currentTech === 'TypeScript' ? '- Зачем TypeScript?\n- Что такое интерфейсы?\n- Что такое дженерики?\n- Разница type и interface?' : ''}
    ${currentTech === 'Node.js' ? '- Что такое middleware?\n- Что такое event loop?\n- Что такое streams?\n- Зачем async/await?' : ''}

    Задай ОДИН короткий вопрос по ${currentTech}. НЕ уточняй ответы - переходи к новым темам.`;

  const messages = [
    { role: 'system', text: systemPrompt },
    ...messageHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      text: msg.content
    }))
  ];

  return await this.sendRequest(messages, { temperature: 0.6, maxTokens: 400 });
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