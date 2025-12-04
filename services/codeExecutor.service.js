const axios = require('axios');

/**
 * Сервис для выполнения кода через Judge0 API
 * Поддерживает JS, TS, Python, C, C++, C#, Java, Kotlin, Go
 */
class CodeExecutorService {
  constructor() {
    // Judge0 CE (Community Edition) - бесплатный публичный API
    // Для продакшена лучше развернуть свой инстанс или использовать RapidAPI
    this.apiUrl = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
    this.apiKey = process.env.JUDGE0_API_KEY || null;

    // Маппинг языков на ID Judge0
    this.languageIds = {
      'javascript': 63,  // Node.js
      'typescript': 74,  // TypeScript
      'python': 71,      // Python 3
      'c': 50,           // C (GCC 9.2.0)
      'cpp': 54,         // C++ (GCC 9.2.0)
      'csharp': 51,      // C# (Mono 6.6.0)
      'java': 62,        // Java (OpenJDK 13.0.1)
      'kotlin': 78,      // Kotlin (1.3.70)
      'go': 60,          // Go (1.13.5)
      'golang': 60       // Alias
    };

    // Шаблоны для обёртки кода (для тестирования)
    this.wrapperTemplates = {
      javascript: (code, input) => `
${code}

// Test runner
const input = ${JSON.stringify(input)};
const result = solution(input);
console.log(JSON.stringify(result));
`,
      typescript: (code, input) => `
${code}

// Test runner
const input = ${JSON.stringify(input)};
const result = solution(input);
console.log(JSON.stringify(result));
`,
      python: (code, input) => `
import json

${code}

# Test runner
input_data = json.loads('${JSON.stringify(input)}')
result = solution(input_data)
print(json.dumps(result))
`,
      java: (code, input) => `
import com.google.gson.Gson;

${code}

class Main {
    public static void main(String[] args) {
        Gson gson = new Gson();
        Object input = gson.fromJson("${JSON.stringify(input).replace(/"/g, '\\"')}", Object.class);
        Solution sol = new Solution();
        Object result = sol.solution(input);
        System.out.println(gson.toJson(result));
    }
}
`,
      cpp: (code, input) => `
#include <iostream>
#include <string>
using namespace std;

${code}

int main() {
    // Простой ввод/вывод для C++
    ${typeof input === 'string' ? `string input = "${input}";` : `auto input = ${JSON.stringify(input)};`}
    auto result = solution(input);
    cout << result << endl;
    return 0;
}
`,
      c: (code, input) => `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

${code}

int main() {
    // Тест
    printf("%d\\n", solution(${typeof input === 'number' ? input : `"${input}"`}));
    return 0;
}
`,
      go: (code, input) => `
package main

import (
    "encoding/json"
    "fmt"
)

${code}

func main() {
    input := ${JSON.stringify(input)}
    result := solution(input)
    output, _ := json.Marshal(result)
    fmt.Println(string(output))
}
`,
      kotlin: (code, input) => `
import com.google.gson.Gson

${code}

fun main() {
    val gson = Gson()
    val input = gson.fromJson("${JSON.stringify(input).replace(/"/g, '\\"')}", Any::class.java)
    val result = solution(input)
    println(gson.toJson(result))
}
`,
      csharp: (code, input) => `
using System;
using System.Text.Json;

${code}

class Program {
    static void Main() {
        var input = JsonSerializer.Deserialize<object>("${JSON.stringify(input).replace(/"/g, '\\"')}");
        var solution = new Solution();
        var result = solution.Run(input);
        Console.WriteLine(JsonSerializer.Serialize(result));
    }
}
`
    };
  }

