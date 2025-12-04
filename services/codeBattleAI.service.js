/**
 * Code Battle AI Service
 *
 * Реальный AI-противник для режима VS AI
 * Использует Groq API (бесплатный, быстрый Llama 3.1)
 */

const axios = require('axios');

class CodeBattleAIService {
  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';

    // Модели по сложности AI
    this.models = {
      easy: 'llama-3.1-8b-instant',      // Быстрая, но менее точная
      medium: 'llama-3.1-70b-versatile', // Сбалансированная
      hard: 'llama-3.1-70b-versatile'    // Самая сильная + меньше ограничений
    };

    // Температура по сложности (влияет на "умность" AI)
    this.temperatures = {
      easy: 0.9,    // Более случайные ответы, больше ошибок
      medium: 0.5,  // Сбалансировано
      hard: 0.2     // Максимально точные ответы
    };

    // Максимальное время на "размышление" AI (имитация)
    this.thinkingTime = {
      easy: { min: 45000, max: 90000 },      // 45-90 сек
      medium: { min: 20000, max: 45000 },    // 20-45 сек
      hard: { min: 5000, max: 15000 }        // 5-15 сек
    };
  }

  /**
   * AI решает задачу
   * @param {Object} task - Задача
   * @param {string} language - Язык программирования
   * @param {string} difficulty - Сложность AI (easy/medium/hard)
   * @returns {Promise<Object>} - Решение AI
   */
  async solveTask(task, language, difficulty = 'medium') {
    if (!this.groqApiKey) {
      console.warn('GROQ_API_KEY not set, using fallback AI');
      return this.fallbackSolution(task, language, difficulty);
    }

    const startTime = Date.now();

    try {
      const prompt = this.buildPrompt(task, language, difficulty);

      const response = await axios.post(
        this.groqApiUrl,
        {
          model: this.models[difficulty] || this.models.medium,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(difficulty)
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: this.temperatures[difficulty] || 0.5,
          max_tokens: 2048,
          top_p: 1
        },
        {
          headers: {
            'Authorization': `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 сек таймаут
        }
      );

      const aiResponse = response.data.choices[0]?.message?.content || '';
      const code = this.extractCode(aiResponse, language);

      // Добавляем искусственную задержку для имитации "размышления"
      const thinkTime = this.getThinkingTime(difficulty);
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, thinkTime - elapsed);

      await this.delay(remainingDelay);

      const solveTime = Math.floor((Date.now() - startTime) / 1000);

      return {
        success: true,
        code,
        solveTime,
        difficulty,
        model: this.models[difficulty]
      };

    } catch (error) {
      console.error('AI solve error:', error.message);
      return this.fallbackSolution(task, language, difficulty);
    }
  }

  /**
   * Системный промпт для AI в зависимости от сложности
   */
  getSystemPrompt(difficulty) {
    const prompts = {
      easy: `You are a beginner programmer solving coding challenges.
You sometimes make small mistakes like off-by-one errors, forgetting edge cases, or using inefficient algorithms.
Solve the problem but don't always get it 100% right - make occasional realistic beginner mistakes.
IMPORTANT: Return ONLY the code solution, no explanations.`,

      medium: `You are an intermediate programmer solving coding challenges.
You write clean, working code but might miss some edge cases or optimizations.
IMPORTANT: Return ONLY the code solution, no explanations.`,

      hard: `You are an expert competitive programmer solving coding challenges.
You write optimal, clean, and correct solutions that handle all edge cases.
IMPORTANT: Return ONLY the code solution, no explanations.`
    };

    return prompts[difficulty] || prompts.medium;
  }

  /**
   * Создаёт промпт для AI
   */
  buildPrompt(task, language, difficulty) {
    const languageNames = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      python: 'Python',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      go: 'Go',
      kotlin: 'Kotlin',
      csharp: 'C#'
    };

    // Показываем только открытые тесты
    const visibleTests = (task.testCases || [])
      .filter(tc => !tc.isHidden)
      .slice(0, 3) // Максимум 3 примера
      .map((tc, i) => `Example ${i + 1}:\nInput: ${JSON.stringify(tc.input)}\nOutput: ${JSON.stringify(tc.expectedOutput)}`)
      .join('\n\n');

    return `Solve this coding problem in ${languageNames[language] || language}:

## Problem: ${task.title}

${task.description}

## Test Cases:
${visibleTests}

## Requirements:
- Write a function called "solution" that takes the input and returns the output
- The solution must pass all test cases
- Return ONLY the code, no explanations

Write the solution:`;
  }

  /**
   * Извлекает код из ответа AI
   */
  extractCode(response, language) {
    // Пробуем найти код в markdown блоках
    const codeBlockRegex = /```(?:javascript|typescript|python|java|cpp|c\+\+|c|go|kotlin|csharp|cs)?\n([\s\S]*?)```/gi;
    const matches = [...response.matchAll(codeBlockRegex)];

    if (matches.length > 0) {
      return matches[0][1].trim();
    }

    // Если нет markdown, возвращаем весь ответ как код
    // Убираем возможные объяснения в начале/конце
    const lines = response.split('\n');
    const codeLines = lines.filter(line => {
      const trimmed = line.trim().toLowerCase();
      // Фильтруем строки, которые выглядят как объяснения
      if (trimmed.startsWith('here') || trimmed.startsWith('this')) return false;
      if (trimmed.startsWith('the solution') || trimmed.startsWith('explanation')) return false;
      return true;
    });

    return codeLines.join('\n').trim();
  }

  /**
   * Fallback решение если AI недоступен
   * Использует готовое решение из задачи (если есть) или starterCode
   */
  async fallbackSolution(task, language, difficulty) {
    const { min, max } = this.thinkingTime[difficulty] || this.thinkingTime.medium;

    // Имитируем время "размышления" AI
    const thinkTime = Math.floor(Math.random() * (max - min) + min);
    await this.delay(thinkTime);

    const solveTime = Math.floor(thinkTime / 1000);

    // Пробуем использовать готовое решение из задачи
    let code = null;
    let willSolve = false;

    // 1. Если у задачи есть solution (эталонное решение)
    if (task.solution && task.solution[language]) {
      code = task.solution[language];
      // Для easy AI делаем "ошибку" с вероятностью 40%
      // Для medium - 20%, для hard - 5%
      const errorChance = { easy: 0.4, medium: 0.2, hard: 0.05 }[difficulty] || 0.2;
      willSolve = Math.random() > errorChance;

      if (!willSolve) {
        // "Ломаем" решение добавляя небольшую ошибку
        code = this.introduceError(code, language);
      }
    }
    // 2. Если есть starterCode - используем его и добавляем простую логику
    else if (task.starterCode && task.starterCode[language]) {
      code = this.generateSimpleSolution(task, language, difficulty);
      // Простое решение обычно не проходит все тесты
      willSolve = difficulty === 'hard' ? Math.random() > 0.7 : false;
    }
    // 3. Fallback шаблон
    else {
      code = this.getEmptyTemplate(language);
      willSolve = false;
    }

    console.log(`🤖 Fallback AI (${difficulty}): willSolve=${willSolve}, time=${solveTime}s`);

    return {
      success: willSolve,
      code,
      solveTime,
      difficulty,
      model: 'fallback'
    };
  }

  /**
   * Генерирует простое решение на основе тестов
   */
  generateSimpleSolution(task, language, difficulty) {
    const testCases = task.testCases || [];
    if (testCases.length === 0) {
      return this.getEmptyTemplate(language);
    }

    // Для hard AI пытаемся вернуть правильный ответ для первого теста
    const firstTest = testCases[0];

    const solutions = {
      javascript: `function solution(input) {
  // Fallback AI solution
  const testInput = ${JSON.stringify(firstTest.input)};
  const testOutput = ${JSON.stringify(firstTest.expectedOutput)};

  // Если input совпадает с тестовым - возвращаем правильный ответ
  if (JSON.stringify(input) === JSON.stringify(testInput)) {
    return testOutput;
  }

  // Иначе пытаемся угадать
  if (Array.isArray(input)) {
    return input.length;
  }
  if (typeof input === 'number') {
    return input * 2;
  }
  if (typeof input === 'string') {
    return input.split('').reverse().join('');
  }
  return input;
}`,
      python: `def solution(input):
    # Fallback AI solution
    test_input = ${JSON.stringify(firstTest.input)}
    test_output = ${JSON.stringify(firstTest.expectedOutput)}

    import json
    if json.dumps(input) == json.dumps(test_input):
        return test_output

    if isinstance(input, list):
        return len(input)
    if isinstance(input, int):
        return input * 2
    if isinstance(input, str):
        return input[::-1]
    return input`,
      typescript: `function solution(input: any): any {
  // Fallback AI solution
  const testInput = ${JSON.stringify(firstTest.input)};
  const testOutput = ${JSON.stringify(firstTest.expectedOutput)};

  if (JSON.stringify(input) === JSON.stringify(testInput)) {
    return testOutput;
  }

  if (Array.isArray(input)) {
    return input.length;
  }
  return input;
}`
    };

    return solutions[language] || solutions.javascript;
  }

  /**
   * Вносит небольшую ошибку в решение (для имитации неидеального AI)
   */
  introduceError(code, language) {
    // Простые способы "сломать" решение
    const errors = [
      // Off-by-one error
      { find: /return ([a-zA-Z]+)\s*;/g, replace: 'return $1 + 1;' },
      { find: /return ([a-zA-Z]+)\s*$/gm, replace: 'return $1 + 1' },
      // Забыть обработать edge case
      { find: /if\s*\(/g, replace: 'if (false && ' },
      // Неправильный оператор
      { find: /===/g, replace: '!==' },
      { find: /==/g, replace: '!=' }
    ];

    // Применяем случайную ошибку
    const error = errors[Math.floor(Math.random() * errors.length)];

    if (error.find.test(code)) {
      return code.replace(error.find, error.replace);
    }

    // Если не нашли что заменить - добавляем комментарий с "ошибкой"
    return code + '\n// TODO: fix edge case';
  }

  /**
   * Пустой шаблон для языка
   */
  getEmptyTemplate(language) {
    const templates = {
      javascript: `function solution(input) {
  // AI attempted solution
  return null;
}`,
      typescript: `function solution(input: any): any {
  // AI attempted solution
  return null;
}`,
      python: `def solution(input):
    # AI attempted solution
    return None`,
      java: `class Solution {
    public Object solution(Object input) {
        // AI attempted solution
        return null;
    }
}`,
      cpp: `auto solution(auto input) {
    // AI attempted solution
    return input;
}`,
      c: `int solution(int input) {
    // AI attempted solution
    return 0;
}`,
      go: `func solution(input interface{}) interface{} {
    // AI attempted solution
    return nil
}`,
      kotlin: `fun solution(input: Any): Any? {
    // AI attempted solution
    return null
}`,
      csharp: `public class Solution {
    public object Run(object input) {
        // AI attempted solution
        return null;
    }
}`
    };

    return templates[language] || templates.javascript;
  }

  /**
   * Получить время "размышления" AI
   */
  getThinkingTime(difficulty) {
    const { min, max } = this.thinkingTime[difficulty] || this.thinkingTime.medium;
    return Math.floor(Math.random() * (max - min) + min);
  }

  /**
   * Задержка
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Проверить решение AI на тестах
   */
  async validateSolution(code, language, testCases, codeExecutor) {
    try {
      const results = await codeExecutor.runTests(code, language, testCases);
      return {
        solved: results.allPassed,
        testsPassed: results.passed,
        totalTests: results.total
      };
    } catch (error) {
      console.error('AI validation error:', error);
      return {
        solved: false,
        testsPassed: 0,
        totalTests: testCases.length
      };
    }
  }

  /**
   * Полный цикл: AI решает и проверяется
   */
  async compete(task, language, difficulty, codeExecutor) {
    // AI решает задачу
    const aiSolution = await this.solveTask(task, language, difficulty);

    // Проверяем решение AI
    const validation = await this.validateSolution(
      aiSolution.code,
      language,
      task.testCases,
      codeExecutor
    );

    return {
      ...aiSolution,
      ...validation
    };
  }
}

module.exports = new CodeBattleAIService();
