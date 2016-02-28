'use strict';

var mongoose = require('mongoose') // mongo abstraction
  , request = require('request') // to place http requests
  , cheerio = require('cheerio') // to parse fetched DOM data
  , async = require('async') // to call many async functions in a loop
  , TracesPhone = require('../models/tracesPhone') // model of tracesPhone
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

var tracesPhoneProviderPrototype = {
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
    console.log('sync()', 'syncyng tracesPhones from all tracesPhone providers for phone value', phone);
    var tracesPhoneProviders = {
      go: require('./tracesPhone-GO'),
    };
  
    async.each(
      tracesPhoneProviders,
      function(tPP, callbackInner) {
        console.log('sync()', 'provider:', tPP.key);
        tPP.getTraces(phone, function(err, results) {
          if (err) {
            return callbackInner(err);
          }
          if (results.length === 0) {
            log.debug('no phone traces found on provider', tPP.key, 'for phone', phone);
            return callbackInner();
          }
  
          // save results to database
          tracesPhoneProviderPrototype.save(results, function(err, doc) {
            if (err) {
              return callbackInner(err);
            }
            log.debug('saved', results.length, 'phone traces found on provider', tPP.key, 'for phone', phone);
            callbackInner(); // this person is done
          });
  
        });
      },
      function(err) { // 3rd param is the function to call when everything's done (outer callback)
        if (err) {
          if (callback) { // this method can be called asynchronously, without a callback
            return callback(new Error('can\'t sync phone traces for phone ' + phone + ': ' + err));
          } else {
            return log.error('can\'t sync phone traces for phone', phone, ':', err);
          }
        }
        if (callback) { // this method can be called asynchronously, without a callback
          callback();
        }
      }
    );
  },

  save: function(traces, callback) {
    async.each(
      traces,
      function(trace, callbackInner) {
        TracesPhone.update(
          { key: trace.key }, 
          { $setOnInsert: trace }, // newer phone traces should be better than older ones
          { upsert: true },
          function(err, numAffected) {
            if (err) {
              return callbackInner(new Error('could not update phone traces: ' + err));
            }
            callbackInner();
          }
        );
      },
      function(err) {
        if (err) {
          return callback(new Error('could not save phone traces: ' + err));
        }
        callback(); // success
      }
    );
  },

  getAll: function(callback) { // get all phone traces by phone
    TracesPhone.find().lean().exec(function(err, traces) {
      if (err) {
        return callback(err);
      }
      callback(null, traces);
    });
  },

  getTracesByPhone: function(phone, callback) { // get phone traces by phone
log.info('ctrl getTracesByPhone phone:', phone);
    TracesPhone.find({ phone: phone }).lean().exec(function(err, traces) {
      if (err) {
        return callback(err);
      }
log.info('ctrl getTracesByPhone traces:', traces);
      callback(null, traces);
    });
  },

};

module.exports = tracesPhoneProviderPrototype;