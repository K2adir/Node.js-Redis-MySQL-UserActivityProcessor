const express = require("express");
const { initRedis } = require("./services/redisClient");
const userActivityRoutes = require("./routes/userActivity");

const app = express();
app.use(express.json());

app.use("/api/user-activity", userActivityRoutes);

const port = 3000;

initRedis()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Redis connection failed:", err);
    process.exit(1);
  });
