const redis = require('redis');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Redis: Too many retries, giving up');
        return new Error('Redis: Too many retries');
      }
      return retries * 100; // Reconnect after retries * 100ms
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