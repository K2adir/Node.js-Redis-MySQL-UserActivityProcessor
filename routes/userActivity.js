const express = require("express");
const db = require("../services/db");
const redisClient = require("../services/redisClient");
const { validateActivity } = require("../utils/validateActivity");

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

  return res.status(200).json({
    success: true,
    message: `${validActivities.length} activities validated successfully.`,
  });
});

module.exports = router;
