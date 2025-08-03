// Batch insert into MySQL to improve performance and reduce load
// Uses parameterized values to avoid SQL injection

const pool = require("./db");
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
module.exports = { insertActivities };
