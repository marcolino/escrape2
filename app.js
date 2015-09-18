var express = require('express');
//var path = require('path');
//var favicon = require('serve-favicon'); // serve favorite icon 
var logger = require('morgan'); // clients requests logger
//var cookieParser = require('cookie-parser');
//var bodyParser = require('body-parser');

var config = require('./config');
 
// required models
var db = require('./model/db');
var user = require('./model/user');
var person = require('./model/person');
var provider = require('./model/provider');

// required routes
var routes = require('./routes/index');
var users = require('./routes/users');
var persons = require('./routes/persons');
var providers = require('./routes/providers');

var app = express();

//// view engine setup
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');

//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: false }));
//app.use(cookieParser());
//app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);
app.use('/persons', persons);
app.use('/providers', providers);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not found:', req);
  err.status = 404;
  next(err);
});

// error handlers

// development error handler (will print stacktrace)
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {

//(function fakerr() { console.log(new Error('test').stack); })();
console.error('CATCHED AN ERROR:', err);
console.error(' ERROR STACK:', err.stack);
console.error(' PLEASE TRY TO RETURN STACK TRACE, TOO, TO THE CLIENT REQUEST...');
    res.status(err.status || 500);
    res.json({
      message: err.message,
      error: err,
    });
  });
}

// production error handler (no stacktraces leaked to user)
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: {}
  });
});

module.exports = app;