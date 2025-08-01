const express = require("express");
const mysql = require("mysql2");
const redis = require("redis");
const axios = require("axios");

const app = express();
app.use(express.json());

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "user",
  password: "password",
  database: "social_analytics",
});

// Redis client
const redisClient = redis.createClient();

// I'm assuming I'm not allowed to use External libs like ZOD or Joi for validation and can't use typescript.
//
// allowed activity types for validation
const ALLOWED_TYPES = ["likes", "comments", "shares"];

// Process user activity
app.post("/api/user-activity", async (req, res) => {
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
    const activityErrors = [];

    // Validate required fields,
    // this would be easier with ZOD.
    // Instructions aren't clear on whats allowed.
    if (!activity.userId) {
      activityErrors.push('"userId" is required');
    }

    if (!activity.type) {
      activityErrors.push('"type" is required');
    } else if (!ALLOWED_TYPES.includes(activity.type)) {
      activityErrors.push(`"type" must be one of: ${ALLOWED_TYPES.join(", ")}`);
    }

    // to avoid date parsing issues.
    if (!activity.timestamp) {
      activityErrors.push('"timestamp" is required');
    } else if (isNaN(Date.parse(activity.timestamp))) {
      activityErrors.push('"timestamp" must be a valid date');
    }

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

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
