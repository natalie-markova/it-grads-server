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
        const systemPrompt = `Ты - технический интервьюер. Проводишь собеседование для ${direction}-разработчика уровня ${level}.
    Технологии для проверки: ${technologies.join(', ')}.

    ВАЖНЫЕ ПРАВИЛА:
    1. Задавай ТОЛЬКО ОДИН вопрос за раз
    2. Начни с приветствия и ОДНОГО простого теоретического вопроса
    3. Вопросы должны быть конкретными и техническими
    4. Фокусируйся на знании основ и теории
    5. Примеры вопросов: "Что такое замыкание в JavaScript?", "Объясните разницу между let и const", "Что такое Virtual DOM в React?"

    Начни с короткого приветствия и задай ОДИН простой теоретический вопрос.`;

        const messages = [
            { role: 'system', text: systemPrompt },
            { role: 'user', text: 'Начни интервью с приветствия и первого вопроса' }
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
  
  const systemPrompt = `Ты - технический интервьюер для ${direction}-разработчика уровня ${level}.

    ТЕКУЩАЯ ТЕМА: ${currentTech}
    Вопрос ${questionInCurrentTech} из ${questionsPerTech} по теме "${currentTech}"
    Всего технологий: ${technologies.join(', ')}

    СТРОГИЕ ПРАВИЛА:
    1. Задавай вопросы ТОЛЬКО по текущей теме: ${currentTech}
    2. Задавай ТОЛЬКО ОДИН вопрос за раз
    3. Если ответ хороший - кратко похвали (1 предложение) и задай следующий вопрос по ${currentTech}
    4. Если ответ неполный - попроси уточнить ОДНИМ вопросом по ${currentTech}
    5. Вопросы должны быть теоретическими и практическими
    6. После ${questionsPerTech} вопросов по ${currentTech}, система автоматически переключит на следующую тему

    Примеры вопросов по ${currentTech}:
    ${currentTech === 'React' ? '- Что такое хуки? Назовите основные\n- Объясните Virtual DOM\n- Что такое props drilling?' : ''}
    ${currentTech === 'JavaScript' ? '- Что такое замыкание?\n- Объясните event loop\n- Разница между var, let, const?' : ''}
    ${currentTech === 'TypeScript' ? '- Что такое типы в TypeScript?\n- Что такое interface и type?\n- Объясните generic types' : ''}

    Задай ОДИН вопрос по теме ${currentTech}.`;

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