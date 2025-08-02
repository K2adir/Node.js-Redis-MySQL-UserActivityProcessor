const redis = require("redis");

const redisClient = redis.createClient();

async function initRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

module.exports = { redisClient, initRedis };
