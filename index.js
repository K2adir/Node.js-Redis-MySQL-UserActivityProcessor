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

// Process user activity
app.post("/api/user-activity", async (req, res) => {
  const activities = req.body.activities;

  try {
    // Process each activity
    for (let activity of activities) {
      // Validate activity
      if (!activity.userId || !activity.type || !activity.timestamp) {
        res.status(400).send("Invalid activity data");
        return;
      }

      // Update database
      const query = "INSERT INTO user_activities SET ?";
      db.query(query, activity, (error) => {
        if (error) {
          console.error("Database error:", error);
          throw error;
        }
      });

      // Update user stats in Redis
      const userKey = `user:${activity.userId}`;
      redisClient.get(userKey, (err, result) => {
        if (err) {
          console.error("Redis error:", err);
          throw err;
        }

        let stats = result
          ? JSON.parse(result)
          : { likes: 0, comments: 0, shares: 0 };
        stats[activity.type] += 1;
        redisClient.set(userKey, JSON.stringify(stats));
      });

      // Notify other services
      axios
        .post("http://notification-service/new-activity", activity)
        .catch((error) => console.error("Notification error:", error));
    }

    res.status(200).send("Activities processed");
  } catch (error) {
    console.error("Processing error:", error);
    res.status(500).send("Internal server error");
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
