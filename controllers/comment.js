var mongoose = require('mongoose') // mongo abstraction
  , config = require('../config') // global configuration
  , Comment = require('../models/comment') // model of comment
;

var local = {}; // define private objects container
var log = config.log;

exports.getAll = function(filter, callback) { // GET all providers
  local.getAll(filter, function(err, comments) {
    if (err) {
      console.error('Error retrieving comments:', err);
      callback(err);
    } else {
      callback(null, comments);
    }
  });
};

exports.sync = function(/*req*/) { // sync persons
};

local.getAll = function(filter, result) { // get all comments
  Comment.find(filter, function(err, comments) {
    result(err, comments);
  });
};

/**
 * when developing, export also local functions,
 * prefixed with '_' character,
 * to be able to unit test them
 */
if (config.env === 'development') {
  exports.local = {};
  for (var method in local) {
    exports.local[method] = local[method];
  }
}

module.exports = exports;
