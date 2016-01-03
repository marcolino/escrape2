var express = require('express') // express
  , mongoose = require('mongoose') // mongo abstraction
  , auth2 = require('./auth2')
  , person = require('../controllers/person') // person's controller
  , config = require('../config') // global configuration
;
var log = config.log;
var router = express.Router(); // express router

//router.post('/login', auth2.login);
router.route('/login').
  post(auth2.login)
;

// export all router methods
module.exports = router;
