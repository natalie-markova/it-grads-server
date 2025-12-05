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
    const levelContext = {
      'junior': 'начинающего',
      'middle': 'среднего уровня',
      'senior': 'ведущего'
    };

    const firstTech = technologies[0];
    const techTopics = this.getTechTopics(firstTech);

    const systemPrompt = `Ты - опытный технический интервьюер. Проводишь собеседование на позицию ${direction}-разработчика ${levelContext[level] || 'среднего уровня'}.

Технологии для проверки: ${technologies.join(', ')}.
Всего будет ${questionsCount} вопросов.

ПРАВИЛА:
- Представься кратко (1 предложение)
- Объясни формат интервью (1 предложение)
- Задай ПЕРВЫЙ вопрос по ${firstTech}
- Вопрос должен быть конкретным и техническим

ТЕМЫ ДЛЯ ПЕРВОГО ВОПРОСА ПО ${firstTech}: ${techTopics}

Пример формата:
"Привет! Я буду проводить техническое интервью. Мы обсудим ${technologies.join(', ')}. Начнём с ${firstTech}: [конкретный вопрос]"`;

    const messages = [
        { role: 'system', text: systemPrompt },
        { role: 'user', text: 'Начни интервью' }
    ];

    return await this.sendRequest(messages, { temperature: 0.6 });
}

/**
 * Получить темы для технологии
 */
getTechTopics(tech) {
  const topics = {
    'React': 'хуки (useState, useEffect, useContext, useMemo, useCallback), Virtual DOM, props vs state, context API, lifecycle методы, refs, мемоизация, React.memo, порталы, error boundaries',
    'JavaScript': 'замыкания, hoisting, let/const/var, промисы, async/await, event loop, this, прототипы, классы, модули ES6, spread/rest операторы, деструктуризация, Map/Set',
    'TypeScript': 'типы vs интерфейсы, дженерики, union/intersection типы, enum, декораторы, utility types (Partial, Pick, Omit), type guards, infer, conditional types',
    'Node.js': 'модули CommonJS/ESM, event loop, streams, buffer, middleware, кластеризация, process, child_process, fs, path, работа с БД',
    'HTML': 'семантические теги, формы, доступность (a11y), meta-теги, SEO, валидация, HTML5 API',
    'CSS': 'flexbox, grid, позиционирование, специфичность селекторов, БЭМ, препроцессоры, CSS-переменные, анимации, media queries',
    'SQL': 'JOIN типы, индексы, транзакции, нормализация, агрегатные функции, подзапросы, оптимизация запросов',
    'PostgreSQL': 'типы данных, индексы (B-tree, GIN, GiST), JSONB, партиционирование, репликация, EXPLAIN ANALYZE',
    'MongoDB': 'документы vs коллекции, индексы, агрегации, репликация, шардирование, транзакции',
    'Redis': 'типы данных, персистентность, pub/sub, кэширование, TTL, кластеризация',
    'Docker': 'образы vs контейнеры, Dockerfile, docker-compose, volumes, networks, multi-stage builds',
    'Git': 'rebase vs merge, cherry-pick, stash, reset vs revert, branching стратегии, конфликты',
    'REST API': 'HTTP методы, статус коды, версионирование, аутентификация, CORS, идемпотентность',
    'GraphQL': 'queries vs mutations, схема, resolvers, subscriptions, fragments, директивы',
    'Python': 'декораторы, генераторы, контекстные менеджеры, GIL, async/await, типизация',
    'Vue': 'реактивность, computed vs watch, директивы, lifecycle, Vuex/Pinia, composition API',
    'Angular': 'модули, компоненты, сервисы, DI, RxJS, pipes, guards, lazy loading',
    'Express': 'middleware, роутинг, обработка ошибок, валидация, аутентификация',
    'NestJS': 'модули, контроллеры, провайдеры, guards, interceptors, pipes, декораторы'
  };
  return topics[tech] || 'основные концепции, best practices, типичные задачи, архитектура';
}

/**
 * Получить следующий вопрос на основе истории диалога
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
  const questionInCurrentTech = ((aiMessagesCount - 1) % questionsPerTech) + 1;

  const techTopics = this.getTechTopics(currentTech);

  const levelContext = {
    'junior': 'Задавай базовые вопросы на понимание основ. Уровень: начинающий разработчик.',
    'middle': 'Задавай вопросы среднего уровня сложности, включая практические кейсы. Уровень: опытный разработчик.',
    'senior': 'Задавай сложные вопросы на глубокое понимание, архитектуру и оптимизацию. Уровень: ведущий разработчик.'
  };

  const systemPrompt = `Ты - опытный технический интервьюер на позицию ${direction} разработчика.
${levelContext[level] || levelContext['middle']}

ПРОГРЕСС: Вопрос ${aiMessagesCount} из ${questionsCount}
ТЕКУЩАЯ ТЕХНОЛОГИЯ: ${currentTech} (вопрос ${questionInCurrentTech} из ${questionsPerTech})

ТЕМЫ ДЛЯ ВОПРОСОВ ПО ${currentTech}: ${techTopics}

ПРАВИЛА:
1. ВНИМАТЕЛЬНО прочитай последний ответ кандидата
2. Дай КОНКРЕТНУЮ обратную связь (2-3 предложения): что верно, что неверно, что можно дополнить
3. Затем задай ОДИН новый вопрос по ${currentTech}
4. Вопрос должен быть по ДРУГОЙ теме, не повторяй уже заданные
5. Формулируй вопрос чётко и конкретно

ФОРМАТ ОТВЕТА:
[Обратная связь на ответ]

Следующий вопрос: [вопрос]`;

  const messages = [
    { role: 'system', text: systemPrompt },
    ...messageHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      text: msg.content
    }))
  ];

  return await this.sendRequest(messages, { temperature: 0.6, maxTokens: 300 });
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