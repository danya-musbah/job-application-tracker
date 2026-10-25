const followupService = require('../services/followupService');

function list(req, res, next) {
  try {
    const { applicationId, status } = req.query;
    const result = followupService.listFollowups(req.user.id, {
      applicationId: applicationId ? Number(applicationId) : undefined,
      status,
    });
    res.json(result);
  } catch (err) { next(err); }
}

function create(req, res, next) {
  try {
    const result = followupService.createFollowup(req.user.id, req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

function update(req, res, next) {
  try {
    const result = followupService.updateFollowup(req.user.id, Number(req.params.id), req.body);
    res.json(result);
  } catch (err) { next(err); }
}

function remove(req, res, next) {
  try {
    followupService.deleteFollowup(req.user.id, Number(req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove };
