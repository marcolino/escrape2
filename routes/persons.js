var express = require('express'), // express
    router = express.Router(), // express router
    mongoose = require('mongoose'), // mongo abstraction
    bodyParser = require('body-parser'), // parses information from POST
    methodOverride = require('method-override') // used to manipulate POST
;

router.use(bodyParser.urlencoded({ extended: true }))
router.use(methodOverride(function(req, res) {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    // look in urlencoded POST bodies and delete it
    var method = req.body._method;
    delete req.body._method;
    return method;
  }
}));

// build the REST operations at the base for persons
// this will be accessible from http://localhost:3000/persons
// if the default route for '/' is left unchanged
router.route('/')
  .get(function(req, res, next) { // GET all persons
    // retrieve all persons from mongo database
    mongoose.model('Person').find({}, function (err, persons) {
      if (err) {
        return console.error(err);
      } else {
        // respond to both HTML and JSON.
        // JSON responses require 'Accept: application/json;' in the Request Header
        res.format({
          // HTML response will render the index.jade file in the views/persons folder. We are also setting "persons" to be an accessible variable in our jade view
          html: function() {
            res.render('persons/index', {
              title: 'All persons',
              "persons": persons
            });
          },
          // JSON response will show all persons in JSON format
          json: function() {
            res.json(persons);
          }
        });
      }   
    });
  })
  .post(function(req, res) { // POST a new person
    // get values from POST request.
    // These can be done through forms or REST calls.
    // These rely on the "name" attributes for forms.
    var name = req.body.name;
    var vote = req.body.vote;
    var dateofcreation = req.body.dateofcreation;
    var company = req.body.company;
    var isloved = req.body.isloved;
    // call the create function for our database
    mongoose.model('Person').create({
      name: name,
      vote: vote,
      dateofcreation: dateofcreation,
      isloved: isloved
    }, function (err, person) {
      if (err) {
        res.send("There was a problem adding the information to the database.");
      } else {
        // Person has been created
        console.log('POST creating new person: ' + person);
        res.format({
          // HTML response will set the location and redirect back to the home page.
          // You could also create a 'success' page if that's your thing
          html: function() {
            // if it worked, set the header so the address bar doesn't still say /adduser
            res.location("persons");
            // and forward to success page
            res.redirect("/persons");
          },
          // JSON response will show the newly created person
          json: function() {
            res.json(person);
          }
        });
      }
    })
  })
;

/* GET new person page */
router.get('/new', function(req, res) {
  res.render('persons/new', { title: 'Add New Person' });
});

// route middleware to validate :id
router.param('id', function(req, res, next, id) {
  console.log('validating ' + id + ' exists');
  // find the ID in the Database
  mongoose.model('Person').findById(id, function (err, person) {
    if (err) { // if it isn't found, we are going to repond with 404
      console.error(id + ' was not found');
      res.status(404)
      var err = new Error('Not Found');
      err.status = 404;
      res.format({
        html: function() {
          next(err);
        },
        json: function() {
          res.json({message : err.status  + ' ' + err});
        }
      });
    } else { // if it is found we continue on
      console.log('JSON of person of id', id, ':', person);
      // once validation is done save the new item in the req
      req.id = id;
      // go to the next thing
      next();
    }
  });
});

router.route('/:id')
  .get(function(req, res) {
    mongoose.model('Person').findById(req.id, function (err, person) {
      if (err) {
        console.error('There was a problem retrieving person:', err);
      } else {
        console.log('GET Retrieving ID: ' + person._id);
        var persondateofcreation = person.dateofcreation.toISOString();
        persondateofcreation = persondateofcreation.substring(0, persondateofcreation.indexOf('T'))
        res.format({
          html: function() {
            res.render('persons/show', {
              "persondateofcreation" : persondateofcreation,
              "person" : person
            });
          },
          json: function() {
            res.json(person);
          }
        });
      }
    });
  })
;

router.route('/:id/edit')
  // GET the individual person by Mongo ID
  .get(function(req, res) {
    // find the person within Mongo
    mongoose.model('Person').findById(req.id, function (err, person) {
      if (err) {
        console.error('There was a problem retrieving person:', err);
      } else {
        // return the person
        console.log('GET Retrieving ID: ' + person._id);
        var persondateofcreation = person.dateofcreation.toISOString();
        persondateofcreation = persondateofcreation.substring(0, persondateofcreation.indexOf('T'))
        res.format({
          // HTML response will render the 'edit.jade' template
          html: function() {
             res.render('persons/edit', {
              title: 'Person' + person._id,
              "persondateofcreation": persondateofcreation,
              "person": person
            });
          },
          // JSON response will return the JSON output
          json: function() {
            res.json(person);
          }
        });
      }
    });
  })

  // PUT to update a person by ID
  .put(function(req, res) {
    // Get our REST or form values; these rely on the "name" attributes
    var name = req.body.name;
    var vote = req.body.vote;
    var dateofcreation = req.body.dateofcreation;
    var company = req.body.company;
    var isloved = req.body.isloved;

    //find the document by ID
    mongoose.model('Person').findById(req.id, function (err, person) {
      // update it
      person.update({
        name: name,
        vote: vote,
        dateofcreation: dateofcreation,
        isloved: isloved
      }, function (err, personID) {
        if (err) {
          res.send("There was a problem updating the information to the database: " + err);
        } else {
          // HTML responds by going back to the page or you can be fancy and create a new view that shows a success page
          res.format({
            html: function() {
              res.redirect("/persons/" + person._id);
            },
            // JSON responds showing the updated values
            json: function() {
              res.json(person);
            }
          });
        }
      })
    });
  })
  // DELETE a Person by ID
  .delete(function (req, res) {
    // find person by ID
    mongoose.model('Person').findById(req.id, function (err, person) {
      if (err) {
        return console.error(err);
      } else {
        //remove it from Mongo
        person.remove(function (err, person) {
          if (err) {
            return console.error(err);
          } else {
            // Returning success messages saying it was deleted
            console.log('DELETE removing ID: ' + person._id);
            res.format({
              // HTML returns us back to the main page, or you can create a success page
              html: function() {
                res.redirect("/persons");
              },
              // JSON returns the item with the message that is has been deleted
              json: function() {
                res.json({
                  message: 'deleted',
                  item: person
                });
               }
            });
          }
        });
      }
    });
  })
;

module.exports = router;