var mongoose = require('mongoose') // mongo abstraction
//  , cheerio = require('cheerio') // to parse fetched DOM data
//  , async = require('async') // to call many async functions in a loop
//  , fs = require('fs') // file-system handling
//  , network = require('../controllers/network') // network handling
//  , image = require('../controllers/image') // network handling
  //, status = require('../controllers/status') // controller of provider logging
  , config = require('../config') // global configuration
  , Provider = require('../models/provider') // model of provider
//  , Person = require('../models/person') // model of person
  //, Status = require('../models/status') // model of status
//  , logger = require('simple-node-logger')
;

var local = {}; // define private objects container
var log = config.log;

mongoose.connection.on('open', function() {
  // create providers
  local.createProviders(config.providers, function(err) {
    if (err) {
      return console.error('Error creating providers:', err);
    }
  });
});

exports.getAll = function(filter, callback) { // GET all providers
  //console.log('C req:', request);
  //console.log('res:', res);
  local.getAll(filter, function(err, providers) {
    if (err) {
      console.error('Error retrieving providers:', err);
      callback(err);
    } else {
      callback(null, providers);
    }
  });
};

exports.syncComments = function(/*req*/) { // sync comments
  // TODO
};

exports.syncPlaces = function(/*req*/) { // sync persons
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

/*
// TODO: in a different module ('globals') ?
exports.status = function(req, res) { // get providers status
  Provider('Globals').find({ 'key': 'status-current' }, function(err, currentStatus) {
    if (err) {
      console.error('Error retrieving current status:', err);
      res.json({ error: err });
    } else {
      console.console.log('current status: ' + currentStatus);
      res.json(currentStatus);
    }
  });
};
*/

local.createProviders = function(providers, callback) {
  // populate model (remove ad create)
  collectionExists('Provider', function(exists) {
    if (exists) {
      if (config.env === 'development') {
        console.log('Provider collection exists, environment is development: re-creating providers');
        remove(function(err) {
          if (err) {
            return callback(err);
          }
          create(providers, function(err) {
            callback(err);
          });
        });
      }
    } else {
      console.log('Provider collection does not exist: creating providers');
      create(providers, function(err) {
        callback(err);
      });
    }
  });

  // remove Provider collection
  function remove(callback) {
    Provider.remove({}, function(err) {
      if (err) {
        return callback(err);
      }
      callback(null);
    });
  }

  // create Provider collection
  function create(providers, callback) {
    Provider.create(providers, function(err, provider) {
      if (err) {
        return callback(err);
      }
      callback(null, provider);
    });
  }

  // TODO: collectionName is not used ?!?!?
  function collectionExists(collectionName, callback) {
    local.getAll(function(err, providers) {
      if (err) {
        return callback(false);
      } else {
        callback(providers.length > 0);
      }
    });
  }

};

local.getAll = function(filter, result) { // get all providers
  Provider.find(filter, function(err, providers) {
    result(err, providers);
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
