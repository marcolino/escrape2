var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cookieSession = require('cookie-session');
var person = require('routes/person');

var app = express();

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

app.listen(3000);
console.log('Listening on port 3000...');