var
  mongoose = require('mongoose'), // mongo abstraction
  config = require('../config') // global configuration
;

exports.getAll = function(req, res) { // get all persons
  getAll({}, function(err, persons) {
    if (err) {
      console.error('Error retrieving persons:', err);
      res.json({ error: err });
    } else {
      console.log('persons.getAll: ' + persons);
      res.json(persons);
    }   
  });
};

exports.getPersonById = function(req, res) { // get person
  getPerson({ _id: req._id }, function(err, persons) {
    if (err) {
      console.error('Error retrieving persons by id:', err);
      res.json({ error: err });
    } else {
      console.log('persons.getPersonById: ' + person);
      res.json(persons);
    }   
  });
};

exports.getPersonByPhone = function(req, res) { // get person
  getPerson({ phone: req.phone }, function(err, persons) {
    if (err) {
      console.error('Error retrieving persons by phone:', err);
      res.json({ error: err });
    } else {
      console.log('persons.getPersonByPhone: ' + person);
      res.json(persons);
    }   
  });
};

exports.assertPersonsActivity = function(result) {
  // TODO...
};

exports.savePerson = function(personData, result) {
  var person = new Person(personData);
  person.save(function(err, data) {
    if (err) {
      result(err, data);
    } else {
      res.json(data);
    }
  });
};

var getAll = function(filter, result) { // get all persons
  mongoose.model('Person').find(filter, function(err, persons) {
    result(err, persons);
  });
};

var getPerson = function(filter, result) { // get person
  mongoose.model('Person').find(filter, function(err, persons) {
    result(err, persons);
  });
};

module.exports = exports;