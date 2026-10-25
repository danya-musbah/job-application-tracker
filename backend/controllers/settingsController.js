const userService = require('../services/userService');
const jobSourceService = require('../services/jobSourceService');
const tagService = require('../services/tagService');

function getProfile(req, res, next) {
  try {
    res.json(userService.getProfile(req.user.id));
  } catch (err) { next(err); }
}

function updateProfile(req, res, next) {
  try {
    res.json(userService.updateProfile(req.user.id, req.body));
  } catch (err) { next(err); }
}

function updatePreferences(req, res, next) {
  try {
    res.json(userService.updatePreferences(req.user.id, req.body));
  } catch (err) { next(err); }
}

function listJobSources(req, res, next) {
  try {
    res.json(jobSourceService.listJobSources(req.user.id));
  } catch (err) { next(err); }
}

function addJobSource(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(422).json({ error: 'Source name is required.' });
    res.status(201).json(jobSourceService.addCustomJobSource(req.user.id, name.trim()));
  } catch (err) { next(err); }
}

function listTags(req, res, next) {
  try {
    res.json(tagService.listAllTags(req.user.id));
  } catch (err) { next(err); }
}

module.exports = { getProfile, updateProfile, updatePreferences, listJobSources, addJobSource, listTags };
