'use strict';

var google = require('google'); // get text search results from Google

// Google searchTextProvider initialization
var GO = Object.create({});
GO.key = 'Google';
GO.active = true;

GO.getTraces = function(phone, callback) {
  var search = phone;
  var pagesCounter = 0;
  var pagesMax = 1; // avoid too many requests
  var resultsPerPageMax = 50; // the maximum results per page for google is 50
  var results = [];

  google.resultsPerPage = resultsPerPageMax;
  google(search, function(err, next, links) {
    if (err) { // TODO: 503 => CAPTCHA
      if (err.toString().match(/Error on response \(503\)/g)) {
        return callback('error 503 from google, please retry later');
      }
      return callback(err);
    }

    // add phone and date of last sync properties to each of links objects
    for(var i = 0, len = links.length; i < len; i++) {
      links[i].phone = phone;
      links[i].dateOfLastSync = new Date();
    }
   	results = results.concat(links); 
  
    if (pagesCounter < pagesMax - 1) {
      pagesCounter++;
      if (next) { // next page
        next();
      } else {
        // done //return callback(null, results);
      }
    }
    // maximum number of pages reached, break up
    return callback(null, results);
  });
};

module.exports = GO;

/*
// test
GO.getTraces('3292534721', function(err, results) {
  if (err) {
    return console.error(err);
  }
  console.log(results.length, 'phone traces found:', results);
});
*/