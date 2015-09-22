var
  mongoose = require('mongoose'), // mongo abstraction
  config = require('../config') // global configuration
;
var exports = {};
var internals = {};
        
// use LOG() to log only when debugging
var LOG = config.debug ? console.log.bind(console) : function() {};

exports.getAll = function(req, res) { // get all persons
  internals.getAll({}, function(err, persons) {
    if (err) {
      console.error('Error retrieving persons:', err);
      res.json({ error: err });
    } else {
      LOG('persons.getAll: ' + persons);
      res.json(persons);
    }   
  });
}

exports.getPersonById = function(req, res) { // get person
  internals.getPerson({ _id: req._id }, function(err, persons) {
    if (err) {
      console.error('Error retrieving persons by id:', err);
      res.json({ error: err });
    } else {
      LOG('persons.getPersonById: ' + person);
      res.json(persons);
    }   
  });
}

exports.getPersonByPhone = function(req, res) { // get person
  internals.getPerson({ phone: req.phone }, function(err, persons) {
    if (err) {
      console.error('Error retrieving persons by phone:', err);
      res.json({ error: err });
    } else {
      LOG('persons.getPersonByPhone: ' + person);
      res.json(persons);
    }   
  });
}

internals.getAll = function(filter, result) { // get all persons
  mongoose.model('Person').find(filter, function(err, persons) {
    result(err, persons);
  });
}

internals.getPerson = function(filter, result) { // get person
  mongoose.model('Person').find(filter, function(err, persons) {
    result(err, persons);
  });
}

internals.savePerson = function(personData, result) {
  var person = new Person(personData);
  person.save(function(err, data) {
    if (err) {
      result(err, data);
    } else {
      res.json(data);
    }
  });
}

module.exports = exports;