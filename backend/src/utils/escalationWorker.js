const Complaint = require('../models/Complaint');
const { getIO, emitToRole } = require('./socketService');
const Notification = require('../models/Notification');
const { logActivity } = require('./loggerService');

const mongoose = require('mongoose');

const ESCALATION_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

const runEscalationCheck = async () => {
    if (mongoose.connection.readyState !== 1) {
        return;
    }
    console.log('Running auto-escalation check...');
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - ESCALATION_THRESHOLD_MS);

    try {
        // Find complaints that are not resolved, not already escalated, and older than 48 hours
        const overdueComplaints = await Complaint.find({
            status: { $ne: 'Resolved' },
            priority: { $ne: 'Urgent' },
            createdAt: { $lt: cutoffDate }
        });

        if (overdueComplaints.length === 0) {
            return;
        }

        console.log(`Found ${overdueComplaints.length} complaints for escalation.`);

        for (const complaint of overdueComplaints) {
            complaint.priority = 'Urgent';
            complaint.status = 'Escalated';
            complaint.resolutionTimeline.push({
                status: 'Escalated',
                timestamp: now,
                updatedBy: 'System',
                notes: 'Automatically escalated due to 48-hour resolution threshold.'
            });

            await complaint.save();

            // Log activity
            await logActivity(
                complaint._id,
                'escalated',
                { userId: 'System', name: 'Auto Escalation', role: 'system' },
                { previousPriority: 'high', newPriority: 'Urgent' },
                'Automatically escalated due to 48-hour resolution threshold.'
            );

            // Create notification for admin
            const notification = new Notification({
                recipientRole: 'admin',
                type: 'complaint_escalated',
                title: 'Complaint Auto-Escalated',
                message: `Complaint #${complaint._id.toString().slice(-6)} has been escalated to Urgent.`,
                relatedComplaint: complaint._id
            });
            await notification.save();

            // Emit socket event to admin
            const io = getIO();
            if (io) {
                emitToRole('admin', 'new_notification', notification);
                emitToRole('admin', 'status_updated', {
                    complaintId: complaint._id,
                    status: 'Escalated',
                    priority: 'Urgent'
                });
            }
        }

        console.log('Escalation check complete.');
    } catch (error) {
        console.error('Escalation check failed:', error);
    }
};

// Run every hour
const initEscalationWorker = () => {
    // Run once on startup
    runEscalationCheck();
    
    // Schedule periodic checks
    setInterval(runEscalationCheck, 60 * 60 * 1000); // 1 hour
};

module.exports = { initEscalationWorker };
