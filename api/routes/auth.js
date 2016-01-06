var express = require('express') // express
  , mongoose = require('mongoose') // mongo abstraction
  , auth = require('../controllers/auth') // authorizations controller
  , person = require('../controllers/person') // person's controller
  , config = require('../config') // global configuration
;
var log = config.log;
var router = express.Router(); // express router

router.route('/login').post(function(req, res) {
  var username = req.body.username || null;
  var password = req.body.password || null;
  if (!username || !password) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  var user = auth.login(username, password);
  if (user.error) {
    return res.status(user.error.status).json({ error: user.error.message });
  }
  res.json(user.token);
});

router.route('/register').post(function(req, res) {
  var username = req.body.username || null;
  var email = req.body.email || null;
  var password = req.body.password || null;
  if (!username || !password) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  var user = auth.register(username, email, password);
  if (user.error) {
    return res.status(user.error.status).json({ error: user.error.message });
  }
  res.json(user);
});

router.route('/validateUsername').post(function(req, res) {
  var username = req.body.username || null;
  var response = auth.validateUsername(username);
  res.json(response);
});

router.route('/validatePassword').post(function(req, res) {
  var password = req.body.password || null;
  var response = auth.validatePassword(password);
  res.json(response);
});

// error handling
router.use('/*', function(req, res, next) { // unforeseen request
  res.status(404).json({ error: 'auth path ' + req.originalUrl + ' not found' });
});

// export all router methods
module.exports = router;
