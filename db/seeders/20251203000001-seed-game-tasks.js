'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tasks = [
      // ==================== EASY ====================
      {
        title: 'Two Sum',
        description: `Дан массив целых чисел \`nums\` и целое число \`target\`. Верните индексы двух чисел так, чтобы их сумма равнялась \`target\`.

Вы можете предположить, что каждый вход имеет ровно одно решение, и вы не можете использовать один и тот же элемент дважды.

**Пример:**
\`\`\`
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
Explanation: nums[0] + nums[1] = 2 + 7 = 9
\`\`\``,
        difficulty: 'easy',
        timeLimit: 180,
        languages: JSON.stringify(['javascript', 'typescript', 'python', 'java', 'cpp', 'go']),
        testCases: JSON.stringify([
          { input: { nums: [2, 7, 11, 15], target: 9 }, expectedOutput: [0, 1], isHidden: false },
          { input: { nums: [3, 2, 4], target: 6 }, expectedOutput: [1, 2], isHidden: false },
          { input: { nums: [3, 3], target: 6 }, expectedOutput: [0, 1], isHidden: false },
          { input: { nums: [1, 5, 8, 3, 9, 2], target: 11 }, expectedOutput: [2, 3], isHidden: true },
          { input: { nums: [0, 4, 3, 0], target: 0 }, expectedOutput: [0, 3], isHidden: true }
        ]),
        starterCode: JSON.stringify({
          javascript: `function solution(input) {
  const { nums, target } = input;
  // Ваш код здесь

}`,
          python: `def solution(input):
    nums = input['nums']
    target = input['target']
    # Ваш код здесь
    pass`,
          java: `class Solution {
    public int[] solution(Object input) {
        // Ваш код здесь
        return new int[]{0, 1};
    }
}`
        }),
        solution: JSON.stringify({
          javascript: `function solution(input) {
  const { nums, target } = input;
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`
        }),
        hints: JSON.stringify([
          'Попробуйте использовать хеш-таблицу для хранения уже просмотренных чисел',
          'Для каждого числа проверяйте, есть ли в хеш-таблице его "дополнение" до target',
          'Временная сложность должна быть O(n)'
        ]),
        category: 'arrays',
        tags: JSON.stringify(['hash-table', 'array']),
        points: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Palindrome Check',
        description: `Определите, является ли строка палиндромом. Учитывайте только буквенно-цифровые символы и игнорируйте регистр.

**Пример:**
\`\`\`
Input: "A man, a plan, a canal: Panama"
Output: true

Input: "race a car"
Output: false
\`\`\``,
        difficulty: 'easy',
        timeLimit: 180,
        languages: JSON.stringify(['javascript', 'typescript', 'python', 'java', 'cpp', 'go']),
        testCases: JSON.stringify([
          { input: 'A man, a plan, a canal: Panama', expectedOutput: true, isHidden: false },
          { input: 'race a car', expectedOutput: false, isHidden: false },
          { input: ' ', expectedOutput: true, isHidden: false },
          { input: 'Was it a car or a cat I saw?', expectedOutput: true, isHidden: true },
          { input: '0P', expectedOutput: false, isHidden: true }
        ]),
        starterCode: JSON.stringify({
          javascript: `function solution(s) {
  // Ваш код здесь

}`,
          python: `def solution(s):
    # Ваш код здесь
    pass`
        }),
        solution: JSON.stringify({
          javascript: `function solution(s) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean === clean.split('').reverse().join('');
}`
        }),
        hints: JSON.stringify([
          'Сначала очистите строку от лишних символов',
          'Приведите всё к одному регистру',
          'Можно использовать два указателя с начала и конца строки'
        ]),
        category: 'strings',
        tags: JSON.stringify(['string', 'two-pointers']),
        points: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'FizzBuzz',
        description: `Напишите функцию, которая для чисел от 1 до n возвращает:
- "Fizz" если число делится на 3
- "Buzz" если число делится на 5
- "FizzBuzz" если число делится и на 3, и на 5
- Само число в виде строки в остальных случаях

**Пример:**
\`\`\`
Input: n = 15
Output: ["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]
\`\`\``,
        difficulty: 'easy',
        timeLimit: 180,
        languages: JSON.stringify(['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'csharp', 'kotlin']),
        testCases: JSON.stringify([
          { input: 3, expectedOutput: ['1', '2', 'Fizz'], isHidden: false },
          { input: 5, expectedOutput: ['1', '2', 'Fizz', '4', 'Buzz'], isHidden: false },
          { input: 15, expectedOutput: ['1','2','Fizz','4','Buzz','Fizz','7','8','Fizz','Buzz','11','Fizz','13','14','FizzBuzz'], isHidden: true }
        ]),
        starterCode: JSON.stringify({
          javascript: `function solution(n) {
  // Ваш код здесь

}`,
          python: `def solution(n):
    # Ваш код здесь
    pass`
        }),
        solution: JSON.stringify({
          javascript: `function solution(n) {
  const result = [];
  for (let i = 1; i <= n; i++) {
    if (i % 15 === 0) result.push('FizzBuzz');
    else if (i % 3 === 0) result.push('Fizz');
    else if (i % 5 === 0) result.push('Buzz');
    else result.push(String(i));
  }
  return result;
}`
        }),
        hints: JSON.stringify([
          'Проверяйте делимость на 15 первой, чтобы обработать случай FizzBuzz',
          'Используйте оператор % для проверки делимости'
        ]),
        category: 'basics',
        tags: JSON.stringify(['math', 'string']),
        points: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ==================== MEDIUM ====================
      {
        title: 'Valid Parentheses',
        description: `Дана строка s, содержащая только символы '(', ')', '{', '}', '[' и ']'. Определите, является ли входная строка валидной.

Строка валидна если:
1. Открывающие скобки закрываются скобками того же типа
2. Открывающие скобки закрываются в правильном порядке
3. Каждой закрывающей скобке соответствует открывающая того же типа

**Пример:**
\`\`\`
Input: s = "()[]{}"
Output: true

Input: s = "(]"
Output: false
\`\`\``,
        difficulty: 'medium',
        timeLimit: 300,
        languages: JSON.stringify(['javascript', 'typescript', 'python', 'java', 'cpp', 'go']),
        testCases: JSON.stringify([
          { input: '()', expectedOutput: true, isHidden: false },
          { input: '()[]{}', expectedOutput: true, isHidden: false },
          { input: '(]', expectedOutput: false, isHidden: false },
          { input: '([)]', expectedOutput: false, isHidden: true },
          { input: '{[]}', expectedOutput: true, isHidden: true },
          { input: '((()))', expectedOutput: true, isHidden: true },
          { input: '((()', expectedOutput: false, isHidden: true }
        ]),
        starterCode: JSON.stringify({
          javascript: `function solution(s) {
  // Ваш код здесь

}`,
          python: `def solution(s):
    # Ваш код здесь
    pass`
        }),
        solution: JSON.stringify({
          javascript: `function solution(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const char of s) {
    if (char in map) {
      if (stack.pop() !== map[char]) return false;
    } else {
      stack.push(char);
    }
  }
  return stack.length === 0;
}`
        }),
        hints: JSON.stringify([
          'Используйте стек для отслеживания открывающих скобок',
          'При встрече закрывающей скобки проверяйте, соответствует ли она последней открывающей',
          'В конце стек должен быть пустым'
        ]),
        category: 'data-structures',
        tags: JSON.stringify(['stack', 'string']),
        points: 20,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Longest Substring Without Repeating',
        description: `Найдите длину самой длинной подстроки без повторяющихся символов.

**Пример:**
\`\`\`
Input: s = "abcabcbb"
Output: 3
Explanation: Ответ - "abc" с длиной 3

Input: s = "bbbbb"
Output: 1
Explanation: Ответ - "b" с длиной 1

Input: s = "pwwkew"
Output: 3
Explanation: Ответ - "wke" с длиной 3
\`\`\``,
        difficulty: 'medium',
        timeLimit: 300,
        languages: JSON.stringify(['javascript', 'typescript', 'python', 'java', 'cpp', 'go']),
        testCases: JSON.stringify([
          { input: 'abcabcbb', expectedOutput: 3, isHidden: false },
          { input: 'bbbbb', expectedOutput: 1, isHidden: false },
          { input: 'pwwkew', expectedOutput: 3, isHidden: false },
          { input: '', expectedOutput: 0, isHidden: true },
          { input: 'dvdf', expectedOutput: 3, isHidden: true },
          { input: 'anviaj', expectedOutput: 5, isHidden: true }
        ]),
        starterCode: JSON.stringify({
          javascript: `function solution(s) {
  // Ваш код здесь

}`,
          python: `def solution(s):
    # Ваш код здесь
    pass`
        }),
        solution: JSON.stringify({
          javascript: `function solution(s) {
  const seen = new Map();
  let maxLen = 0;
  let start = 0;
  for (let end = 0; end < s.length; end++) {
    if (seen.has(s[end]) && seen.get(s[end]) >= start) {
      start = seen.get(s[end]) + 1;
    }
    seen.set(s[end], end);
    maxLen = Math.max(maxLen, end - start + 1);
  }
  return maxLen;
}`
        }),
        hints: JSON.stringify([
          'Используйте технику "скользящего окна"',
          'Храните индексы символов в хеш-таблице',
          'Сдвигайте левую границу окна при обнаружении повтора'
        ]),
        category: 'strings',
        tags: JSON.stringify(['sliding-window', 'hash-table', 'string']),
        points: 20,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Binary Search',
        description: `Реализуйте бинарный поиск. Дан отсортированный массив целых чисел \`nums\` и целое число \`target\`. Верните индекс элемента, если он найден, иначе верните -1.

Алгоритм должен работать за O(log n).

**Пример:**
\`\`\`
Input: nums = [-1,0,3,5,9,12], target = 9
Output: 4

Input: nums = [-1,0,3,5,9,12], target = 2
Output: -1
\`\`\``,
        difficulty: 'medium',
        timeLimit: 300,
        languages: JSON.stringify(['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'c']),
        testCases: JSON.stringify([
          { input: { nums: [-1,0,3,5,9,12], target: 9 }, expectedOutput: 4, isHidden: false },
          { input: { nums: [-1,0,3,5,9,12], target: 2 }, expectedOutput: -1, isHidden: false },
          { input: { nums: [5], target: 5 }, expectedOutput: 0, isHidden: false },
          { input: { nums: [2,5], target: 5 }, expectedOutput: 1, isHidden: true },
          { input: { nums: [1,2,3,4,5,6,7,8,9,10], target: 7 }, expectedOutput: 6, isHidden: true }
        ]),
        starterCode: JSON.stringify({
          javascript: `function solution(input) {
  const { nums, target } = input;
  // Ваш код здесь

}`,
          python: `def solution(input):
    nums = input['nums']
    target = input['target']
    # Ваш код здесь
    pass`
        }),
        solution: JSON.stringify({
          javascript: `function solution(input) {
  const { nums, target } = input;
  let left = 0, right = nums.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`
        }),
        hints: JSON.stringify([
          'Используйте два указателя: left и right',
          'Вычисляйте середину и сравнивайте с target',
          'Сужайте диапазон поиска в зависимости от сравнения'
        ]),
        category: 'algorithms',
        tags: JSON.stringify(['binary-search', 'array']),
        points: 20,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ==================== HARD ====================
      {
        title: 'Merge K Sorted Lists',
        description: `Даны k отсортированных связных списков. Объедините их в один отсортированный список.

Для упрощения входные данные представлены как массив массивов (каждый внутренний массив - это связный список).

**Пример:**
\`\`\`
Input: lists = [[1,4,5],[1,3,4],[2,6]]
Output: [1,1,2,3,4,4,5,6]

Input: lists = []
Output: []

Input: lists = [[]]
Output: []
\`\`\``,
        difficulty: 'hard',
        timeLimit: 600,
        languages: JSON.stringify(['javascript', 'typescript', 'python', 'java', 'cpp']),
        testCases: JSON.stringify([
          { input: [[1,4,5],[1,3,4],[2,6]], expectedOutput: [1,1,2,3,4,4,5,6], isHidden: false },
          { input: [], expectedOutput: [], isHidden: false },
          { input: [[]], expectedOutput: [], isHidden: false },
          { input: [[1],[2],[3]], expectedOutput: [1,2,3], isHidden: true },
          { input: [[1,2,3],[4,5,6],[0,7,8]], expectedOutput: [0,1,2,3,4,5,6,7,8], isHidden: true }
        ]),
        starterCode: JSON.stringify({
          javascript: `function solution(lists) {
  // Ваш код здесь

}`,
          python: `def solution(lists):
    # Ваш код здесь
    pass`
        }),
        solution: JSON.stringify({
          javascript: `function solution(lists) {
  if (!lists.length) return [];
  const merged = lists.flat().sort((a, b) => a - b);
  return merged;
}

// Оптимальное решение с heap - O(n log k)
function solutionOptimal(lists) {
  const result = [];
  const pointers = lists.map(() => 0);

  while (true) {
    let minVal = Infinity;
    let minIdx = -1;

    for (let i = 0; i < lists.length; i++) {
      if (pointers[i] < lists[i].length && lists[i][pointers[i]] < minVal) {
        minVal = lists[i][pointers[i]];
        minIdx = i;
      }
    }

    if (minIdx === -1) break;
    result.push(minVal);
    pointers[minIdx]++;
  }

  return result;
}`
        }),
        hints: JSON.stringify([
          'Можно использовать min-heap (приоритетную очередь) для эффективного выбора минимального элемента',
          'Простое решение: объединить все элементы и отсортировать',
          'Оптимальное решение работает за O(n log k), где k - количество списков'
        ]),
        category: 'data-structures',
        tags: JSON.stringify(['linked-list', 'heap', 'divide-and-conquer']),
        points: 40,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Longest Valid Parentheses',
        description: `Дана строка, содержащая только символы '(' и ')'. Найдите длину самой длинной валидной (правильно сформированной) последовательности скобок.

**Пример:**
\`\`\`
Input: s = "(()"
Output: 2
Explanation: Самая длинная валидная подстрока - "()"

Input: s = ")()())"
Output: 4
Explanation: Самая длинная валидная подстрока - "()()"

Input: s = ""
Output: 0
\`\`\``,
        difficulty: 'hard',
        timeLimit: 600,
        languages: JSON.stringify(['javascript', 'typescript', 'python', 'java', 'cpp', 'go']),
        testCases: JSON.stringify([
          { input: '(()', expectedOutput: 2, isHidden: false },
          { input: ')()())', expectedOutput: 4, isHidden: false },
          { input: '', expectedOutput: 0, isHidden: false },
          { input: '()(())', expectedOutput: 6, isHidden: true },
          { input: '(()()', expectedOutput: 4, isHidden: true },
          { input: '(()(((()', expectedOutput: 2, isHidden: true }
        ]),
        starterCode: JSON.stringify({
          javascript: `function solution(s) {
  // Ваш код здесь

}`,
          python: `def solution(s):
    # Ваш код здесь
    pass`
        }),
        solution: JSON.stringify({
          javascript: `function solution(s) {
  let maxLen = 0;
  const stack = [-1];

  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') {
      stack.push(i);
    } else {
      stack.pop();
      if (stack.length === 0) {
        stack.push(i);
      } else {
        maxLen = Math.max(maxLen, i - stack[stack.length - 1]);
      }
    }
  }

  return maxLen;
}`
        }),
        hints: JSON.stringify([
          'Используйте стек для отслеживания индексов',
          'Храните в стеке индекс последней невалидной позиции',
          'Можно также решить с помощью динамического программирования'
        ]),
        category: 'algorithms',
        tags: JSON.stringify(['stack', 'dynamic-programming', 'string']),
        points: 40,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Trapping Rain Water',
        description: `Дан массив неотрицательных целых чисел, представляющих карту высот, где ширина каждого столбца равна 1. Вычислите, сколько воды может быть собрано после дождя.

**Пример:**
\`\`\`
Input: height = [0,1,0,2,1,0,1,3,2,1,2,1]
Output: 6
Explanation: На изображении синим показана собранная вода

Input: height = [4,2,0,3,2,5]
Output: 9
\`\`\``,
        difficulty: 'hard',
        timeLimit: 600,
        languages: JSON.stringify(['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'c']),
        testCases: JSON.stringify([
          { input: [0,1,0,2,1,0,1,3,2,1,2,1], expectedOutput: 6, isHidden: false },
          { input: [4,2,0,3,2,5], expectedOutput: 9, isHidden: false },
          { input: [1,2,3,4,5], expectedOutput: 0, isHidden: true },
          { input: [5,4,3,2,1], expectedOutput: 0, isHidden: true },
          { input: [2,0,2], expectedOutput: 2, isHidden: true }
        ]),
        starterCode: JSON.stringify({
          javascript: `function solution(height) {
  // Ваш код здесь

}`,
          python: `def solution(height):
    # Ваш код здесь
    pass`
        }),
        solution: JSON.stringify({
          javascript: `function solution(height) {
  if (!height.length) return 0;

  let left = 0, right = height.length - 1;
  let leftMax = 0, rightMax = 0;
  let water = 0;

  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= leftMax) {
        leftMax = height[left];
      } else {
        water += leftMax - height[left];
      }
      left++;
    } else {
      if (height[right] >= rightMax) {
        rightMax = height[right];
      } else {
        water += rightMax - height[right];
      }
      right--;
    }
  }

  return water;
}`
        }),
        hints: JSON.stringify([
          'Вода в позиции i = min(maxLeft, maxRight) - height[i]',
          'Можно предварительно вычислить maxLeft и maxRight для каждой позиции',
          'Оптимальное решение использует два указателя и работает за O(n) с O(1) памяти'
        ]),
        category: 'algorithms',
        tags: JSON.stringify(['two-pointers', 'dynamic-programming', 'stack']),
        points: 40,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('GameTasks', tasks);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('GameTasks', null, {});
  }
};