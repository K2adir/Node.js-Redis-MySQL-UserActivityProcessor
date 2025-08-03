// Connects Redis with optional lazy init
// Awaited properly in app.js before accepting requests
const redis = require("redis");

const redisClient = redis.createClient();

async function initRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect(); // Prevents race conditions on first use
  }
}

module.exports = { redisClient, initRedis };
