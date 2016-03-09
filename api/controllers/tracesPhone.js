'use strict';

var mongoose = require('mongoose') // mongo abstraction
  , request = require('request') // to place http requests
  , cheerio = require('cheerio') // to parse fetched DOM data
  , async = require('async') // to call many async functions in a loop
  , url = require('url') // parse urls
  , provider = require('../controllers/provider') // provider's controller
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
    //log.debug('sync()', 'syncyng tracesPhones from all tracesPhone providers for phone value', phone);
    var tracesPhoneProviders = {
      go: require('./tracesPhone-GO'),
    };
  
    // filter results based on hostnames blacklist
    tracesPhoneProviderPrototype.blacklist(function(blacklist) {
      var results = {
        inserted: 0,
        updated: 0,
      };
      async.each(
        tracesPhoneProviders,
        function(tPP, callbackInner) {
          //log.debug('sync()', 'provider:', tPP.key);
          tPP.getTraces(phone, function(err, traces) {
            if (err) {
              return callbackInner(err);
            }
            if (results.length === 0) {
              log.debug('no phone traces found on provider', tPP.key, 'for phone', phone);
              return callbackInner();
            }

var tracesLB = traces.length;  
            traces = traces.filter(function(result) { // filter out results in blacklist or with suspect description
              //return blacklist.indexOf(url.parse(result.link).hostname) <= -1;
              if (blacklist.indexOf(url.parse(result.link).hostname) > -1) { // result link in blacklist: filter it out
                return false;
              }
              if (/(\d{8,11}([^\d]+|$)){3,}/.test(result.description)) { // suspect description (list of phone numbers): filter it out
                return false;
              }
              return true;
            });
var tracesLA = traces.length;
log.error('blacklist filtered', (tracesLB - tracesLA), 'traces');
  
            // save results to database
            tracesPhoneProviderPrototype.save(traces, function(err, result) {
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
            log.info('tracesPhone.sync - inserted:', results.inserted + ', updated:', results.updated);
            callback(null, results);
          }
        }
      );
    });
  },

  save: function(traces, callback) {
    var result = {
      inserted: 0,
      updated: 0,
    };
    async.each(
      traces,
      function(trace, callbackInner) {
        TracesPhone.findOneAndUpdate(
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
        log.info('traces save finished; result:', result);
        callback(null, result); // success
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

  getAllPhones: function(callback) { // get all phone traces by phone (ordered by the most recently sync date)
    TracesPhone.find({}, { phone: 1, dateOfLastSync: 1 }).lean().exec(function(err, traces) {
      if (err) {
        return callback(err);
      }
      // extract one element per phone, keeping the one with the most recently sync date
      var unique = {};
      for (var i in traces) {
        var trace = traces[i];
        if (!(trace.phone in unique)) { // unique does not yet contain trace.phone, insert it
          unique[trace.phone] = trace.dateOfLastSync;
        } else { // unique does already contain trace.phone
          if (unique[trace.phone] > trace.dateOfLastSync) { // update it if it's date of last sync is more recent
            //log.debug('THIS SHALL HAPPEN WHEN TRACES WILL BE MORE THAN ONE PER PHONE...:', unique[trace.phone], '>', trace.dateOfLastSync); 
            unique[trace.phone] = trace.dateOfLastSync;
          }
        }
      }
      // extract one element per phone, and sort by dateOfLastSync reversed

//log.debug('unique:', unique);
      callback(null, unique);
    });
  },

  getTracesByPhone: function(phone, callback) { // get phone traces by phone
    TracesPhone.find({ phone: phone }).lean().exec(function(err, traces) {
      if (err) {
        return callback(err);
      }
      callback(null, traces);
    });
  },

  blacklist: function(callback) { // get hostnames known not to contain useful data
    var blacklist = [
      'chechiamarepertelefono.besaba.com',
      'iptrace.in',
      'ip.haoxiana.com',
      'itnumber.com',
      'numberinquiry.com', 
      'okcaller.com',
      'sync.me',
      'us.who-called.info',
      'ws.114chm.com',
      'www.fitnessworldclub.net',
      'www.lericetteditonia.com',
      'www.mightynumbers.com',
      'www.televideoconference.org',
      'www.whycall.eu',
    ];
    provider.getAll({}, function(err, providers) {
      if (err) {
        return log.error('blacklist: can\'t get providers');
      }
      providers.forEach(function(p) {
        blacklist.push(url.parse(p.url).hostname);
      });
      callback(blacklist);
    });
  },

};
  
module.exports = tracesPhoneProviderPrototype;

/*
// test
var traces = [
  {
    phone: '3331234568',
    link: 'http://www.example.com/',
    title: 'title 1',
    description: 'descrption 1',
    dateOfLastSync: new Date(),
  }
];
var db = require('../models/db') // database wiring
tracesPhoneProviderPrototype.save(traces, function(err, result) {
  if (err) {
    return log.error('err:', err);
  }
  console.info('saved traces:', result);
});
*/