'use strict';

var express = require('express') // web server
  , logger = require('morgan') // clients requests logger
  , bodyParser = require('body-parser') // body parser
  , methodOverride = require('method-override') // method overryde for clients not supporting all REST verbs
  , config = require('./config') // application configuration
;

// required models
var db = require('./models/db');

// required routes
var main = require('./routes/main');
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
app.use(methodOverride());

// routes redirection
app.use('/', main);
app.use('/users', users);
app.use('/persons', persons);
app.use('/providers', providers);
app.use('/places', places);
app.use('/comments', comments);

// error handlers

app.use(function(req, res, next) {
  var status = 404;
  res.status(status);
  var err = new Error();
  err.message = 'Not found';
  err.status = status;
  if (config.env === 'development') {
    err.stacktrace = err.stack;
  }
  res.send({ error: err });
});

// error-handling middleware
app.use(function(err, req, res, next) {
  var err = new Error('not allowed!');
  res.status(err.status || 500);
  res.send({ error: err });
});
