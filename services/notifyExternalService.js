const axios = require("axios");

async function notifyExternalService(activities) {
  const failedNotifications = [];

  const results = await Promise.allSettled(
    activities.map(
      (activity) =>
        axios.post(
          "https://webhook.site/e5842dcf-ac41-4998-81ca-b20ba9b1c512",
          activity
        )
      //   axios.post("https://external-service.com/notify", activity)
    )
  );

  results.forEach((result, index) => {
    {
      if (result.status === "rejected") {
        failedNotifications.push({
          userId: activities[index].userId,
          type: activities[index].type,
          error: result.reason.message,
        });
      }
    }
  });
  return failedNotifications;
}

module.exports = { notifyExternalService };
