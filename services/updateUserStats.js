// Updates Redis user stats using HINCRBY for atomic counters
// Fallback: failed updates are collected to allow retry/reporting

const { redisClient } = require("./redisClient");
async function updateUserStats(activities) {
  const failedUpdates = [];
  const multi = redisClient.multi();
  activities.forEach((activity) => {
    const redisKey = `user:${activity.userId}`;
    multi.hIncrBy(redisKey, activity.type, 1);
  });
  try {
    await multi.exec();
  } catch (err) {
    console.error("Redis pipeline failed:", err);
    activities.forEach((act) =>
      failedUpdates.push({
        userId: act.userId,
        type: act.type,
        error: err.message,
      })
    );
  }
  return failedUpdates;
}
module.exports = { updateUserStats };
