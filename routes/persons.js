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
            res.json(infophotos);
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

module.exports = router;