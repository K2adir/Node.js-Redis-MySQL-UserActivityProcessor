// Batch insert into MySQL to improve performance and reduce load
// Uses parameterized values to avoid SQL injection

const db = require("./db");

async function insertActivities(activities) {
  if (!activities.length) return;

  const values = activities.map(({ userId, type, timestamp }) => [
    userId,
    type,
    new Date(timestamp).toISOString().slice(0, 19).replace("T", " "),
  ]);

  // instert multiple rows at once, instead of one by one.
  // reduces latency/load/easier to scale
  const sql = `
    INSERT INTO user_activities (userId, type, timestamp)
    VALUES ?
  `;

  return new Promise((resolve, reject) => {
    db.query(sql, [values], (error, results) => {
      if (error) return reject(error);
      resolve(results);
    });
  });
}

module.exports = { insertActivities };
