var mongoose = require('mongoose') // mongo abstraction
  , assert = require('assert') // assertions abstraction
  , config = require('../config'); // global configuration
var Status = require('../models/status') // model of provider logging
;

var status = new Status();

exports.log = function(message) {
  status.startDate = new Date();
  status.message = message;
  status.save(function (err) {
    assert.equal(err, null);
    //console.log('saved log into the status collection');
  });
};

module.exports = exports;