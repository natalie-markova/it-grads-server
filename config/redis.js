const redis = require('redis');

// Создаем mock-клиент для случаев, когда Redis недоступен
const mockClient = {
  isOpen: false,
  isReady: false,
  get: async () => null,
  setEx: async () => {},
  keys: async () => [],
  del: async () => {},
  on: () => mockClient,
  connect: async () => {},
  disconnect: async () => {},
  quit: async () => {}
};

// Если REDIS_URL не указан, используем mock
if (!process.env.REDIS_URL) {
  console.log('⚠️  REDIS_URL not set, Redis caching disabled');
  module.exports = mockClient;
  return;
}

let redisClient = null;
let isConnecting = false;
let connectionAttempts = 0;
const MAX_INITIAL_ATTEMPTS = 5;
const RETRY_DELAY = 3000; // 3 секунды между попытками

const createClient = () => {
  return redis.createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        // Бесконечные попытки переподключения с экспоненциальной задержкой
        const delay = Math.min(retries * 500, 30000); // max 30 секунд
        console.log(`🔄 Redis reconnecting in ${delay}ms... (attempt ${retries})`);
        return delay;
      },
      connectTimeout: 10000, // 10 секунд на подключение
    }
  });
};

const connectToRedis = async () => {
  if (isConnecting) return;
  isConnecting = true;

  while (connectionAttempts < MAX_INITIAL_ATTEMPTS) {
    try {
      connectionAttempts++;
      console.log(`🔄 Redis connection attempt ${connectionAttempts}/${MAX_INITIAL_ATTEMPTS}...`);

      redisClient = createClient();

      redisClient.on('connect', () => {
        console.log('✔  Redis connected');
      });

      redisClient.on('ready', () => {
        console.log('✔  Redis ready');
        connectionAttempts = 0; // Сбросить счётчик при успешном подключении
      });

      redisClient.on('error', (err) => {
        // Не логируем ошибки подключения - они ожидаемы при недоступном Redis
        if (!err.message.includes('ECONNREFUSED')) {
          console.error('❌ Redis error:', err.message);
        }
      });

      redisClient.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      redisClient.on('end', () => {
        console.log('⚠️  Redis connection closed');
      });

      await redisClient.connect();
      isConnecting = false;
      return; // Успешно подключились

    } catch (error) {
      console.log(`⚠️  Redis connection attempt ${connectionAttempts} failed: ${error.message}`);

      if (redisClient) {
        try {
          await redisClient.quit();
        } catch (e) {
          // Игнорируем ошибки при закрытии
        }
        redisClient = null;
      }

      if (connectionAttempts < MAX_INITIAL_ATTEMPTS) {
        console.log(`⏳ Waiting ${RETRY_DELAY}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  // Если все попытки неудачны
  console.log('⚠️  Redis not connected, using mock client. Caching disabled.');
  console.log('💡 To enable Redis:');
  console.log('   - Docker: docker-compose up -d redis');
  console.log('   - WSL: sudo service redis-server start');
  redisClient = mockClient;
  isConnecting = false;
};

// Запускаем подключение
connectToRedis();

// Экспортируем proxy-объект, который всегда указывает на актуальный клиент
const clientProxy = new Proxy({}, {
  get(target, prop) {
    const client = redisClient || mockClient;
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

module.exports = clientProxy;