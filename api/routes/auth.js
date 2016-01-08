'use strict';

var express = require('express') // express
  , mongoose = require('mongoose') // mongo abstraction
  , auth = require('../controllers/auth') // authorizations controller
  , person = require('../controllers/person') // person's controller
  , config = require('../config') // global configuration
;
var log = config.log;
var router = express.Router(); // express router

router.route('/register').post(function(req, res) {
  var email = req.body.email || null;
  var username = req.body.username || null;
  var password = req.body.password || null;
  if (!username || !password) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  auth.register(username, email, password, function(err, result) {
    if (err) {
      return res.status(400).json({ error: err });
    }
    res.json(result);
  });
});

router.route('/login').post(function(req, res) {
  var username = req.body.username || null;
  var password = req.body.password || null;
  if (!username || !password) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  auth.login(username, password, function(err, user) {
    if (err) {
      return res.status(401).json({ error: err });
    }
    res.json(user);
  });
});

router.route('/existsUsername').post(function(req, res) {
  var username = req.body.username || null;
  auth.existsUsername(username, function(err, result) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json(result);
  });
});

router.route('/allowableUsername').post(function(req, res) {
  var username = req.body.username || null;
  var result = auth.allowableUsername(username);
  res.json(result);
});

router.route('/allowablePassword').post(function(req, res) {
  var password = req.body.password || null;
  var result = auth.allowablePassword(password);
  res.json(result);
});

// error handling
router.use('/*', function(req, res, next) { // unforeseen request
  res.status(404).json({ error: 'auth path ' + req.originalUrl + ' not found' });
});

// export all router methods
module.exports = router;
