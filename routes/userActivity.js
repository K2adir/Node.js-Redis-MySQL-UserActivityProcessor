const express = require("express");
const db = require("../services/db");

const redisClient = require("../services/redisClient");

const { validateActivity } = require("../utils/validateActivity");

const { insertActivities } = require("../services/insertActivities");

const { updateUserStats } = require("../services/updateUserStats");

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
    await insertActivities(validActivities);
    const failedUpdates = await updateUserStats(validActivities);

    const baseMessage = `${validActivities.length} activities inserted.`;

    if (failedUpdates.length > 0) {
      return res.status(207).json({
        success: false,
        message: `${baseMessage} Redis failed for ${failedUpdates.length} users.`,
        failedUpdates,
      });
    }

    return res.status(200).json({
      success: true,
      message: `${baseMessage} Stats updated successfully.`,
    });
  } catch (err) {
    console.error("Processing error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to process activities.",
      error: err.message,
    });
  }
});

module.exports = router;
