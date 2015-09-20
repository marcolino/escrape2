var
  mongoose = require('mongoose'), // mongo abstraction
  config = require('../config') // global configuration
;
var exports = {};
var internals = {};
        
// use LOG() to log only when debugging
var LOG = config.debug ? console.log.bind(console) : function() {};

exports.getAll = function(req, res, next) { // get all persons
  internals.getAll(function(err, providers) {
    if (err) {
      console.error('Error retrieving persons:', err);
      res.json({ error: err });
    } else {
      LOG('persons.getAll: ' + persons);
      res.json(persons);
    }   
  });
}

internals.getAll = function(filter, result) { // get all persons
  mongoose.model('Person').find(filter, function(err, persons) {
    result(err, persons);
  });
}

exports.getPerson = function(req, res) { // get person
  // TODO...
}

