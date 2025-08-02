const { redisClient } = require("./redisClient");

async function updateUserStats(activities) {
  const failedUpdates = [];

  for (const activity of activities) {
    const redisKey = `user:${activity.userId}`;

    try {
      await redisClient.hIncrBy(redisKey, activity.type, 1);
    } catch (err) {
      console.error(`Failed to update Redis for ${redisKey}`, err.message);
      failedUpdates.push({
        userId: activity.userId,
        type: activity.type,
        error: err.message,
      });
    }
  }

  return failedUpdates;
}

module.exports = { updateUserStats };
