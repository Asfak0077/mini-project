const ActivityLog = require('../models/ActivityLog');

/**
 * Logs an activity to the database
 * @param {string} complaintId - The ID of the complaint
 * @param {string} action - The action performed (created, assigned, reassigned, status_changed, escalated, deleted, feedback_submitted)
 * @param {object} performedBy - Details of the user who performed the action { userId, name, role }
 * @param {object} details - Any additional details for the log
 * @param {string} notes - Optional notes
 */
const logActivity = async (complaintId, action, performedBy, details = {}, notes = '') => {
  try {
    const log = new ActivityLog({
      complaintId,
      action,
      performedBy,
      details,
      notes
    });
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to avoid breaking the main flow
    return null;
  }
};

module.exports = { logActivity };
