const axios = require("axios");

// axios-retry module alike.
// implementing a simple retry mechanism - axios-retry would be better.

//If the external service doesn't respond within 3 sec, it will reject, retry mechanism will kick in.
async function postWithRetry(url, data, retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(url, data, { timeout: 3000 });
      return response; // Success
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }
}

// webhook.site is for local testing
const NOTIF_URL =
  process.env.NOTIF_URL ||
  "https://webhook.site/e5842dcf-ac41-4998-81ca-b20ba9b1c512";

async function notifyExternalService(activities) {
  const failedNotifications = [];
  const results = await Promise.allSettled(
    activities.map((activity) => postWithRetry(NOTIF_URL, activity))
  );
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      failedNotifications.push({
        userId: activities[index].userId,
        type: activities[index].type,
        error: result.reason.message,
      });
    }
  });
  return failedNotifications;
}

module.exports = { notifyExternalService };
