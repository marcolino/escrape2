'use strict';

var mongoose = require('mongoose') // mongo abstraction
  , request = require('request') // to place http requests
  , cheerio = require('cheerio') // to parse fetched DOM data
  , async = require('async') // to call many async functions in a loop
  , provider = require('../controllers/provider') // controller of provider
  , Review = require('../models/review') // model of reviews
  , reviewGF = require('./review-GF') // GF review provider class
  , reviewEA = require('./review-EA') // EA review provider class
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

var reviewProviderPrototype = {
  key: undefined,
  active: undefined,
  url: undefined,
  pathSearch: undefined,
  tags: undefined,
  UNKNOWN_ENTITY: '', // unknown entity symbol (could also be &#xfffd;)

  /**
   @abstract
   */
  getTopics: function() {
    throw new Error("can't call abstract method");
  },
  
  /**
   @abstract
   */
  getPosts: function() {
    throw new Error("can't call abstract method");
  },

  sync: function(phone, callback) {
    console.log('sync()', 'syncyng reviews from all review providers for phone value', phone);
    var reviewProviders = {
      gf: reviewGF,
      ea: reviewEA,
    };
  
    async.each(
      reviewProviders,
      function(rP, callbackInner) {
        console.log('sync()', 'provider:', rP.key);
        rP.getTopics(phone, function(err, results) {
          if (err) {
            return callbackInner(err);
          }
          rP.getPosts(results, function(err, results) {
            if (err) {
              return callbackInner(err);
            }
            if (results.length === 0) {
              log.debug('no posts found on provider', rP.key, 'for phone', phone);
              return callbackInner();
            }
  
            // save results to database
            exports.save(results, function(err, doc) {
              if (err) {
                return callbackInner(err);
              }
              callbackInner(); // this person is done
            });
  
          });
        });
      },
      function(err) { // 3rd param is the function to call when everything's done (outer callback)
        if (err) {
          if (callback) { // this method can be called asynchronously, without a callback
            return callback(new Error('can\'t sync posts for phone ' + phone + ': ' + err));
          } else {
            return log.error('can\'t sync posts for phone', phone, ':', err);
          }
        }
        if (callback) { // this method can be called asynchronously, without a callback
          callback();
        }
      }
    );
  },

  save: function(posts, callback) {
    log.info('saving review posts...');
    async.each(
      posts,
      function(post, callbackInner) {
        Review.update(
          { key: post.key }, 
          { $setOnInsert: post }, // posts do no change with time
          { upsert: true },
          function(err, numAffected) {
            if (err) {
              return callback(new Error('could not update reviews: ' + err));
            }
            callbackInner();
          }
        );
      },
      function(err) {
        if (err) {
          return callback(new Error('could not save reviews: ' + err));
        }
        callback(); // success
      }
    );
  },

  getByPhone: function(phone, callback) { // get reviews by phone
    Review.find({ phone: phone }).lean().exec(function(err, reviews) {
      if (err) {
        return callback(err);
      }
      //// DEBUG ONLY /////////////////////////////////////////////
      //if (reviews.length === 0) {
      //  reviews = require('../../.old/reviews_SAMPLE_DATA');
      //}
      ///////////////////////////////////////////////////////////

      callback(null, reviews);
    });
  },

};

module.exports = reviewProviderPrototype;