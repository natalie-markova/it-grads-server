/**
 * Codeforces Sync Service
 *
 * Синхронизирует задачи с Codeforces API и сохраняет их в локальную БД.
 * Задачи кэшируются локально, обновляются раз в сутки.
 * Условия задач парсятся с HTML страниц Codeforces.
 *
 * API: https://codeforces.com/apiHelp
 */

const axios = require('axios');
const db = require('../db/models');

const CODEFORCES_API = 'https://codeforces.com/api';
const CODEFORCES_BASE = 'https://codeforces.com';

// Маппинг рейтинга Codeforces на нашу сложность
const mapDifficulty = (rating) => {
  if (!rating || rating < 1200) return 'easy';
  if (rating < 1600) return 'medium';
  return 'hard';
};

// Маппинг рейтинга на время (в секундах)
const mapTimeLimit = (rating) => {
  if (!rating || rating < 1200) return 180;  // 3 мин для easy
  if (rating < 1600) return 300;              // 5 мин для medium
  return 600;                                  // 10 мин для hard
};

// Маппинг рейтинга на очки
const mapPoints = (rating) => {
  if (!rating || rating < 1200) return 10;
  if (rating < 1600) return 25;
  return 50;
};

// Маппинг тегов Codeforces на наши категории
const mapCategory = (tags) => {
  if (!tags || tags.length === 0) return 'algorithms';

  const tagMap = {
    'implementation': 'basics',
    'math': 'math',
    'greedy': 'algorithms',
    'dp': 'algorithms',
    'data structures': 'data-structures',
    'brute force': 'basics',
    'strings': 'strings',
    'sortings': 'algorithms',
    'binary search': 'algorithms',
    'graphs': 'data-structures',
    'trees': 'data-structures',
    'number theory': 'math',
    'two pointers': 'arrays',
    'constructive algorithms': 'algorithms'
  };

  for (const tag of tags) {
    if (tagMap[tag]) return tagMap[tag];
  }
  return 'algorithms';
};

// Поддерживаемые языки
const SUPPORTED_LANGUAGES = ['javascript', 'python', 'cpp', 'java', 'go'];

// Генерация стартового кода
const generateStarterCode = (problemName) => {
  return {
    javascript: `// ${problemName}
// Read input from stdin, write output to stdout

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let lines = [];
rl.on('line', (line) => lines.push(line));
rl.on('close', () => {
  // Your code here
  const result = solve(lines);
  console.log(result);
});

function solve(input) {
  // TODO: Implement solution
  return '';
}
`,
    python: `# ${problemName}
# Read input from stdin, write output to stdout

import sys

def solve():
    # Read input
    # n = int(input())
    # arr = list(map(int, input().split()))

    # TODO: Implement solution
    pass

if __name__ == "__main__":
    solve()
`,
    cpp: `// ${problemName}
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // TODO: Implement solution

    return 0;
}
`,
    java: `// ${problemName}
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        // TODO: Implement solution

        sc.close();
    }
}
`,
    go: `// ${problemName}
package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    reader := bufio.NewReader(os.Stdin)
    writer := bufio.NewWriter(os.Stdout)
    defer writer.Flush()

    // TODO: Implement solution
    _ = reader
}
`
  };
};

class CodeforcesSyncService {
  constructor() {
    this.problemsCache = [];
    this.lastSync = null;
  }

  /**
   * Получить все задачи с Codeforces API
   */
  async fetchProblemsFromAPI() {
    try {
      console.log('📥 Fetching problems from Codeforces API...');

      const response = await axios.get(`${CODEFORCES_API}/problemset.problems`, {
        timeout: 30000
      });

      if (response.data.status !== 'OK') {
        throw new Error('Codeforces API returned error');
      }

      const { problems, problemStatistics } = response.data.result;

      // Создаем map статистики для быстрого доступа
      const statsMap = new Map();
      problemStatistics.forEach(stat => {
        statsMap.set(`${stat.contestId}-${stat.index}`, stat.solvedCount);
      });

      console.log(`✅ Fetched ${problems.length} problems from Codeforces`);

      return problems.map(p => ({
        ...p,
        solvedCount: statsMap.get(`${p.contestId}-${p.index}`) || 0
      }));
    } catch (error) {
      console.error('❌ Failed to fetch from Codeforces:', error.message);
      throw error;
    }
  }

