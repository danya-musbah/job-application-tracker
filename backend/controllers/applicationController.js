const applicationService = require('../services/applicationService');
const timelineService = require('../services/timelineService');
const interviewService = require('../services/interviewService');
const followupService = require('../services/followupService');
const exportService = require('../services/exportService');
const importService = require('../services/importService');

function list(req, res, next) {
  try {
    const result = applicationService.listApplications(req.user.id, req.query);
    res.json(result);
  } catch (err) { next(err); }
}

function getOne(req, res, next) {
  try {
    const app = applicationService.getApplication(req.user.id, Number(req.params.id));
    const timeline = timelineService.getTimeline(app.id);
    const interviews = interviewService.listInterviews(req.user.id, { applicationId: app.id });
    const followups = followupService.listFollowups(req.user.id, { applicationId: app.id });
    res.json({ ...app, timeline, interviews, followups });
  } catch (err) { next(err); }
}

function create(req, res, next) {
  try {
    const app = applicationService.createApplication(req.user.id, req.body);
    res.status(201).json(app);
  } catch (err) { next(err); }
}

function update(req, res, next) {
  try {
    const app = applicationService.updateApplication(req.user.id, Number(req.params.id), req.body);
    res.json(app);
  } catch (err) { next(err); }
}

function changeStatus(req, res, next) {
  try {
    const app = applicationService.changeStatus(req.user.id, Number(req.params.id), req.body.status);
    res.json(app);
  } catch (err) { next(err); }
}

function remove(req, res, next) {
  try {
    applicationService.deleteApplication(req.user.id, Number(req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
}

function exportJson(req, res, next) {
  try {
    const data = exportService.exportAsJson(req.user.id);
    res.setHeader('Content-Disposition', 'attachment; filename="applications.json"');
    res.json(data);
  } catch (err) { next(err); }
}

function exportCsv(req, res, next) {
  try {
    const csv = exportService.exportAsCsv(req.user.id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="applications.csv"');
    res.send(csv);
  } catch (err) { next(err); }
}

function importPreview(req, res, next) {
  try {
    const preview = importService.previewImport(req.user.id, req.body.csvText);
    res.json(preview);
  } catch (err) { next(err); }
}

function importCommit(req, res, next) {
  try {
    const result = importService.commitImport(req.user.id, req.body.rows);
    res.json(result);
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, changeStatus, remove, exportJson, exportCsv, importPreview, importCommit };
