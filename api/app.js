'use strict';

var express = require('express') // web server
  , logger = require('morgan') // clients requests logger
  , bodyParser = require('body-parser') // body parser
  , methodOverride = require('method-override') // method overryde for clients not supporting all REST verbs
  , path = require('path') // to manipulate paths
  , config = require('./config') // application configuration
  , db = require('./models/db') // database wiring
;

// setup (TODO: define these in config.js)
var staticPathPublic = __dirname + '/..' + '/public.dist'; // path to static public directory
var staticPathData = __dirname + '/..' + '/data'; // path to static data directory
var engineTemplate = 'html'; // template engine name ('jade'...)

// create express application
var app = module.exports = express();

// use modules to become RESTful
app.use(bodyParser.urlencoded({ extended: true })); // only parse urlencoded bodies
app.use(bodyParser.json()); // only parse JSON
app.use(methodOverride()); // override with the X-HTTP-Method-Override header in the request

// enable cross origin resource sharing
// TODO: do we really need this? (only if deploying client apps on different domain from server, perhaps...)
/* TODO: test if with no CORS it works o.k.... */
app.all('/*', function(req, res, next) {
  // CORS headers
  res.header("Access-Control-Allow-Origin", "*"); // restrict it to the required domain
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  // set custom headers for CORS
  res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
  if (req.method == 'OPTIONS') {
    res.status(200).end();
  } else {
    next();
  }
});

// auth middleware: this will check if the token is valid;
// only the requests that start with /api/* will be checked for the token;
// any URLs that do not follow the below pattern will be accessible without authentication
app.all('/api/*', [ require('./middlewares/validateRequest') ]);

// versions handling
app.use(function(req, res, next) { // explicit version requested
  if (req.url.match(/\/api\/v0\//)) { // explicit unsupported version requested: moved permanently
    res.status(301);
    res.json({ error: 'moved permanently' });
  } else
  if (req.url.match(/\/api\/v1\//)) { // explicit supported version requested: alias to no version url
    req.url = req.url.replace(/(\/api\/)v1\//g, '\$1');
  }
  next();
});

// authentication routes
app.use('/auth', require('./routes/auth'));

// server routes
app.use('/api/users', require('./routes/users'));
app.use('/api/persons', require('./routes/persons'));
app.use('/api/providers', require('./routes/providers'));
app.use('/api/places', require('./routes/places'));
app.use('/api/comments', require('./routes/comments'));

// public routes
app.use(express.static(staticPathPublic));
app.use(express.static(staticPathData));
//app.set('views', pathViews);
//app.set('view engine', engineTemplate); 

// error handling
app.use('/api/*', function(req, res, next) { // unforeseen request
  var status = 404;
  res.status(status);
  res.json({ status: status, error: 'API path ' + req.originalUrl + ' not found' });
});

// all other (client) requests go to frontend routes
app.use(function(req, res, next) {
  res.sendFile('index.html', { root: staticPathPublic });
});
