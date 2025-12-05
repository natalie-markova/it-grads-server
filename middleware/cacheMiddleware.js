const redisClient = require('../config/redis');

/**
 * Cache middleware - кэширует GET запросы
 * @param {number} ttl - Time To Live в секундах (по умолчанию 300 = 5 минут)
 */
const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // Кэшируем только GET запросы
    if (req.method !== 'GET') {
      return next();
    }

    // Проверяем подключение к Redis
    if (!redisClient.isOpen) {
      console.log('⚠️  Redis not connected, skipping cache');
      return next();
    }

    // Создаем уникальный ключ на основе URL, query параметров И userId (если есть)
    // Это критично для персонализированных данных (профиль, избранное и т.д.)
    const userId = req.userId ? `:user:${req.userId}` : '';
    const cacheKey = `cache:${req.originalUrl || req.url}${userId}`;

    try {
      // Пытаемся получить данные из кэша
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        console.log(`✓ Cache HIT: ${cacheKey}`);
        return res.json(JSON.parse(cachedData));
      }

      console.log(`✗ Cache MISS: ${cacheKey}`);

      // Сохраняем оригинальную функцию res.json
      const originalJson = res.json.bind(res);

      // Переопределяем res.json для кэширования ответа
      res.json = function (data) {
        // Кэшируем только успешные ответы
        if (res.statusCode === 200) {
          redisClient.setEx(cacheKey, ttl, JSON.stringify(data))
            .catch(err => console.error('Redis setEx error:', err));
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Инвалидация кэша по паттерну
 * @param {string} pattern - Паттерн для удаления (например, 'cache:/api/users/*')
 */
const invalidateCache = async (pattern) => {
  try {
    if (!redisClient.isOpen) {
      return;
    }

    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`✓ Invalidated ${keys.length} cache keys matching: ${pattern}`);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

module.exports = { cacheMiddleware, invalidateCache };