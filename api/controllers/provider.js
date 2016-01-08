'use strict';

var mongoose = require('mongoose') // mongo abstraction
  , config = require('../config') // global configuration
  , Provider = require('../models/provider') // model of provider
;

var local = {}; // define private objects container
var log = config.log;

mongoose.connection.on('open', function() {
  // create providers
  exports.createProviders(config.providers, function(err) {
    if (err) {
      return console.error('Error creating providers:', err);
    }
  });
});

exports.getAll = function(filter, callback) { // get all providers
  Provider.getAll(filter, function(err, providers) {
    if (err) {
      console.error('Error retrieving providers:', err);
      callback(err);
    } else {
      callback(null, providers);
    }
  });
};

exports.getUrl = function(key, category, callback) { // get provider URL
  Provider.model.findOne({ key: key }, function(err, provider) {
    if (err) {
      console.error('Error retrieving provider with key', key, ' :', err);
      callback(err);
    } else {
      //console.log('getUrl() - key:', key, 'category:', category, ' => ', provider);
      callback(null, provider ? (provider.url + provider.categories[category].pathDetails) : null);
    }
  });
};

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
    Provider.model.remove({}, function(err) {
      if (err) {
        return callback(err);
      }
      callback(null);
    });
  }

  // create Provider collection
  function create(providers, callback) {
    Provider.model.create(providers, function(err, provider) {
      if (err) {
        return callback(err);
      }
      callback(null, provider);
    });
  }

  // TODO: collectionName is not used ?!?!?
  function collectionExists(collectionName, callback) {
    Provider.getAll({}, function(err, providers) {
      if (err) {
        return callback(false);
      } else {
        callback(providers.length > 0);
      }
    });
  }

};

module.exports = exports;
