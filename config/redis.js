const redis = require('redis');

// Создаем mock-клиент для случаев, когда Redis недоступен
const mockClient = {
  isOpen: false,
  get: async () => null,
  setEx: async () => {},
  keys: async () => [],
  del: async () => {},
  on: () => {},
  connect: async () => {},
  disconnect: async () => {}
};

// Если REDIS_URL не указан, используем mock
if (!process.env.REDIS_URL) {
  console.log('⚠️  REDIS_URL not set, Redis caching disabled');
  module.exports = mockClient;
  return;
}

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Redis: Too many retries, giving up');
        return new Error('Redis: Too many retries');
      }
      return retries * 100;
    }
  }
});

redisClient.on('connect', () => {
  console.log('✔  Redis connected');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
})();

module.exports = redisClient;