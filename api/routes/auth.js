var express = require('express') // express
  , mongoose = require('mongoose') // mongo abstraction
  , auth = require('../controllers/auth') // authorizations controller
  , person = require('../controllers/person') // person's controller
  , config = require('../config') // global configuration
;
var log = config.log;
var router = express.Router(); // express router

router.route('/login').
  post(auth.login)
;

router.route('/register').
  post(auth.register)
;

// export all router methods
module.exports = router;
