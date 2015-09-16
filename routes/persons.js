var express = require('express'), // express
    mongoose = require('mongoose'), // mongo abstraction
    bodyParser = require('body-parser'), // to parse information from POST
    methodOverride = require('method-override') // to manipulate POST
;

var router = express.Router(); // express router

router.use(bodyParser.urlencoded({ extended: true }))

router.use(methodOverride(function(req, res) { // method verride for clients supporting only POST method
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    // look in urlencoded POST bodies and delete it
    var method = req.body._method;
    delete req.body._method;
    return method;
  }
}));

router.route('/').get(function(req, res, next) { // GET all persons
  // retrieve all persons from mongo database
  mongoose.model('Person').find({}, function(err, persons) {
    if (err) {
      console.error('There was a problem retrieving persons:', err);
      err.context = 'get /';
      res.json(err);
    } else {
      console.log('GET persons: ' + persons);
      res.json(persons);
    }   
  });
});

router.route('/').post(function(req, res) { // POST a new person
  var record = {
    name: req.body.name,
    vote: req.body.vote,
    dateofcreation: req.body.dateofcreation,
    company: req.body.company,
    isloved: req.body.isloved,
  };

  mongoose.model('Person').create(record, function(err, person) {
    if (err) {
      console.error("There was a problem adding a person to the database:", err);
      err.context = 'post /';
      res.json(err);
    } else { // person has been created
      console.log('POST person: ' + person);
      res.json(person);
    }
  })
});

/*
// GET new person page
router.get('/new', function(req, res) {
  res.render('persons/new', { title: 'Add New Person' });
});
*/

// route middleware to validate :id
router.param('id', function(req, res, next, id) {
  console.log('validating param "id"', id);
  // find the id in the database
  mongoose.model('Person').findById(id, function(err, person) {
    if (err) { // if it isn't found, we are going to repond with 404
      console.error('PARAM ID There was a problem retrieving person with id ' + id + ':', err);
      var err = new Error('ID not found');
      err.status = 404;
      err.context = 'id param validation';
      res.status(err.status);
      //res.json({ message: err.status  + ' ' + err});
      res.json(err);
    } else { // if it is found we continue on
      console.log('JSON of person of id', id, ':', person);
      // once validation is done save the new item in the req
      req.id = id;
      // go to the next thing
      next();
    }
  });
});

router.route('/:id').get(function(req, res) { // GET to get person by ID
  mongoose.model('Person').findById(req.id, function(err, person) {
    if (err) {
      err.context = 'get /:id';
      console.error('There was a problem retrieving person with id ' + req.id + ':', err);
      res.json(err);
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

router.route('/:id/edit').get(function(req, res) { // GET to get person by ID
  mongoose.model('Person').findById(req.id, function(err, person) {
    if (err) {
      err.context = 'get /:id/edit';
      console.error('There was a problem retrieving person with id ' + req.id + ':', err);
      res.json(err);
    } else { // get the person
      console.log('GET person id: ' + person._id);
      res.json(person);
    }
  });
});

router.route('/:id/edit').put(function(req, res) { // PUT to update a person by ID
/*
  var name = req.body.name;
  var vote = req.body.vote;
  var dateofcreation = req.body.dateofcreation;
  var company = req.body.company;
  var isloved = req.body.isloved;
*/
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
      err.context = 'put /:id/edit';
      console.error('There was a problem retrieving person with id ' + req.id + ':', err);
      res.json(err);
    } else { // update the person
        person.update(record, function(err, personID) {
        if (err) {
          err.context = 'put /:id/edit';
          console.error('There was a problem updating person with id ' + req.id + ':', err);
          res.json(err);
        } else {
          console.log('updated person by : ' + person._id);
          res.json(person);
        }
      });
    }
  });
});

router.route('/:id/edit').delete(function(req, res) { // DELETE to delete a person by ID
  // find person by ID
  mongoose.model('Person').findById(req.id, function(err, person) {
    if (err) {
      err.context = 'delete /:id/edit';
      console.error('There was a problem retrieving person with id ' + req.id + ':', err);
      res.json(err);
    } else { // remove the person
      person.remove(function(err, person) { // TODO: don't delete, mark as deleted...
        if (err) {
          err.context = 'put /:id/edit';
          console.error('There was a problem deleting person with id ' + req.id + ':', err);
          res.json(err);
        } else {
          console.log('deleted person by : ' + person._id);
          res.json(person);
        }
      });
    }
  });
});



// export all router methods
module.exports = router;