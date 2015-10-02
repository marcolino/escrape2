var express = require('express'), // express
  mongoose = require('mongoose'), // mongo abstraction
  bodyParser = require('body-parser'), // to parse information from POST
  methodOverride = require('method-override') // to manipulate POST
;

var router = express.Router(); // express router

//router.use(bodyParser.urlencoded({ extended: true })); // already in app.js (is it sufficient???)

router.use(methodOverride(function(req, res) { // method override for clients supporting only POST method
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    // look in urlencoded POST bodies and delete it
    var method = req.body._method;
    delete req.body._method;
    return method;
  }
}));

router.route('/').get(function(req, res, next) { // get all persons
  // retrieve all persons from mongo database
  mongoose.model('Person').find({}, function(err, persons) {
    if (err) {
      console.error('Error retrieving persons:', err);
      res.json({ error: err });
    } else {
      console.log('GET persons: ' + persons);
      res.json(persons);
    }   
  });
});

router.route('/').post(function(req, res) { // post a new person
  var record = {
    name: req.body.name,
    vote: req.body.vote,
    dateofcreation: req.body.dateofcreation,
    company: req.body.company,
    isloved: req.body.isloved,
  };

  mongoose.model('Person').create(record, function(err, person) {
    if (err) {
      console.error("Error adding a person to the database:", err);
      res.json({ error: err });
    } else { // person has been created
      console.log('POST person: ' + person);
      res.json(person);
    }
  });
});

/*
// GET new person page
router.get('/new', function(req, res) {
  res.render('persons/new', { title: 'Add New Person' });
});
*/

router.get('/sync', sync);
function sync(req, res) {
  res.json('persons sync started');
  personController.sync(); // do this in background. A status collection is handled to get sync process status.
}

// route middleware to validate :id
router.param('id', function(req, res, next, id) {
  console.log('validating param "id"', id);
  // find the id in the database
  mongoose.model('Person').findById(id, function(err, person) {
    if (err) { // if it isn't found, we are going to repond with 404
      console.error('Error retrieving person with id ' + id + ':', err);
      var error = new Error('ID not found');
      error.status = 404;
      res.status(error.status);
      res.json({ error: error });
    } else { // if it is found we continue on
      console.log('person of id', id, ':', person);
      // once validation is done save the new item in the req
      req.id = id;
      // go to the next thing
      next();
    }
  });
});

router.route('/:id').get(function(req, res) { // get person by ID
  mongoose.model('Person').findById(req.id, function(err, person) {
    if (err) {
      console.error('Error retrieving person with id ' + req.id + ':', err);
      res.json({ error: err });
    } else {
      if (person) {
        console.log('GET person id: ' + person._id);
        res.json(person);
      } else {
        console.log('GET person id: ' + '<NOT FOUND>');
        res.json(null);
      }
    }
  });
});

router.route('/:id/edit').get(function(req, res) { // get person by ID
  mongoose.model('Person').findById(req.id, function(err, person) {
    if (err) {
      console.error('Error retrieving person with id ' + req.id + ':', err);
      res.json({ error: err });
    } else { // get the person
      console.log('GET person id: ' + person._id);
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
    isloved: req.body.isloved,
  };

  // find the document by ID
  mongoose.model('Person').findById(req.id, function(err, person) {
    if (err) {
      console.error('Error retrieving person with id ' + req.id + ':', err);
      res.json({ error: err });
    } else { // update the person
        person.update(record, function(err, personID) {
        if (err) {
          console.error('Error updating person with id', req.id + ':', err);
          res.json({ error: err });
        } else {
          console.log('updated person by : ' + person._id);
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
      console.error('Error retrieving person with id ' + req.id + ':', err);
      res.json({ erorr: err });
    } else { // remove the person
      person.remove(function(err, person) { // TODO: don't delete, mark as deleted...
        if (err) {
          console.error('Error deleting person with id ' + req.id + ':', err);
          res.json({ error: err });
        } else {
          console.log('deleted person by id:', person._id);
          res.json(person);
        }
      });
    }
  });
});



// export all router methods
module.exports = router;