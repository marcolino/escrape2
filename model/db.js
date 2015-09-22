var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/escrapeXXX', function(err) {
  if (err) {
  	throw err; // TODO: how to handle connection errors to app / res.json() ?
  }
});