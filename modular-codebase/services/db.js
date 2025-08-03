require("dotenv").config();
const mysql = require("mysql2/promise");
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
module.exports = pool;
