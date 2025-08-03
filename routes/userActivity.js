const express = require("express");

const { validateActivity } = require("../utils/validateActivity");

const { insertActivities } = require("../services/insertActivities");

const { updateUserStats } = require("../services/updateUserStats");

const { notifyExternalService } = require("../services/notifyExternalService");

const router = express.Router();

router.post("/", async (req, res) => {
  const activities = req.body.activities;

  if (!Array.isArray(activities) || activities.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request must include a non-empty array of activities",
    });
  }

  const validActivities = [];
  const errors = [];

  activities.forEach((activity, index) => {
    const activityErrors = validateActivity(activity);

    // Group validation feedback for bad inputs instead of stopping after first failure
    if (activityErrors.length > 0) {
      errors.push({
        index,
        errors: activityErrors,
      });
    } else {
      validActivities.push(activity);
    }
  });

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Some activities failed validation",
      errors,
    });
  }

  // better validation
  // try/catch + better error handling/msg's
  //
  try {
    //Batch insert for performance
    await insertActivities(validActivities);
    //Update Redis per activity using HINCRBY
    const failedUpdates = await updateUserStats(validActivities);
    //Notify downstream systems
    const failedNotifications = await notifyExternalService(validActivities);

    const baseMessage = `${validActivities.length} activities inserted.`;

    //Return partial success if Redis or notification failed for some items
    if (failedUpdates.length > 0 || failedNotifications.length > 0) {
      return res.status(207).json({
        success: false,
        message: `${baseMessage} ${
          failedUpdates.length
            ? `Redis failed for ${failedUpdates.length} users. `
            : ""
        }${
          failedNotifications.length
            ? `Notification failed for ${failedNotifications.length} users.`
            : ""
        }`,
        failedUpdates,
        failedNotifications,
      });
    }
    // Full success path
    return res.status(200).json({
      success: true,
      message: `${baseMessage} Stats and notifications sent successfully.`,
    });
  } catch (err) {
    // Catch unexpected system-level errors -> DB/Redis crash
    console.error("Processing error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to process activities.",
      error: err.message,
    });
  }
});

module.exports = router;
