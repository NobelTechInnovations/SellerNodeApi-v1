// redisClient.js
import { createClient } from 'redis';

// Create the Redis client instance
const RedisClient = createClient({
  username: 'default',
  password: 'VKpi698NU6kLFWrDJSQ3NjCP6Z78gbAX',
  socket: {
    host: 'redis-19337.c301.ap-south-1-1.ec2.cloud.redislabs.com',
    port: 19337,
    tls: false,
    reconnectStrategy(retries) {
      if (retries > 5) return false; // stop retrying after 5 attempts
      return Math.min(retries * 500, 3000);
    }
  }
});

RedisClient.on('error', (err) => {
  console.warn('[Redis] Client Error (non-fatal):', err?.message || err);
});

RedisClient.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

// Connect gracefully — server starts even if Redis is unavailable
try {
  await RedisClient.connect();
} catch (err) {
  console.warn('[Redis] Could not connect (cart caching disabled):', err?.message || err);
}

export default RedisClient;
