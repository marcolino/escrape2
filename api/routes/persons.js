var express = require('express') // express
  , mongoose = require('mongoose') // mongo abstraction
/*
  , bodyParser = require('body-parser') // to parse information from POST
  , methodOverride = require('method-override') // to manipulate POST
  , path = require('path') // to manipulate paths
*/
  , person = require('../controllers/person') // person's controller
  , image = require('../controllers/image') // image's controller
  , config = require('../config') // global configuration
;
var log = config.log;
var router = express.Router(); // express router

router.route('/sync').
  get(function(req, res) { // sync all persons
    // return immedately ('sync()' is asynchronous...), log progress
    res.json('persons sync started');
    person.sync();
  })
;

router.route('/getAll').get(function(req, res) { getAll(req, res); }); // get all persons
router.route('/getAll/search/:search').get(function(req, res) { getAll(req, res); }); // get all persons, with search filter

var getAll = function(req, res) {
  //var filter = { isAliasFor: { $size: 0 } };
  var filter = {};
  var options = { sort: '-' + 'dateOfFirstSync' }; // or dateOfLastSync for changed images first...
  if (req.params.search && req.params.search !== null) {
    filter.name = new RegExp(req.params.search, 'i');
  }
  // retrieve all persons from database
  person.getAll(filter, options, function(err, persons) {
    if (err) {
      log.error('error retrieving persons:', err);
      return res.json({ status: err.status ? err.status : 500, error: err });
    }
    res.json(persons);
  });
};

router.route('/get').
  get(function(req, res) { // get persons
    var filter = {};
    var options = {};
    // retrieve all persons from database
    person.getAll(filter, options, function(err, persons) {
      if (err) {
        log.error('error retrieving persons:', err);
        return res.json({ status: err.status ? err.status : 500, error: err });
      }
      res.json(persons);
    });
  })
;

router.route('/getById/:id').
  get(function(req, res) { // get person by id
    person.getById(req.params.id, function(err, person) {
      if (err) {
        log.error('error retrieving person with id ' + req.params.id + ':', err);
        return res.json({ status: err.status ? err.status : 500, error: err });
      }
      res.json(person);
    });
  })
;

router.route('/getByKey/:key([^/]+/[^/]+)').
  get(function(req, res) { // get person by key
    var key = req.params.key;
    person.getByKey(key, function(err, person) {
      if (err) {
        log.error('error retrieving person with key' + key + ':', err);
        return res.json({ status: err.status ? err.status : 500, error: err });
      }
      res.json(person);
    });
  })
;

router.route('/getImages/:id').
  get(function(req, res) { // get images by idPerson
    image.getByIdPerson(req.params.id, function(err, images) {
      if (err) {
        log.error('error retrieving images for person with id ' + req.params.id + ':', err);
        return res.json({ status: err.status ? err.status : 500, error: err });
      }
      res.json(images);
    });
  })
;

router.route('/syncAliasesBatch').
  get(function(req, res) { // build aliases
    person.syncAliasesBatch(function(err, result) {
      if (err) {
        log.error('error batch sync\'ing aliases:', err);
        return res.json({ status: err.status ? err.status : 500, error: err });
      }
      res.json(result);
    });
  })
;

router.route('/checkImages').
  get(function(req, res) { // check images db/fs sync
    person.checkImages(function(err) {
      if (err) {
        log.error('error checking images:', err);
        return res.json({ status: err.status ? err.status : 500, error: err });
      }
      res.json();
    });
  })
;

router.route('/listAliasGroups').
  get(function(req, res) { // list images duplicates
    person.listAliasGroups(function(err, list) {
      if (err) {
        log.error('error listing images aliases:', err);
        return res.json({ status: err.status ? err.status : 500, error: err });
      }
      res.json(list);
    });
  })
;

/*
// route middleware to validate :id
router.param('id', function(req, res, next, id) {
  // find the id in the database
  person.getById(id, function(err, person) {
    if (err) { // if it isn't found, we are going to repond with 404
      log.error('error retrieving person with id', id + ':', err);
      res.json({ error: err });
    } else { // if it is found we continue on the next thing
      req.id = id; // once validation is done save the new item in the req
      next(); // go on to the next thing
    }
  });
});
*/

// export all router methods
module.exports = router;
