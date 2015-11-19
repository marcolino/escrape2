var express = require('express') // express
  , mongoose = require('mongoose') // mongo abstraction
  , bodyParser = require('body-parser') // to parse information from POST
  , methodOverride = require('method-override') // to manipulate POST
  , path = require('path') // to manipulate paths
  , person = require('../controllers/person') // person's controller
  , image = require('../controllers/image') // image's controller
  , config = require('../config') // global configuration
;
var log = config.log;
var router = express.Router(); // express router

router.route('/sync').
  get(function(req, res) { // sync all persons
    // return immedately ('sync()' is asynchronous...), log progress
    log.info('router: persons/sync get');
    res.json('persons sync started');
    person.sync();
  })
;

router.route('/getAll').get(function(req, res) { getAll(req, res); }); // get all persons
router.route('/getAll/search/:search').get(function(req, res) { getAll(req, res); }); // get all persons, with search filter

var getAll = function(req, res) {
  //log.info('/getAll/search/:search ~ search:', req.params.search);
  var filter = { isAliasFor: { $size: 0 } };
  var options = { sort: '-' + 'dateOfFirstSync' };
  if (req.params.search && req.params.search !== null) {
    filter.name = new RegExp(req.params.search, 'i');
  }
  // retrieve all persons from database
  person.getAll(filter, options, function(err, persons) {
    if (err) {
      log.error('error retrieving persons:', err);
      res.json({ error: err });
    } else {
      log.info('person.getAll success');
      res.json(persons);
    }
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
        res.json({ error: err });
      } else {
        log.info('person.getAll success');
        res.json(persons);
      }
    });
  })
;

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

router.route('/:id/get').
  get(function(req, res) { // get person by id
    person.getById(req.id, function(err, person) {
      if (err) {
        log.error('error retrieving person with id ' + req.id + ':', err);
        res.json({ error: err });
      } else {
        if (person) {
          log.info('persons/:id get success');
        } else {
          log.info('persons/:id no person found');
        }
        res.json(person);
      }
    });
  })
;

router.route('/:idPerson/getImages').
  get(function(req, res) { // get images by idPerson
    image.getByIdPerson(idPerson, function(err, images) {
      if (err) {
        log.error('error retrieving images for person with id ' + req.id + ':', err);
        res.json({ error: err });
      } else {
        if (images) {
          log.info('persons/:idPerson/getImages get success');
        } else {
          log.info('persons/:idPerson/getImages no images found');
        }
        res.json(images);
      }
    });
  })
;

router.route('/buildAliases').
  get(function(req, res) { // build aliases
    person.buildAliases(null, function(err, result) {
      if (err) {
        log.error('error building aliases:', err);
        return res.json({ error: err });
      }
      log.info('result:', result);
      res.json(result);
    });
  })
;

router.route('/checkImages').
  get(function(req, res) { // check images db/fs sync
    person.checkImages(function(err) {
      if (err) {
        log.error('error checking images:', err);
        return res.json({ error: err });
      }
      res.json();
    });
  })
;

router.route('/listImagesAliases').
  get(function(req, res) { // list images duplicates
    person.listImagesAliases(function(err) {
      if (err) {
        log.error('error listing images aliases:', err);
        return res.json({ error: err });
      }
      res.json();
    });
  })
;

router.route('/*'). // requested path is in req._parsedUrl.path
  get(function(req, res) { // unforeseen get request
    res.json({ error: 'persons path not found' });
  }).
  post(function(req, res) { // unforeseen post request
    res.json({ error: 'persons path not found' });
  }).
  put(function(req, res) { // unforeseen post request
    res.json({ error: 'persons path not found' });
  }).
  delete(function(req, res) { // unforeseen post request
    res.json({ error: 'persons path not found' });
  })
;

// export all router methods
module.exports = router;