  /**
   * Фильтрация задач по критериям
   */
  filterProblems(problems, options = {}) {
    const {
      minRating = 800,
      maxRating = 2000,
      minSolvedCount = 1000,
      limit = 500
    } = options;

    return problems
      .filter(p => {
        // Только задачи с рейтингом
        if (!p.rating) return false;
        if (p.rating < minRating || p.rating > maxRating) return false;
        // Только популярные задачи (много решений = хорошие тесты)
        if (p.solvedCount < minSolvedCount) return false;
        // Пропускаем интерактивные задачи
        if (p.tags && p.tags.includes('interactive')) return false;
        return true;
      })
      .sort((a, b) => b.solvedCount - a.solvedCount) // Сортировка по популярности
      .slice(0, limit);
  }

  /**
   * Получить условие задачи с HTML страницы Codeforces
   */
  async fetchProblemStatement(contestId, index) {
    try {
      const url = `${CODEFORCES_BASE}/problemset/problem/${contestId}/${index}`;

      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
          'Accept-Language': 'ru,en;q=0.9'
        }
      });

      const html = response.data;

      // Парсим условие задачи из HTML
      const statement = this.parseStatementFromHtml(html);
      const samples = this.parseSamplesFromHtml(html);

      return {
        description: statement,
        samples,
        url
      };
    } catch (error) {
      console.error(`Failed to fetch problem ${contestId}${index}:`, error.message);
      return null;
    }
  }

  /**
   * Парсинг условия задачи из HTML
   */
  parseStatementFromHtml(html) {
    try {
      // Ищем div с классом problem-statement
      const statementMatch = html.match(/<div class="problem-statement">([\s\S]*?)<div class="input-specification">/);

      if (!statementMatch) {
        // Альтернативный паттерн
        const altMatch = html.match(/<div class="problem-statement">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/);
        if (altMatch) {
          return this.cleanHtmlToMarkdown(altMatch[1]);
        }
        return null;
      }

      let statement = statementMatch[1];

      // Также получаем input/output specification
      const inputMatch = html.match(/<div class="input-specification">([\s\S]*?)<\/div>/);
      const outputMatch = html.match(/<div class="output-specification">([\s\S]*?)<\/div>/);

      if (inputMatch) {
        statement += '\n\n## Входные данные\n' + this.cleanHtmlToMarkdown(inputMatch[1]);
      }
      if (outputMatch) {
        statement += '\n\n## Выходные данные\n' + this.cleanHtmlToMarkdown(outputMatch[1]);
      }

      return this.cleanHtmlToMarkdown(statement);
    } catch (error) {
      console.error('Error parsing statement:', error.message);
      return null;
    }
  }

  /**
   * Парсинг примеров из HTML
   */
  parseSamplesFromHtml(html) {
    try {
      const samples = [];

      // Ищем все примеры входных/выходных данных
      const sampleTestsMatch = html.match(/<div class="sample-test">([\s\S]*?)<\/div>\s*<\/div>/);

      if (!sampleTestsMatch) return samples;

      const sampleHtml = sampleTestsMatch[1];

      // Парсим input и output блоки
      const inputs = [];
      const outputs = [];

      // Находим все input блоки
      const inputRegex = /<div class="input">[\s\S]*?<pre>([\s\S]*?)<\/pre>/g;
      let match;
      while ((match = inputRegex.exec(sampleHtml)) !== null) {
        inputs.push(this.cleanSampleText(match[1]));
      }

      // Находим все output блоки
      const outputRegex = /<div class="output">[\s\S]*?<pre>([\s\S]*?)<\/pre>/g;
      while ((match = outputRegex.exec(sampleHtml)) !== null) {
        outputs.push(this.cleanSampleText(match[1]));
      }

      // Объединяем в пары
      for (let i = 0; i < Math.min(inputs.length, outputs.length); i++) {
        samples.push({
          input: inputs[i],
          output: outputs[i]
        });
      }

      return samples;
    } catch (error) {
      console.error('Error parsing samples:', error.message);
      return [];
    }
  }

  /**
   * Очистка HTML и конвертация в Markdown
   */
  cleanHtmlToMarkdown(html) {
    if (!html) return '';

    return html
      // Удаляем заголовок div
      .replace(/<div class="section-title">[^<]*<\/div>/g, '')
      // Конвертируем <p> в параграфы
      .replace(/<p>/g, '\n\n')
      .replace(/<\/p>/g, '')
      // Конвертируем <br> в переносы
      .replace(/<br\s*\/?>/g, '\n')
      // Конвертируем <b> и <strong> в **bold**
      .replace(/<(b|strong)>/g, '**')
      .replace(/<\/(b|strong)>/g, '**')
      // Конвертируем <i> и <em> в *italic*
      .replace(/<(i|em)>/g, '*')
      .replace(/<\/(i|em)>/g, '*')
      // Конвертируем <code> и <tt> в `code`
      .replace(/<(code|tt)>/g, '`')
      .replace(/<\/(code|tt)>/g, '`')
      // Конвертируем <pre> в ```
      .replace(/<pre>/g, '\n```\n')
      .replace(/<\/pre>/g, '\n```\n')
      // Конвертируем <ul>/<li> в списки
      .replace(/<ul>/g, '\n')
      .replace(/<\/ul>/g, '\n')
      .replace(/<li>/g, '- ')
      .replace(/<\/li>/g, '\n')
      // Конвертируем <ol>/<li> в нумерованные списки
      .replace(/<ol>/g, '\n')
      .replace(/<\/ol>/g, '\n')
      // Конвертируем span с формулами
      .replace(/<span class="tex-span">([^<]*)<\/span>/g, '$$$1$$')
      .replace(/<span class="tex-font-style-it">([^<]*)<\/span>/g, '*$1*')
      .replace(/<span class="tex-font-style-bf">([^<]*)<\/span>/g, '**$1**')
      // Удаляем оставшиеся теги
      .replace(/<[^>]+>/g, '')
      // Декодируем HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
      // Убираем лишние пробелы и переносы
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Очистка текста примера
   */
  cleanSampleText(text) {
    return text
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  /**
   * Синхронизировать задачи с БД (с полными условиями)
   */
  async syncToDatabase(options = {}) {
    const {
      limit = 200,
      minRating = 800,
      maxRating = 2000,
      fetchStatements = true  // Загружать ли полные условия
    } = options;

    try {
      console.log('🔄 Starting Codeforces sync...');

      // Получаем задачи с API
      const allProblems = await this.fetchProblemsFromAPI();

      // Фильтруем
      const filteredProblems = this.filterProblems(allProblems, {
        minRating,
        maxRating,
        limit
      });

      console.log(`📝 Processing ${filteredProblems.length} problems...`);

      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (let i = 0; i < filteredProblems.length; i++) {
        const problem = filteredProblems[i];

        try {
          const externalId = `cf-${problem.contestId}-${problem.index}`;

          // Проверяем, есть ли уже такая задача с полным описанием
          const existing = await db.GameTask.findOne({
            where: { externalId }
          });

          // Если задача существует и имеет полное описание - пропускаем
          if (existing && existing.description && existing.description.length > 500) {
            skipped++;
            continue;
          }

          // Загружаем полное условие с сайта
          let description = `# ${problem.name}\n\nЗадача с Codeforces (рейтинг: ${problem.rating})\n\n**Теги:** ${(problem.tags || []).join(', ')}\n\n[Открыть на Codeforces](https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index})`;
          let testCases = [];

          if (fetchStatements) {
            console.log(`📄 Fetching statement ${i + 1}/${filteredProblems.length}: ${problem.contestId}${problem.index}`);

            const statementData = await this.fetchProblemStatement(problem.contestId, problem.index);

            if (statementData && statementData.description) {
              description = `# ${problem.name}\n\n**Рейтинг:** ${problem.rating} | **Теги:** ${(problem.tags || []).join(', ')}\n\n${statementData.description}\n\n---\n[Открыть на Codeforces](${statementData.url})`;

              // Конвертируем примеры в testCases
              if (statementData.samples && statementData.samples.length > 0) {
                testCases = statementData.samples.map(sample => ({
                  input: sample.input,
                  expectedOutput: sample.output,
                  isHidden: false
                }));
              }
            }

            // Задержка чтобы не забанили
            await this.delay(500);
          }

          const taskData = {
            externalId,
            externalSource: 'codeforces',
            title: `${problem.contestId}${problem.index}. ${problem.name}`,
            description,
            difficulty: mapDifficulty(problem.rating),
            category: mapCategory(problem.tags),
            tags: problem.tags || [],
            points: mapPoints(problem.rating),
            timeLimit: mapTimeLimit(problem.rating),
            languages: SUPPORTED_LANGUAGES,
            starterCode: generateStarterCode(problem.name),
            testCases,
            hints: [],
            externalRating: problem.rating,
            externalUrl: `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`,
            solvedCount: problem.solvedCount || 0,
            isActive: true
          };

          if (existing) {
            await existing.update(taskData);
            updated++;
          } else {
            await db.GameTask.create(taskData);
            created++;
          }
        } catch (err) {
          console.error(`Failed to save problem ${problem.contestId}${problem.index}:`, err.message);
          skipped++;
        }
      }

      this.lastSync = new Date();

      console.log(`✅ Sync completed: ${created} created, ${updated} updated, ${skipped} skipped`);

      return { created, updated, skipped, total: filteredProblems.length };
    } catch (error) {
      console.error('❌ Sync failed:', error.message);
      throw error;
    }
  }

  /**
   * Обновить условия для существующих задач (без пересоздания)
   */
  async updateStatements(limit = 50) {
    try {
      console.log('📝 Updating problem statements...');

      // Находим задачи с короткими описаниями
      const tasks = await db.GameTask.findAll({
        where: {
          externalSource: 'codeforces',
          isActive: true
        },
        order: [['solvedCount', 'DESC']],
        limit
      });

      let updated = 0;
      let failed = 0;

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];

        // Пропускаем если уже есть полное описание
        if (task.description && task.description.length > 500) {
          continue;
        }

        try {
          // Извлекаем contestId и index из externalId (формат: cf-1234-A)
          const match = task.externalId.match(/cf-(\d+)-([A-Z]\d?)/);
          if (!match) {
            console.log(`⚠️ Invalid externalId format: ${task.externalId}`);
            continue;
          }

          const contestId = match[1];
          const index = match[2];

          console.log(`📄 Updating ${i + 1}/${tasks.length}: ${task.title}`);

          const statementData = await this.fetchProblemStatement(contestId, index);

          if (statementData && statementData.description) {
            const description = `# ${task.title.replace(/^\d+[A-Z]?\d?\.\s*/, '')}\n\n**Рейтинг:** ${task.externalRating} | **Теги:** ${(task.tags || []).join(', ')}\n\n${statementData.description}\n\n---\n[Открыть на Codeforces](${statementData.url})`;

            // Конвертируем примеры в testCases
            let testCases = task.testCases || [];
            if (statementData.samples && statementData.samples.length > 0) {
              testCases = statementData.samples.map(sample => ({
                input: sample.input,
                expectedOutput: sample.output,
                isHidden: false
              }));
            }

            await task.update({ description, testCases });
            updated++;
          } else {
            failed++;
          }

          // Задержка
          await this.delay(500);
        } catch (err) {
          console.error(`Failed to update ${task.title}:`, err.message);
          failed++;
        }
      }

      console.log(`✅ Updated ${updated} statements, ${failed} failed`);
      return { updated, failed };
    } catch (error) {
      console.error('❌ Update failed:', error.message);
      throw error;
    }
  }

  /**
   * Задержка
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Получить случайную задачу по сложности
   */
  async getRandomTask(difficulty = null) {
    const where = {
      isActive: true,
      externalSource: 'codeforces'
    };

    if (difficulty) {
      where.difficulty = difficulty;
    }

    const count = await db.GameTask.count({ where });

    if (count === 0) {
      // Если нет задач с Codeforces, берем любую
      delete where.externalSource;
      const fallbackCount = await db.GameTask.count({ where: { isActive: true } });
      if (fallbackCount === 0) return null;

      const randomOffset = Math.floor(Math.random() * fallbackCount);
      return db.GameTask.findOne({
        where: { isActive: true },
        offset: randomOffset
      });
    }

    const randomOffset = Math.floor(Math.random() * count);

    return db.GameTask.findOne({
      where,
      offset: randomOffset
    });
  }

  /**
   * Получить несколько случайных задач для матча
   */
  async getRandomTasksForMatch(count = 3, difficulty = null) {
    const tasks = [];
    const usedIds = new Set();

    for (let i = 0; i < count; i++) {
      const task = await this.getRandomTask(difficulty);
      if (task && !usedIds.has(task.id)) {
        tasks.push(task);
        usedIds.add(task.id);
      }
    }

    return tasks;
  }

  /**
   * Статус последней синхронизации
   */
  getStatus() {
    return {
      lastSync: this.lastSync,
      cacheSize: this.problemsCache.length
    };
  }
}

module.exports = new CodeforcesSyncService();