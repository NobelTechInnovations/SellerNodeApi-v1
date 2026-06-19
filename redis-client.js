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
  username: process.env.REDIS_USERNAME || "default",
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),

    reconnectStrategy(retries) {
      if (retries > 10) {
        console.log("Redis max retries reached");
        return false;
      }

      return Math.min(retries * 200, 2000);
    },
  },
});

RedisClient.on("connect", () => {
  console.log("🔄 Connecting Redis...");
});

RedisClient.on("ready", () => {
  console.log("✅ Redis Ready");
});

RedisClient.on("error", (err) => {
  console.error("❌ Redis Error:", err.message);
});

(async () => {
  try {
    await RedisClient.connect();
    console.log("✅ Redis Connected");
  } catch (err) {
    console.error("❌ Redis Connection Failed:", err.message);
  }
})();

export default RedisClient;