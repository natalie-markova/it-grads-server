const express = require('express');
const router = express.Router();
const yandexGPT = require('../services/yandexGPT.service');
const verifyToken = require('../middleware/verifyToken');

// Site knowledge base for the assistant
const SITE_KNOWLEDGE_RU = `
IT-Grads - это платформа для связи IT-выпускников с работодателями.

ОСНОВНЫЕ РАЗДЕЛЫ САЙТА:

1. ПРОФИЛЬ - Личная страница пользователя
   - Здесь отображается вся информация о вас
   - Можно редактировать персональные данные
   - Виден радар навыков (spider chart) с вашими компетенциями
   - Показаны достижения и бейджи

2. ROADMAPS (Карты развития) - /roadmap
   - Интерактивные карты обучения по технологиям
   - Доступны: JavaScript, React, Node.js, TypeScript, Python и другие
   - Отслеживается прогресс прохождения
   - Прохождение roadmap влияет на радар навыков

3. CODEBATTLE - /codebattle
   - Решение алгоритмических задач
   - Режимы: Solo (одиночный), VS AI (против бота), PvP (против других игроков)
   - Рейтинговая система
   - Категории задач: алгоритмы, структуры данных, строки и т.д.

4. ТРЕНАЖЕР ИНТЕРВЬЮ - /interview
   - Практика с вопросами (тесты по категориям)
   - AI-интервью (текстовое собеседование с нейросетью)
   - Аудио-интервью (голосовое собеседование)
   - Получение обратной связи и оценки

5. ПЛАН РАЗВИТИЯ (Career Path) - /development-plan
   - Выбор целевой позиции (Junior/Middle/Senior Frontend/Backend/Fullstack)
   - Автоматическая генерация плана развития
   - Отслеживание прогресса по шагам
   - Синхронизация с roadmaps и codebattle

6. ВАКАНСИИ - /vacancies
   - Просмотр вакансий от работодателей
   - Фильтрация по навыкам, локации, зарплате
   - Отклик на вакансии

7. КОМПАНИИ - /companies
   - Профили компаний-работодателей
   - Информация о компаниях

ПАРМА (МАСКОТ):
- Я - Парма, помощник на сайте!
- Меня можно перетаскивать по экрану
- В настройках (шестеренка) можно изменить размер, позицию, отключить подсказки
- Кликните на меня - скажу что-нибудь веселое!

ПОЛЕЗНЫЕ СОВЕТЫ:
- Проходите roadmaps для прокачки навыков
- Решайте задачи в CodeBattle для улучшения алгоритмического мышления
- Практикуйтесь в тренажере перед реальными собеседованиями
- Создайте план развития для структурированного обучения
`;

const SITE_KNOWLEDGE_EN = `
IT-Grads is a platform connecting IT graduates with employers.

MAIN SECTIONS:

1. PROFILE - Your personal page
   - Displays all your information
   - Edit personal data
   - View your skills radar (spider chart)
   - See achievements and badges

2. ROADMAPS - /roadmap
   - Interactive learning paths for technologies
   - Available: JavaScript, React, Node.js, TypeScript, Python and more
   - Track your progress
   - Completing roadmaps affects your skills radar

3. CODEBATTLE - /codebattle
   - Solve algorithmic challenges
   - Modes: Solo, VS AI (against bot), PvP (against other players)
   - Rating system
   - Categories: algorithms, data structures, strings, etc.

4. INTERVIEW TRAINER - /interview
   - Practice quizzes (tests by category)
   - AI Interview (text-based interview with neural network)
   - Audio Interview (voice interview)
   - Get feedback and evaluation

5. DEVELOPMENT PLAN (Career Path) - /development-plan
   - Choose target position (Junior/Middle/Senior Frontend/Backend/Fullstack)
   - Auto-generated development plan
   - Track progress through steps
   - Syncs with roadmaps and codebattle

6. VACANCIES - /vacancies
   - Browse job listings from employers
   - Filter by skills, location, salary
   - Apply to vacancies

7. COMPANIES - /companies
   - Employer company profiles
   - Company information

PARMA (MASCOT):
- I'm Parma, your site assistant!
- You can drag me around the screen
- In settings (gear icon) you can change size, position, disable tips
- Click on me - I'll say something fun!

HELPFUL TIPS:
- Complete roadmaps to level up your skills
- Solve CodeBattle challenges to improve algorithmic thinking
- Practice in the trainer before real interviews
- Create a development plan for structured learning
`;

/**
 * POST /api/assistant/ask
 * Ask the AI assistant a question about the site
 */
router.post('/ask', verifyToken, async (req, res) => {
  try {
    const { question, lang = 'ru' } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: lang === 'ru' ? 'Введите вопрос' : 'Please enter a question' });
    }

    const isRu = lang === 'ru';
    const siteKnowledge = isRu ? SITE_KNOWLEDGE_RU : SITE_KNOWLEDGE_EN;

    const systemPrompt = isRu
      ? `Ты - Парма, дружелюбный помощник на сайте IT-Grads. Ты собака-маскот.
Отвечай кратко, по делу, дружелюбно. Используй эмодзи умеренно.
Если вопрос не относится к сайту - вежливо скажи что помогаешь только с вопросами о сайте.

ЗНАНИЯ О САЙТЕ:
${siteKnowledge}

ВАЖНО:
- Отвечай на русском языке
- Будь краток (2-4 предложения)
- Если не знаешь ответ - честно скажи и предложи обратиться в поддержку`
      : `You are Parma, a friendly assistant on the IT-Grads website. You are a dog mascot.
Answer briefly, to the point, friendly. Use emojis moderately.
If the question is not about the site - politely say you only help with site questions.

SITE KNOWLEDGE:
${siteKnowledge}

IMPORTANT:
- Answer in English
- Be brief (2-4 sentences)
- If you don't know - honestly say so and suggest contacting support`;

    const messages = [
      { role: 'system', text: systemPrompt },
      { role: 'user', text: question }
    ];

    const answer = await yandexGPT.sendRequest(messages, {
      temperature: 0.7,
      maxTokens: 500
    });

    res.json({ answer });
  } catch (error) {
    console.error('Assistant error:', error);
    const isRu = req.body?.lang === 'ru';
    res.status(500).json({
      error: isRu ? 'Ошибка получения ответа' : 'Error getting response'
    });
  }
});

module.exports = router;
