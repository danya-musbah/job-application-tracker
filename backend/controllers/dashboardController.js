const dashboardService = require('../services/dashboardService');
const interviewService = require('../services/interviewService');
const followupService = require('../services/followupService');
const notificationService = require('../services/notificationService');
const userService = require('../services/userService');

function stats(req, res, next) {
  try {
    res.json(dashboardService.getStats(req.user.id));
  } catch (err) { next(err); }
}

function analytics(req, res, next) {
  try {
    res.json(dashboardService.getAnalytics(req.user.id));
  } catch (err) { next(err); }
}

function overview(req, res, next) {
  try {
    const profile = userService.getProfile(req.user.id);
    notificationService.generateReminders(req.user.id, profile.reminderDays);
    res.json({
      stats: dashboardService.getStats(req.user.id),
      analytics: dashboardService.getAnalytics(req.user.id),
      upcomingInterviews: interviewService.listInterviews(req.user.id, { upcoming: true }).slice(0, 5),
      overdueFollowups: followupService.listFollowups(req.user.id, { status: 'overdue' }),
      upcomingFollowups: followupService.listFollowups(req.user.id, { status: 'upcoming' }).slice(0, 5),
      unreadNotifications: notificationService.listNotifications(req.user.id, { unreadOnly: true }).length,
    });
  } catch (err) { next(err); }
}

module.exports = { stats, analytics, overview };
