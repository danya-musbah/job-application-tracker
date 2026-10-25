const notificationService = require('../services/notificationService');

function list(req, res, next) {
  try {
    const { unreadOnly } = req.query;
    res.json(notificationService.listNotifications(req.user.id, { unreadOnly: unreadOnly === 'true' }));
  } catch (err) { next(err); }
}

function markRead(req, res, next) {
  try {
    notificationService.markAsRead(req.user.id, Number(req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
}

function markAllRead(req, res, next) {
  try {
    notificationService.markAllAsRead(req.user.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { list, markRead, markAllRead };
