const redis = require("redis");

const redisClient = redis.createClient();
redisClient.connect(); // Note: returns a promise, not awaited here

module.exports = redisClient;

// todo - add error handling for redis connection
