'use strict';

var mongoose = require('mongoose') // mongo abstraction
  , request = require('request') // to place http requests
  , async = require('async') // to call many async functions in a loop
  , url = require('url') // parse urls
  , provider = require('../controllers/provider') // provider's controller
  , TracesImage = require('../models/tracesImage') // model of tracesImage
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

var tracesImageProviderPrototype = {
  key: undefined,
  active: undefined,
  url: undefined,
  unavailableImagesDir: undefined,

  /**
   @abstract
   */
  getTraces: function() {
    throw new Error("can't call abstract method");
  },

  sync: function(imageUrl, callback) {
    var tracesImageProviders = [
      require('./tracesImage-GO'),
    ];
  
    // filter results based on hostnames blacklist
    var results = {
      inserted: 0,
      updated: 0,
    };

    async.each(
      tracesImageProviders,
      function(tPP, callbackInner) {
        tPP.getTraces(imageUrl, function(err, traces) {
          if (err) {
            return callbackInner(err);
          }
          if (traces.length === 0) {
            log.debug('no image traces found on provider', tPP.key, 'for image url', imageUrl);
            return callbackInner();
          }

          // save results to database
          tracesImageProviderPrototype.save(traces, function(err, result) {
            if (err) {
              return callbackInner(err);
            }
            //log.debug('sync\'d, results.length, 'phone traces found on provider', tPP.key, 'for phone', phone);
            results.inserted += result.inserted;
            results.updated += result.updated;
            callbackInner(); // traces for this phone are done
          });
        });
      },
      function(err) { // 3rd param is the function to call when everything's done (inner callback)
        if (err) {
          if (callback) { // this method can be called asynchronously, without a callback
            return callback(err);
          } else {
            return log.error(err);
          }
        }
        if (callback) { // this method can be called asynchronously, without a callback
          //log.info('tracesImage.sync - inserted:', results.inserted + ', updated:', results.updated);
          callback(null, results);
        }
      }
    );
  },

  save: function(traces, callback) {
    var result = {
      inserted: 0,
      updated: 0,
    };
    async.each(
      traces,
      function(trace, callbackInner) {
        TracesImage.findOneAndUpdate(
          { // query
            imageUrl: trace.imageUrl,
            url: trace.url,
          },
          trace, // object to save
          { // options
            new: true, // return the modified document rather than the original
            upsert: true, // creates the object if it doesn't exist
            passRawResult: true // pass back mongo row result
          },
          function(err, doc, raw) { // result callback
            if (err) {
              //log.debug('can\'t save image trace', trace.imageUrl, ':', err);
            } else {
              if (raw.lastErrorObject.updatedExisting) {
                //log.debug('save() - trace for image', doc.imageUrl, 'updated');
                result.updated++;
              } else {
                //log.debug('save() - trace for image', doc.imageUrl, 'inserted');
                result.inserted++;
              }
            }
            callbackInner(err); // finish image save
          }
        );
      },
      function(err) {
        if (err) {
          return callback('could not save image traces:' + err.toString());
        }
        if (result.inserted) {
          log.info('image traces save finished; inserted:', result.inserted + ', updated:', result.updated);
        }
        callback(null, result); // success
      }
    );
  },

  getAll: function(callback) { // get all phone traces by phone
    TracesImage.find().lean().exec(function(err, traces) {
      if (err) {
        return callback(err);
      }
      callback(null, traces);
    });
  },

  getTracesByImageUrl: function(imageUrl, callback) { // get image traces by image url
    TracesImage.find({ imageUrl: imageUrl }).lean().exec(function(err, traces) {
      if (err) {
        return callback(err);
      }
      callback(null, traces);
    });
  },

};
  
module.exports = tracesImageProviderPrototype;
