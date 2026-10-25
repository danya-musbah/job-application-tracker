const interviewService = require('../services/interviewService');

function list(req, res, next) {
  try {
    const { applicationId, upcoming } = req.query;
    const result = interviewService.listInterviews(req.user.id, {
      applicationId: applicationId ? Number(applicationId) : undefined,
      upcoming: upcoming === 'true',
    });
    res.json(result);
  } catch (err) { next(err); }
}

function create(req, res, next) {
  try {
    const result = interviewService.createInterview(req.user.id, req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

function update(req, res, next) {
  try {
    const result = interviewService.updateInterview(req.user.id, Number(req.params.id), req.body);
    res.json(result);
  } catch (err) { next(err); }
}

function remove(req, res, next) {
  try {
    interviewService.deleteInterview(req.user.id, Number(req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove };
