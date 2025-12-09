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
async generateGreeting(direction, technologies, level, questionsCount, lang = 'ru') {
    const isEn = lang === 'en';

    const levelContext = isEn ? {
      'junior': 'junior developer (0-1 years of experience)',
      'middle': 'middle developer (2-4 years of experience)',
      'senior': 'senior developer (5+ years of experience)'
    } : {
      'junior': 'начинающего специалиста (0-1 год опыта)',
      'middle': 'middle-разработчика (2-4 года опыта)',
      'senior': 'senior-разработчика (5+ лет опыта)'
    };

    const firstTech = technologies[0];

    // Случайный стиль интервьюера для разнообразия
    const interviewerStyles = isEn ? [
      { name: 'Alex', style: 'You are a friendly but demanding interviewer. You create a comfortable atmosphere.' },
      { name: 'David', style: 'You are a technical expert who likes to dig deep. You ask clarifying questions.' },
      { name: 'Michael', style: 'You are a practitioner with extensive experience. You are interested in real cases and solutions.' },
      { name: 'Andrew', style: 'You are a strict but fair interviewer. You value accuracy and specifics.' },
      { name: 'Elena', style: 'You are an attentive HR with a technical background. You know how to find an approach to everyone.' },
      { name: 'Steven', style: 'You are an experienced team lead. You are looking for a team player with good knowledge.' }
    ] : [
      { name: 'Алексей', style: 'Ты дружелюбный, но требовательный интервьюер. Создаёшь комфортную атмосферу.' },
      { name: 'Дмитрий', style: 'Ты технический эксперт, который любит копать вглубь. Задаёшь уточняющие вопросы.' },
      { name: 'Михаил', style: 'Ты практик с большим опытом. Интересуют реальные кейсы и решения.' },
      { name: 'Андрей', style: 'Ты строгий, но справедливый интервьюер. Ценишь точность и конкретику.' },
      { name: 'Елена', style: 'Ты внимательный HR с техническим бэкграундом. Умеешь найти подход к каждому.' },
      { name: 'Сергей', style: 'Ты опытный тимлид. Ищешь командного игрока с хорошими знаниями.' }
    ];
    const randomInterviewer = interviewerStyles[Math.floor(Math.random() * interviewerStyles.length)];

    // Случайный тип первого вопроса
    const questionTypes = isEn ? [
      'conceptual question about understanding the basics',
      'practical question from real experience',
      'question comparing approaches or technologies',
      'question about best practices and patterns',
      'question about solving a typical problem'
    ] : [
      'концептуальный вопрос на понимание основ',
      'практический вопрос из реального опыта',
      'вопрос на сравнение подходов или технологий',
      'вопрос про best practices и паттерны',
      'вопрос про решение типичной проблемы'
    ];
    const randomQuestionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

    const systemPrompt = isEn ? `Your name is ${randomInterviewer.name}. ${randomInterviewer.style}

You are conducting an interview for a ${direction} developer position at ${levelContext[level] || 'middle'} level.
Technologies: ${technologies.join(', ')}.
There will be ${questionsCount} questions in total.

YOUR TASK:
1. Introduce yourself: "Hi! My name is ${randomInterviewer.name}, I will be conducting the interview."
2. Get straight to the point - ask the FIRST question about ${firstTech}

REQUIREMENTS FOR THE FIRST QUESTION:
- Question type: ${randomQuestionType}
- DO NOT ask trivial questions like "what is ${firstTech}"
- Come up with a UNIQUE question for a real interview
- The question should match the ${level} level

IMPORTANT: Less introductions, more substance. No need for pleasantries.
RESPOND IN ENGLISH ONLY.` : `Тебя зовут ${randomInterviewer.name}. ${randomInterviewer.style}

Проводишь собеседование на позицию ${direction}-разработчика уровня ${levelContext[level] || 'middle'}.
Технологии: ${technologies.join(', ')}.
Всего будет ${questionsCount} вопросов.

ТВОЯ ЗАДАЧА:
1. Представься: "Привет! Меня зовут ${randomInterviewer.name}, я буду проводить собеседование."
2. Сразу переходи к делу - задай ПЕРВЫЙ вопрос по ${firstTech}

ТРЕБОВАНИЯ К ПЕРВОМУ ВОПРОСУ:
- Тип вопроса: ${randomQuestionType}
- НЕ задавай банальные вопросы типа "что такое ${firstTech}"
- Придумай УНИКАЛЬНЫЙ вопрос для реального собеседования
- Вопрос должен соответствовать уровню ${level}

ВАЖНО: Меньше вступлений, больше сути. Не нужно расшаркиваться.`;

    const messages = [
        { role: 'system', text: systemPrompt },
        { role: 'user', text: isEn ? 'Start the interview' : 'Начни интервью' }
    ];

    return await this.sendRequest(messages, { temperature: 0.9 });
}

/**
 * Получить следующий вопрос на основе истории диалога
 * Вопросы генерируются нейросетью полностью динамически
 */
async generateNextMessage(direction, technologies, level, questionsCount, messageHistory, lang = 'ru') {
  const isEn = lang === 'en';
  const aiMessagesCount = messageHistory.filter(msg => msg.role === 'assistant').length;

  if (aiMessagesCount >= questionsCount) {
    return isEn ? 'Thank you for your answers! The interview is complete.' : 'Спасибо за ответы! Интервью завершено.';
  }

  const questionsPerTech = Math.ceil(questionsCount / technologies.length);
  const currentTechIndex = Math.min(
    Math.floor((aiMessagesCount - 1) / questionsPerTech),
    technologies.length - 1
  );
  const currentTech = technologies[currentTechIndex];

  const levelContext = isEn ? {
    'junior': 'Junior level: ask about basics, but not trivialities. Look for understanding of concepts.',
    'middle': 'Middle level: practical cases, architectural decisions, real problems and their solutions.',
    'senior': 'Senior level: deep questions about architecture, optimization, trade-offs, scaling.'
  } : {
    'junior': 'Уровень junior: спрашивай про основы, но не банальности. Ищи понимание концепций.',
    'middle': 'Уровень middle: практические кейсы, архитектурные решения, реальные проблемы и их решения.',
    'senior': 'Уровень senior: глубокие вопросы про архитектуру, оптимизацию, trade-offs, масштабирование.'
  };

  // Случайные модификаторы для разнообразия вопросов
  const questionAngles = isEn ? [
    'Ask about a specific problem the candidate might have encountered',
    'Ask to compare two approaches or solutions',
    'Ask about optimization or performance',
    'Ask about debugging or bug hunting',
    'Ask to explain how something works "under the hood"',
    'Present a practical case from real development',
    'Ask about edge cases or atypical scenarios',
    'Ask for an example from personal experience',
    'Ask about best practices and why they matter',
    'Ask about integration with other technologies'
  ] : [
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

  const systemPrompt = isEn ? `You are an experienced technical interviewer. ${levelContext[level] || levelContext['middle']}

CONTEXT:
- Position: ${direction} developer
- Interview technologies: ${technologies.join(', ')}
- Progress: question ${aiMessagesCount} of ${questionsCount}
- Currently testing: ${currentTech}

YOUR TASK:
1. Read the candidate's last answer
2. Give short but MEANINGFUL feedback (what's good, what can be improved, what's missing)
3. Ask a NEW question about ${currentTech}

QUESTION REQUIREMENTS:
- ${randomAngle}
- DO NOT repeat topics from previous questions (check history)
- The question should be UNIQUE and interesting
- Avoid template questions like "what is X" or "what types of X are there"
- Come up with a scenario, problem, or situation

FORMAT:
[Brief feedback 1-2 sentences] + [Next question]

No fluff, get to the point.
RESPOND IN ENGLISH ONLY.` : `Ты опытный технический интервьюер. ${levelContext[level] || levelContext['middle']}

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
  async generateFeedback(direction, technologies, level, messageHistory, lang = 'ru') {
    const isEn = lang === 'en';

    const levelExpectations = isEn ? {
      'junior': 'For junior: understanding of basic concepts, ability to explain simple things, willingness to learn is expected.',
      'middle': 'For middle: confident mastery of technologies, understanding of best practices, experience solving real problems is expected.',
      'senior': 'For senior: deep understanding of architecture, optimization, patterns, ability to make technical decisions is expected.'
    } : {
      'junior': 'Для junior ожидается: понимание базовых концепций, способность объяснить простые вещи, готовность учиться.',
      'middle': 'Для middle ожидается: уверенное владение технологиями, понимание best practices, опыт решения реальных задач.',
      'senior': 'Для senior ожидается: глубокое понимание архитектуры, оптимизации, паттернов, способность принимать технические решения.'
    };

    // Форматируем историю для лучшего анализа
    const formattedHistory = messageHistory.map((msg, i) => {
      if (msg.role === 'assistant') {
        return `${isEn ? 'INTERVIEWER' : 'ИНТЕРВЬЮЕР'}: ${msg.content}`;
      }
      return `${isEn ? 'CANDIDATE' : 'КАНДИДАТ'}: ${msg.content}`;
    }).join('\n\n');

    const systemPrompt = isEn ? `You are a STRICT technical interview assessment expert. Your task is to objectively and CRITICALLY evaluate the candidate.

Position: ${direction} developer at ${level} level
Technologies: ${technologies.join(', ')}
${levelExpectations[level] || levelExpectations['middle']}

EVALUATION CRITERIA (each from 0 to 25 points):
1. CORRECTNESS (0-25): Factual accuracy of answers. Wrong answer = 0 points for the question.
2. DEPTH (0-25): Understanding "why", not just "what". Superficial answer = maximum 10 points.
3. COMPLETENESS (0-25): Topic coverage. One-word answers = maximum 5 points.
4. PRACTICE (0-25): Examples from experience. No examples = 0 points.

PENALTIES (must apply!):
- For each wrong or inaccurate answer: -10 points
- For "I don't know" or skipped question: -15 points
- For superficial answer without explanation: -5 points
- For lack of practical examples: -5 points
- For factual errors in terminology: -10 points

SCORING SCALE (be strict!):
- 0-20: Complete lack of knowledge, not ready for work
- 21-40: Critical gaps, only superficial knowledge
- 41-55: Basic knowledge, but many errors and gaps
- 56-70: Average level, understanding exists but lacks depth
- 71-80: Good level, minor gaps
- 81-90: Strong candidate, confident knowledge
- 91-100: Expert, deep knowledge (rare, only with perfect answers!)

IMPORTANT:
- Score of 80+ should be RARE - only with really good answers
- Average score for a typical interview: 45-65 points
- Be HONEST and OBJECTIVE, don't inflate scores out of politeness

Return ONLY JSON:
{
  "totalScore": number (strictly according to criteria above!),
  "strengths": ["specific strength based on answers"],
  "weaknesses": ["specific weakness/error in answers"],
  "recommendations": ["what to study for improvement"],
  "detailedFeedback": "honest analysis: what was good, what was bad, what mistakes were made"
}
RESPOND IN ENGLISH ONLY.` : `Ты - СТРОГИЙ эксперт по оценке технических интервью. Твоя задача - объективно и КРИТИЧНО оценить кандидата.

Позиция: ${direction}-разработчик уровня ${level}
Технологии: ${technologies.join(', ')}
${levelExpectations[level] || levelExpectations['middle']}

КРИТЕРИИ ОЦЕНКИ (каждый от 0 до 25 баллов):
1. ПРАВИЛЬНОСТЬ (0-25): Фактическая корректность ответов. Неправильный ответ = 0 баллов за вопрос.
2. ГЛУБИНА (0-25): Понимание "почему", а не только "что". Поверхностный ответ = максимум 10 баллов.
3. ПОЛНОТА (0-25): Раскрытие темы. Односложные ответы = максимум 5 баллов.
4. ПРАКТИКА (0-25): Примеры из опыта. Нет примеров = 0 баллов.

ШТРАФЫ (обязательно применяй!):
- За каждый неправильный или неточный ответ: -10 баллов
- За ответ "не знаю" или пропуск вопроса: -15 баллов
- За поверхностный ответ без объяснения: -5 баллов
- За отсутствие практических примеров: -5 баллов
- За фактические ошибки в терминологии: -10 баллов

ШКАЛА ОЦЕНКИ (будь строгим!):
- 0-20: Полное незнание темы, не готов к работе
- 21-40: Критические пробелы, знает только поверхностно
- 41-55: Базовые знания, но много ошибок и пробелов
- 56-70: Средний уровень, есть понимание, но не хватает глубины
- 71-80: Хороший уровень, небольшие пробелы
- 81-90: Сильный кандидат, уверенные знания
- 91-100: Эксперт, глубокие знания (редко, только при идеальных ответах!)

ВАЖНО:
- Оценка 80+ баллов должна быть РЕДКОЙ - только при действительно хороших ответах
- Средняя оценка для обычного интервью: 45-65 баллов
- Будь ЧЕСТНЫМ и ОБЪЕКТИВНЫМ, не завышай оценку из вежливости

Верни ТОЛЬКО JSON:
{
  "totalScore": число (строго по критериям выше!),
  "strengths": ["конкретная сильная сторона на основе ответов"],
  "weaknesses": ["конкретная слабость/ошибка в ответах"],
  "recommendations": ["что изучить для улучшения"],
  "detailedFeedback": "честный разбор: что было хорошо, что плохо, какие ошибки допущены"
}`;

    const messages = [
      { role: 'system', text: systemPrompt },
      { role: 'user', text: isEn
        ? `INTERVIEW HISTORY:\n\n${formattedHistory}\n\nCreate the final evaluation.`
        : `ИСТОРИЯ ИНТЕРВЬЮ:\n\n${formattedHistory}\n\nСоздай итоговую оценку.`
      }
    ];

    const response = await this.sendRequest(messages, { temperature: 0.3, maxTokens: 800 });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Валидация структуры
        return {
          totalScore: Math.min(100, Math.max(0, parseInt(parsed.totalScore) || 50)),
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [isEn ? 'Participation in interview' : 'Участие в интервью'],
          weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [isEn ? 'Additional analysis required' : 'Требуется дополнительный анализ'],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [isEn ? 'Keep developing' : 'Продолжайте развиваться'],
          detailedFeedback: parsed.detailedFeedback || response
        };
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Failed to parse feedback JSON:', error, 'Response:', response);
      return {
        totalScore: 50,
        strengths: [isEn ? 'Participation in interview' : 'Участие в интервью'],
        weaknesses: [isEn ? 'Could not analyze in detail' : 'Не удалось детально проанализировать'],
        recommendations: [isEn ? 'Keep practicing' : 'Продолжайте практиковаться'],
        detailedFeedback: response
      };
    }
  }
}

module.exports = new YandexGPTService();