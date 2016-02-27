'use strict';

var google = require('google'); // get text search results from Google

// Google searchTextProvider initialization
var Google = Object.create({});
Google.key = 'Google';
Google.active = true;

Google.getPhoneTraces = function(phone, callback) {
  var search = phone;
  var nextCounter = 0;
  var maxPages = 1; // avoid too many requests
  var maxResultsPerPage = 50; // the maximum results per page for google is 50
  var results = [];

  google.resultsPerPage = maxResultsPerPage;
  google(search, function(err, next, links) {
    if (err) { // TODO: 503 => CAPTCHA
      if (err.toString().match(/Error on response \(503\)/g)) {
        return callback('error 503 from google, please retry later');
      }
      return callback(err);
    }

   	results = results.concat(links); 
  
    if (nextCounter < maxPages - 1) {
      nextCounter++;
      if (next) { // next page
        next();
      } else { // done
        return callback(null, results);
      }
    } else { // maximum number of pages reached, break up
      return callback(null, results);
    }
  });
};

// test
Google.getPhoneTraces('3292534721', function(err, results) {
  if (err) {
    return console.error(err);
  }
  console.log(results.length, 'phone traces found:', results);
});
