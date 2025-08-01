const db = require("./db");

async function insertActivities(activities) {
  if (!activities.length) return;

  const values = activities.map(({ userId, type, timestamp }) => [
    userId,
    type,
    timestamp,
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
