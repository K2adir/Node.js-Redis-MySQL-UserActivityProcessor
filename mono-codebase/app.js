const express = require("express");
const mysql = require("mysql2/promise");
const redis = require("redis");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

// Validates incoming activity shape to guard against malformed data
// Helps keep route handlers clean and makes validation testable
// Using ZOD would be better, but instructions aren't clear on using external libraries
const ALLOWED_TYPES = ["likes", "comments", "shares"];

function validateActivity(activity) {
  const errors = [];
  if (
    activity.userId === undefined ||
    activity.userId === null ||
    isNaN(Number(activity.userId))
  ) {
    errors.push('"userId" must be a valid number');
  }
  if (!activity.type) {
    errors.push('"type" is required');
  } else if (!ALLOWED_TYPES.includes(activity.type)) {
    errors.push(`"type" must be one of: ${ALLOWED_TYPES.join(", ")}`);
  }
  if (typeof activity !== "object" || activity === null) {
    errors.push("Activity must be an object");
    return errors;
  }
  if (!activity.timestamp) {
    errors.push('"timestamp" is required');
  } else {
    const parsedDate = new Date(activity.timestamp);
    if (isNaN(parsedDate.getTime())) {
      errors.push('"timestamp" must be a valid date');
    } else if (parsedDate > new Date()) {
      errors.push("Timestamp cannot be in the future");
    }
  }
  return errors;
}

require("dotenv").config();
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
});
pool.on("error", (err) =>
  console.error(`${new Date().toISOString()} DB pool error:`, err)
);

// Batch insert into MySQL to improve performance and reduce load
// Uses parameterized values to avoid SQL injection
async function insertActivities(activities) {
  if (!activities.length) return;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const values = activities.map(({ userId, type, timestamp }) => [
      userId,
      type,
      new Date(timestamp).toISOString().slice(0, 19).replace("T", " "),
    ]);
    const [results] = await connection.query(
      "INSERT INTO user_activities (userId, type, timestamp) VALUES ?",
      [values]
    );
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Connects Redis with optional lazy init
// Awaited properly in app.js before accepting requests
const redisClient = redis.createClient();
async function initRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect(); // Prevents race conditions on first use
  }
}

// Updates Redis user stats using HINCRBY for atomic counters
// Fallback: failed updates are collected to allow retry/reporting
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
    console.error(`${new Date().toISOString()} Redis pipeline failed:`, err);
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

// Uses Promise.allSettled to isolate and track failures without aborting the batch
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

app.post("/api/user-activity", async (req, res) => {
  const activities = req.body.activities;
  if (!Array.isArray(activities) || activities.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request must include a non-empty array of activities",
    });
  }
  // DDOS protection
  if (activities.length > 1000) {
    return res.status(413).json({
      success: false,
      message: "Batch size exceeds maximum limit of 1000 activities",
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
    console.error(`${new Date().toISOString()} Processing error:`, err);
    return res.status(500).json({
      success: false,
      message: "Failed to process activities.",
      error: err.message,
    });
  }
});

const port = 3000;
// Add DB init function
async function initDB() {
  await pool.query("SELECT 1"); // Simple ping to check DB connection
}
Promise.all([initRedis(), initDB()])
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Init failed:", err);
    process.exit(1);
  });
