var
  mongoose = require('mongoose'), // mongo abstraction
  config = require('../config') // global configuration
;
var private = {};

exports.sync = function() {
  // ... do the persons sync ...
  return true;
};

exports.getAll = function(req, res) { // get all persons
  private.getPerson({}, function(err, persons) {
    if (err) {
      console.error('Error retrieving persons:', err);
      res.json({ error: err });
    } else {
      console.log('persons.getAll: ' + persons);
      res.json(persons);
    }   
  });
};

exports.getById = function(req, res) { // get person
  private.getPerson({ _id: req._id }, function(err, persons) {
    if (err) {
      console.error('Error retrieving persons by id:', err);
      res.json({ error: err });
    } else {
      console.log('persons.getById: ' + person);
      res.json(persons);
    }   
  });
};

exports.getByPhone = function(req, res) { // get person
  private.getPerson({ phone: req.phone }, function(err, persons) {
    if (err) {
      console.error('Error retrieving persons by phone:', err);
      res.json({ error: err });
    } else {
      console.log('persons.getByPhone: ' + person);
      res.json(persons);
    }   
  });
};

exports.assertActivity = function(result) { // for each person (?)
  // TODO...
};

private.getPerson = function(filter, result) { // get person
  mongoose.model('Person').find(filter, function(err, persons) {
    result(err, persons);
  });
};

module.exports = exports;