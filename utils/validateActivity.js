// Validates incoming activity shape to guard against malformed data
// Helps keep route handlers clean and makes validation testable
const { ALLOWED_TYPES } = require("./constants");

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

  if (!activity.timestamp) {
    errors.push('"timestamp" is required');
  } else {
    const parsedDate = new Date(activity.timestamp);
    if (isNaN(parsedDate.getTime())) {
      errors.push('"timestamp" must be a valid date');
    }
  }

  return errors;
}

module.exports = { validateActivity };
