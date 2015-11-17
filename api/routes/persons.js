var express = require('express') // express
  , mongoose = require('mongoose') // mongo abstraction
  , bodyParser = require('body-parser') // to parse information from POST
  , methodOverride = require('method-override') // to manipulate POST
  , path = require('path') // to manipulate paths
  , person = require('../controllers/person') // person's controller
  , config = require('../config') // global configuration
;
var log = config.log;
var router = express.Router(); // express router
router.use(bodyParser.urlencoded({ extended: true })); // already in app.js (is it sufficient???)

//router.get('/sync', function(req, res) { // sync all persons
router.route('/sync').get(function(req, res) { // sync all persons
  // return immedately, log progress
  var message = 'persons sync started';
  res.json(message);
  log.info(message);
  person.sync();
});

router.route('/').get(function(req, res) { // get all persons
  //var filter = {};
  var filter = { isAliasFor: { $size: 0 } };
  var options = { sort: '-' + 'dateOfFirstSync' };
  if (req.search && req.search !== null) {
    filter.name = new RegExp(req.search, 'i');
  }
//filter.name = new RegExp('russa', 'i'); ///////////////////////////////////////////////
  // retrieve all persons from mongo database
  // TODO: use controllers.person methods, not directly mongoose methods...
  mongoose.model('Person').find(filter, null, options, function(err, persons) {
    if (err) {
      log.error('error retrieving persons:', err);
      res.json({ error: err });
    } else {
      //console.log('GET persons: ' + persons);
      log.info('persons/ get success');
      res.json(persons);
    }
  });
});

router.route('/get/:search/:sort').get(function(req, res, next) { // get all persons, filtered
  log.info('search:', req.params.search);
  log.info('sort:', req.params.sort);
  res.json(null);
/*
  person.get({
    search: req.params.search,
    sort: req.params.sort,
  });
*/
});

// route middleware to validate :id
router.param('id', function(req, res, next, id) {
  console.log('validating param "id"', id);
  // find the id in the database
  mongoose.model('Person').findById(id, function(err, person) {
    if (err) { // if it isn't found, we are going to repond with 404
      log.error('error retrieving person with id ' + id + ':', err);
      res.json({ error: err });
    } else { // if it is found we continue on the next thing
      req.id = id; // once validation is done save the new item in the req
      next(); // go on to the next thing
    }
  });
});

//router.route('/:id').get(function(req, res) { // get person by ID
router.route('/:id/get').get(function(req, res) { // get person by ID
  mongoose.model('Person').findById(req.id, function(err, person) {
    if (err) {
      log.error('error retrieving person with id ' + req.id + ':', err);
      res.json({ error: err });
    } else {
      if (person) {
        log.info('persons/:id get success');
      } else {
        log.info('persons/:id get success (no person data)');
      }
      res.json(person);
    }
  });
});

router.route('/:id/getImages').get(function(req, res) { // get person by ID
  mongoose.model('Image').find({ idPerson: req.id }, function(err, images) {
    if (err) {
      log.error('error retrieving images for person with id ' + req.id + ':', err);
      res.json({ error: err });
    } else {
      if (images) {
        log.info('persons/:id/getImages get success');
      } else {
        log.info('persons/:id/getImages get success (no images data)');
      }
      res.json(images);
    }
  });
});

router.route('/buildAliases').get(function(req, res) { // build aliases
  person.buildAliases(null, function(err, result) {
    if (err) {
      log.error('error building aliases:', err);
      return res.json({ error: err });
    }
    log.info('result:', result);
    res.json(result);
  });
});

router.route('/checkImages').get(function(req, res) { // check images db/fs sync
  person.checkImages(function(err) {
    if (err) {
      log.error('error checking images:', err);
      return res.json({ error: err });
    }
    res.json();
  });
});

router.route('/listImagesAliases').get(function(req, res) { // list images duplicates
  person.listImagesAliases(function(err) {
    if (err) {
      log.error('error listing images aliases:', err);
      return res.json({ error: err });
    }
    res.json();
  });
});

/*
// GET new person page
router.get('/new', function(req, res) {
  res.render('persons/new', { title: 'Add New Person' });
});

router.route('/').post(function(req, res) { // post a new person
  var record = {
    name: req.body.name,
    vote: req.body.vote,
    dateofcreation: req.body.dateofcreation,
    company: req.body.company,
    isloved: req.body.isloved
  };

  mongoose.model('Person').create(record, function(err, person) {
    if (err) {
      log.error('error adding a person to the database:', err);
      res.json({ error: err });
    } else { // person has been created
      log.info('persons/ post success');
      res.json(person);
    }
  });
});

router.route('/:id/edit').get(function(req, res) { // get person by ID
  mongoose.model('Person').findById(req.id, function(err, person) {
    if (err) {
      log.error('error retrieving person with id ' + req.id + ':', err);
      res.json({ error: err });
    } else { // get the person
      log.info('persons/:id/edit get success');
      res.json(person);
    }
  });
});

router.route('/:id/edit').put(function(req, res) { // update a person by id
  var record = {
    name: req.body.name,
    vote: req.body.vote,
    dateofcreation: req.body.dateofcreation,
    company: req.body.company,
    isloved: req.body.isloved
  };

  // find the document by ID
  mongoose.model('Person').findById(req.id, function(err, person) {
    if (err) {
      log.error('error retrieving person with id ' + req.id + ':', err);
      res.json({ error: err });
    } else { // update the person
      person.update(record, function(err, person) {
        if (err) {
          log.error('error updating person with id', req.id + ':', err);
          res.json({ error: err });
        } else {
          log.info('persons/:id/edit put success');
          res.json(person);
        }
      });
    }
  });
});

router.route('/:id/edit').delete(function(req, res) { // delete a person by id
  // find person by ID
  mongoose.model('Person').findById(req.id, function(err, person) {
    if (err) {
      log.error('error retrieving person with id ' + req.id + ':', err);
      res.json({ erorr: err });
    } else { // remove the person
      person.remove(function(err, person) { // TODO: don't delete, mark as deleted...
        if (err) {
          log.error('error deleting person with id ' + req.id + ':', err);
          res.json({ error: err });
        } else {
          log.info('persons/:id/edit put success');
          res.json(person);
        }
      });
    }
  });
});
*/

// export all router methods
module.exports = router;
