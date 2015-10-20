'use strict';

var express = require('express') // web server
  , logger = require('morgan') // clients requests logger
  , bodyParser = require('body-parser') // body parser
  , methodOverride = require('method-override') // method overryde for clients not supporting all REST verbs
  , config = require('./config') // application configuration
  , db = require('./models/db') // database wiring
;

// setup
var pathStatic = __dirname + '/public'; // path to static directory
var pathViews = __dirname + '/views'; // path to views directory
var engineTemplate = 'html'; // template engine name ('jade'...)

// required routes
//var main = require('./routes/main');
var providers = require('./routes/providers');
var users = require('./routes/users');
var persons = require('./routes/persons');
var places = require('./routes/places');
var comments = require('./routes/comments');

// create express application
var app = module.exports = express();

// use modules to become RESTful
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride()); // override with the X-HTTP-Method-Override header in the request

// server routes (API calls, authentication, ...)
//////////////////////app.use('/', main); // TODO...
// TODO: /... -> /api/...
app.use('/users', users);
app.use('/persons', persons);
app.use('/providers', providers);
app.use('/places', places);
app.use('/comments', comments);
app.use(express.static(pathStatic));
app.set('views', pathViews);
app.set('view engine', engineTemplate); 

// frontend routes (angular requests)
//app.get('*', function(req, res) {
app.route('*').get(function(req, res) { // * -> 
  // load the single view file (angular will handle the page changes on the front-end)
  res.sendFile('index.html', { root: path.join(__dirname, './public') });
});

// error-handling middleware
app.use(function(req, res, next) { // not found
  var status = 404;
  res.status(status);
  var err = new Error();
  err.message = 'not found';
  err.status = status;
  if (config.env === 'development') {
    err.stacktrace = err.stack;
  }
  res.send({ error: err });
});

app.use(function(err, req, res, next) { // not allowed
  var err = new Error('not allowed');
  res.status(err.status || 500);
  res.send({ error: err });
});
