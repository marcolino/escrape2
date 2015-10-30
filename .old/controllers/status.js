var mongoose = require('mongoose') // mongo abstraction
  , config = require('../config') // global configuration
  , Status = require('../models/status') // model of provider logging
;

var status = new Status();

/*
var filter = { "date": { "$gte": Date.now() } };
var stream = Status.find(filter).tailable().stream();
//var stream = Status.find(filter, {tailable: true, awaitdata: true}).stream();
//var stream = Status.find(filter, {}, { tailable: true, awaitdata: false }).stream();

stream.on('data', function(doc) {
  console.log('=============== status stream data: new doc');
  console.log(doc);
}).on('error', function (error) {
  //if (error.message !== 'No more documents in tailed cursor') {
    console.log('=============== status stream data error:', error);
  //}
}).on('close', function () {
  console.log('=============== status stream data closed');
});
*/

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
    if (err) {
      return console.error('error saving log into the status collection');
    }
    console.log('status', action, message);
  });
};

module.exports = exports;
