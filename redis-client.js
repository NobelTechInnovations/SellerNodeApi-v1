// // redisClient.js
// import { createClient } from 'redis';

// // Create the Redis client instance
// const RedisClient = createClient({
//   username: 'default',
//   password: 'VKpi698NU6kLFWrDJSQ3NjCP6Z78gbAX',
//   socket: {
//     host: 'redis-19337.c301.ap-south-1-1.ec2.cloud.redislabs.com',
//     port: 19337,
//      tls: false,                  
//     reconnectStrategy(retries) {
//       if (retries > 10) return false;
//       return Math.min(retries * 200, 2000); 
//     }
//   }
// });

// RedisClient.on('error', (err) => {
//   console.error('[Redis] Client Error:', err?.message || err);
// });

// await RedisClient.connect();

// export default RedisClient;

import { createClient } from "redis";

const RedisClient = createClient({
  url: process.env.REDIS_URL,

  socket: {
    tls: true, // Redis Cloud usually requires TLS
    rejectUnauthorized: false,

    reconnectStrategy(retries) {
      if (retries > 10) {
        console.error("Redis max retries reached");
        return false;
      }

      return Math.min(retries * 200, 2000);
    },
  },
});

RedisClient.on("connect", () => {
  console.log("🔄 Connecting to Redis...");
});

RedisClient.on("ready", () => {
  console.log("✅ Redis Ready");
});

RedisClient.on("error", (err) => {
  console.error("[Redis] Client Error:", err?.message || err);
});

RedisClient.on("end", () => {
  console.log("❌ Redis Connection Closed");
});

// Connect without crashing app
(async () => {
  try {
    await RedisClient.connect();
    console.log("✅ Redis Connected");
  } catch (err) {
    console.error("❌ Redis Failed:", err?.message || err);
  }
})();

export default RedisClient;