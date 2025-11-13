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
      if (retries > 10) return false;
      return Math.min(retries * 200, 2000); 
    }
  }
});

RedisClient.on('error', (err) => {
  console.error('[Redis] Client Error:', err?.message || err);
});

await RedisClient.connect();

export default RedisClient;
