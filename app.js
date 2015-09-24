var express = require('express'); // web server
var logger = require('morgan'); // clients requests logger
var bodyParser = require('body-parser'); // body parser
var methodOverride = require('method-override'); // method overryde for clients not supporting all REST verbs
var config = require('./config'); // application configuration
 
// required models
var db = require('./models/db');
var provider = require('./models/provider');
var user = require('./models/user');
var person = require('./models/person');

// required routes
var providers = require('./routes/providers');
var users = require('./routes/users');
var persons = require('./routes/persons');

// create express application
var app = module.exports = express();

// use modules to become RESTful
//app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());

// routes redirection
app.use('/users', users);
app.use('/persons', persons);
app.use('/providers', providers);

// errors handler

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not found', req);
  err.status = 404;
  next(err);
});

// catch all errors
app.use(function(err, req, res, next) {
  var error = {};
  error.message = err.message;
  if (app.get('env') === 'development') {
    // development error handler (will print stacktrace)
    error.stack = err.stack;
  }
  for (var prop in err) {
    error[prop] = err[prop];
  }
  res.json({ error: error });
});