var mongoose = require('mongoose') // mongo abstraction
  , assert = require('assert') // assertions abstraction
  , config = require('../config'); // global configuration
var Status = require('../models/status') // model of provider logging
;

var status = new Status();

exports.log = function(message) {
  return exports._do('log', message);
};

exports.info = function(message) {
  return exports._do('info', message);
};

exports.warn = function(message) {
  return exports._do('warn', message);
};

exports.error = function(message) {
  return exports._do('error', message);
};

exports._do = function(action, message) {
  status.dateStart = new Date();
  status.message = message;
  status.save(function(err) {
    assert.equal(err, null);
    //console.log('saved log into the status collection');
  });
  console.log(message);
};

module.exports = exports;
