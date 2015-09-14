var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cookieSession = require('cookie-session');
var person = require('./routes/person');

var app = express();

var setup = {
	ip: '0.0.0.0',
	port: 3000,
};

/*
//app.configure(function () {
  app.use(express.logger('dev')); // 'default', 'short', 'tiny', 'dev'
  app.use(express.bodyParser());
//});
*/

app.use(cookieParser());
//app.use(bodyParser());
//app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(cookieSession({secret: 'app_1'}));

app.get   ('/persons', person.findAll);
app.get   ('/persons/:id', person.findById);
app.post  ('/persons', person.add);
app.put   ('/persons/:id', person.update);
app.delete('/persons/:id', person.delete);

// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
})

/*
// development error handler - will print stacktrace
if (app.get('env') === 'development') {
	console.info('env: development');
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler - no stacktraces leaked to user
app.use(function(err, req, res, next) {
	console.info('env: production');
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});
*/

app.listen(setup.port, setup.ip);
console.log('Listening on ' + setup.ip + ':' + setup.port + '...');
/*
app.listen(setup.port, setup.ip, function() {
  console.log("... port in mode", app.address(), app.settings.env);
});
*/