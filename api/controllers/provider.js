'use strict';

var mongoose = require('mongoose') // mongo abstraction
  , Provider = require('../models/provider') // model of provider
  , config = require('../config') // global configuration
;

var local = {}; // define private objects container
var log = config.log;

/*
mongoose.connection.on('open', function() {
  // create providers
  exports.createProviders(config.providers, function(err) {
    if (err) {
      return console.error('Error creating providers:', err);
    }
  });
});
*/

exports.getAll = function(filter, callback) { // get all providers
  filter.active = true;
  Provider.find(filter, function(err, providers) {
    if (err) {
      console.error('Error retrieving providers:', err);
      callback(err);
    } else {
      callback(null, providers);
    }
  });
};

exports.getAllLean = function(filter, callback) { // get all providers
  filter.active = true;
  Provider.find(filter).lean().exec(function(err, providers) {
    if (err) {
      console.error('Error retrieving providers:', err);
      callback(err);
    } else {
      callback(null, providers);
    }
  });
};

exports.getUrl = function(key, category, callback) { // get provider URL
  var filter = {};
  filter.active = true;
  filter.key = key;
  Provider.findOne(filter, function(err, provider) {
    if (err) {
      console.error('Error retrieving provider with key', key, ' :', err);
      callback(err);
    } else {
      //console.log('getUrl() - key:', key, 'category:', category, ' => ', provider);
      callback(null, provider ? (provider.url + provider.categories[category].pathDetails) : null);
    }
  });
};

/**
 * remove and create providers
 */
exports.createProviders = function(providers, callback) {
  Provider.remove({}, function(err) {
    if (err) {
      return callback(err);
    }
    Provider.create(providers, callback);
  });
};

/*
exports.createProviders = function(providers, callback) {
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
    Provider.find({}, function(err, providers) {
      if (err) {
        return callback(false);
      } else {
        callback(providers.length > 0);
      }
    });
  }
};
*/

module.exports = exports;
