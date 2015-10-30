var mongoose = require('mongoose') // mongo abstraction
  , config = require('../config') // global configuration
  , Place = require('../models/place') // model of place
;

var local = {}; // define private objects container
//var log = logger.createSimpleLogger(config.logger); // create a simple logger
var log = config.log;

exports.getAll = function(filter, callback) { // GET all providers
  local.getAll(filter, function(err, places) {
    if (err) {
      console.error('Error retrieving places:', err);
      callback(err);
    } else {
      callback(null, places);
    }
  });
};

exports.sync = function(/*req*/) { // sync persons
  // ... parsePlaces($, provider, config);

  function parsePlaces(/*$, provider, config*/) {
    var val = {};
    /*
    if (provider.key === 'SGI') {
      $(provider.listCategories[config.category].selectors.category + ' > ul > li > a').each(function() {
        var region = $(this).text();
        var city = $(this).next('ul').find('li a').map(function() {
          return $(this).text();
        }).get();
        val[region] = city;
      });
    }
    */
    return val;
  }
};

local.getAll = function(filter, result) { // get all places
  Place.find(filter, function(err, places) {
    result(err, places);
  });
};

/**
 * when developing, expose also local functions,
 * prefixed with '_' character,
 * to be able to unit test them
 */
if (config.env === 'development') {
  exports.local = {};
  for (var method in local) {
    exports.local[method] = local[method];
  }
}

module.exports = exports;
