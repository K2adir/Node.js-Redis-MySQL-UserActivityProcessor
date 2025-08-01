const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "user",
  password: "password",
  database: "social_analytics",
});

module.exports = db;
