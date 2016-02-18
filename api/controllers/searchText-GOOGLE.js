'use strict';

var mongoose = require('mongoose') // mongo abstraction
  , request = require('request') // to place http requests
  , cheerio = require('cheerio') // to parse fetched DOM data
  , crypto = require('crypto') // md5
  , async = require('async') // to call many async functions in a loop
  , google = require('google') // get text search results from Google
  // TODO: review => footprint
  , reviewProviderPrototype = require('../controllers/review') // review provider abstract class
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

                        var searchTextProviderPrototype = { /* ... */ }; // TODO: ...

// Google searchTextProvider initialization
var Google = Object.create(searchTextProviderPrototype);
Google.key = 'Google';
Google.active = true;

Google.getResults = function(phone, callback) {
  var search = phone;
  var nextCounter = 0;
  var maxPages = 1;
  var results = [];

  google.resultsPerPage = 50;

  google(search, function(err, next, links) {
    if (err) { // TODO: 503 => CAPTCHA
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
    }
  });
};

// test
Google.getResults('3296690616', function(err, results) {
  if (err) {
  	return log.error('Error:', err);
  }
  log.info('results:', results);
});
