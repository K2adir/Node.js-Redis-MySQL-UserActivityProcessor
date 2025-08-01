const express = require("express");
const userActivityRoutes = require("./routes/userActivity");

const app = express();
app.use(express.json());

app.use("/api/user-activity", userActivityRoutes);

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
