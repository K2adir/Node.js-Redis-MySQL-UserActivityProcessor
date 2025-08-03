const express = require("express");
const { initRedis } = require("./services/redisClient");
const pool = require("./services/db"); // Import the DB pool
const userActivityRoutes = require("./routes/userActivity");

const app = express();
app.use(express.json());
app.use("/api/user-activity", userActivityRoutes);

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
