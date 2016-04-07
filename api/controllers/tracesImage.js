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

  /**
   @abstract
   */
  getTraces: function() {
    throw new Error("can't call abstract method");
  },

  sync: function(phone, callback) {
    //log.debug('sync()', 'syncyng tracesImages from all tracesImage providers for phone value', phone);
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
        //log.debug('sync()', 'provider:', tPP.key);
        tPP.getTraces(phone, function(err, traces) {
          if (err) {
            return callbackInner(err);
          }
          if (results.length === 0) {
            log.debug('no image traces found on provider', tPP.key, 'for phone', phone);
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
    var phone = traces.length ? traces[0].phone : ''; // to log results before callback (all traces share same phone by design)
    async.each(
      traces,
      function(trace, callbackInner) {
        TracesImage.findOneAndUpdate(
          { // query
            phone: trace.phone,
            link: trace.link,
          },
          trace, // object to save
          { // options
            new: true, // return the modified document rather than the original
            upsert: true, // creates the object if it doesn't exist
            passRawResult: true // pass back mongo row result
          },
          function(err, doc, raw) { // result callback
            if (err) {
              //log.debug('can\'t save trace', trace.phone, trace.link, ':', err);
            } else {
              if (raw.lastErrorObject.updatedExisting) {
                //log.debug('trace', doc.phone, doc.link, 'updated');
                result.updated++;
              } else {
                //log.debug('trace', doc.phone, doc.link, 'inserted');
                result.inserted++;
              }
            }
            callbackInner(err); // finish image save
          }
        );
      },
      function(err) {
        if (err) {
          return callback('could not save phone traces:' + err.toString());
        }
        if (phone) { // no phone, no traces
          log.info('phone', phone, 'traces save finished; inserted:', result.inserted, ', updated:', result.updated);
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

  getTracesByImage: function(image, callback) { // get image traces by image
    TracesImage.find({ image: image }).lean().exec(function(err, traces) {
      if (err) {
        return callback(err);
      }
      callback(null, traces);
    });
  },

};
  
module.exports = tracesImageProviderPrototype;
