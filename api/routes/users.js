'use strict';

var express = require('express')
  , user = require('../controllers/user')
;
var router = express.Router();

// error handling
router.use('/*', function(req, res, next) { // unforeseen request
  res.status(404).json({ error: 'users path ' + req.originalUrl + ' not found' });
});

module.exports = router;