  /**
   * Выполнить код и получить результат
   */
  async executeCode(code, language, stdin = '') {
    const languageId = this.languageIds[language.toLowerCase()];

    if (!languageId) {
      throw new Error(`Unsupported language: ${language}`);
    }

    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      // Если используем RapidAPI
      if (this.apiKey) {
        headers['X-RapidAPI-Key'] = this.apiKey;
        headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
      }

      // Создаём submission
      const submitResponse = await axios.post(
        `${this.apiUrl}/submissions?base64_encoded=false&wait=true`,
        {
          source_code: code,
          language_id: languageId,
          stdin: stdin,
          cpu_time_limit: 5,      // 5 секунд на выполнение
          memory_limit: 128000,   // 128 MB
          expected_output: null
        },
        { headers, timeout: 30000 }
      );

      const result = submitResponse.data;

      return {
        success: result.status?.id === 3, // 3 = Accepted
        status: result.status?.description || 'Unknown',
        statusId: result.status?.id,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        compile_output: result.compile_output || '',
        time: parseFloat(result.time) || 0,
        memory: parseFloat(result.memory) || 0,
        error: result.status?.id !== 3 ? (result.stderr || result.compile_output || result.status?.description) : null
      };
    } catch (error) {
      console.error('Code execution error:', error.message);

      // Fallback: локальное выполнение для JavaScript
      if (language.toLowerCase() === 'javascript') {
        return this.executeJsLocally(code, stdin);
      }

      throw new Error(`Execution failed: ${error.message}`);
    }
  }

  /**
   * Локальное выполнение JavaScript (fallback)
   */
  executeJsLocally(code, stdin = '') {
    try {
      const vm = require('vm');

      let output = '';
      const sandbox = {
        console: {
          log: (...args) => { output += args.map(a =>
            typeof a === 'object' ? JSON.stringify(a) : String(a)
          ).join(' ') + '\n'; }
        },
        JSON,
        Math,
        Date,
        Array,
        Object,
        String,
        Number,
        Boolean,
        RegExp,
        Map,
        Set,
        parseInt,
        parseFloat,
        isNaN,
        isFinite
      };

      const startTime = Date.now();
      const script = new vm.Script(code);
      const context = vm.createContext(sandbox);

      script.runInContext(context, { timeout: 5000 });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        status: 'Accepted',
        statusId: 3,
        stdout: output.trim(),
        stderr: '',
        compile_output: '',
        time: executionTime / 1000,
        memory: 0,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        status: 'Runtime Error',
        statusId: 11,
        stdout: '',
        stderr: error.message,
        compile_output: '',
        time: 0,
        memory: 0,
        error: error.message
      };
    }
  }

  /**
   * Запустить тесты для задачи
   */
  async runTests(code, language, testCases) {
    const results = [];
    let passed = 0;

    for (const testCase of testCases) {
      try {
        // Формируем stdin из input
        const stdin = typeof testCase.input === 'string'
          ? testCase.input
          : JSON.stringify(testCase.input);

        const result = await this.executeCode(code, language, stdin);

        // Сравниваем output
        const actualOutput = result.stdout.trim();
        const expectedOutput = typeof testCase.expectedOutput === 'string'
          ? testCase.expectedOutput.trim()
          : JSON.stringify(testCase.expectedOutput);

        const isCorrect = actualOutput === expectedOutput ||
                         this.compareOutputs(actualOutput, expectedOutput);

        if (isCorrect && result.success) {
          passed++;
        }

        results.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: actualOutput,
          passed: isCorrect && result.success,
          time: result.time,
          memory: result.memory,
          error: result.error,
          isHidden: testCase.isHidden || false
        });
      } catch (error) {
        results.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: '',
          passed: false,
          time: 0,
          memory: 0,
          error: error.message,
          isHidden: testCase.isHidden || false
        });
      }
    }

    return {
      passed,
      total: testCases.length,
      allPassed: passed === testCases.length,
      results,
      avgTime: results.reduce((sum, r) => sum + r.time, 0) / results.length,
      avgMemory: results.reduce((sum, r) => sum + r.memory, 0) / results.length
    };
  }

  /**
   * Сравнение выходных данных (с учётом разных форматов)
   */
  compareOutputs(actual, expected) {
    // Убираем пробелы и переносы
    const normalizeString = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();

    if (normalizeString(actual) === normalizeString(expected)) {
      return true;
    }

    // Пробуем сравнить как JSON
    try {
      const actualJson = JSON.parse(actual);
      const expectedJson = JSON.parse(expected);
      return JSON.stringify(actualJson) === JSON.stringify(expectedJson);
    } catch {
      return false;
    }
  }

  /**
   * Получить список поддерживаемых языков
   */
  getSupportedLanguages() {
    return Object.keys(this.languageIds).filter(l => l !== 'golang');
  }

  /**
   * Получить шаблон стартового кода для языка
   */
  getStarterTemplate(language) {
    const templates = {
      javascript: `/**
 * @param {any} input - Входные данные
 * @return {any} - Результат
 */
function solution(input) {
  // Ваш код здесь

}`,
      typescript: `/**
 * @param input - Входные данные
 * @returns Результат
 */
function solution(input: any): any {
  // Ваш код здесь

}`,
      python: `def solution(input):
    """
    :param input: Входные данные
    :return: Результат
    """
    # Ваш код здесь
    pass`,
      java: `class Solution {
    public Object solution(Object input) {
        // Ваш код здесь
        return null;
    }
}`,
      cpp: `#include <vector>
#include <string>
using namespace std;

// Ваша функция
auto solution(auto input) {
    // Ваш код здесь
    return input;
}`,
      c: `// Ваша функция
int solution(int input) {
    // Ваш код здесь
    return input;
}`,
      csharp: `public class Solution {
    public object Run(object input) {
        // Ваш код здесь
        return input;
    }
}`,
      go: `func solution(input interface{}) interface{} {
    // Ваш код здесь
    return input
}`,
      kotlin: `fun solution(input: Any): Any {
    // Ваш код здесь
    return input
}`
    };

    return templates[language.toLowerCase()] || templates.javascript;
  }
}

module.exports = new CodeExecutorService();