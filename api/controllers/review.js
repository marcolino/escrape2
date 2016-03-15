'use strict';

var mongoose = require('mongoose') // mongo abstraction
  , request = require('request') // to place http requests
  , cheerio = require('cheerio') // to parse fetched DOM data
  , async = require('async') // to call many async functions in a loop
  //, provider = require('../controllers/provider') // controller of provider
  , Review = require('../models/review') // model of reviews
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
  locale: undefined,

  UNKNOWN_ENTITY: '', // unknown entity symbol

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
    var results = {
      inserted: 0,
      updated: 0,
    };    
    var reviewProviders = {
      gf: require('./review-GF'),
      ea: require('./review-EA'),
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
            log.debug('saving', results.length, 'posts found on provider', rP.key, 'for phone', phone);
  
            // save results to database
            reviewProviderPrototype.save(results, function(err, result) {
              if (err) {
                return callbackInner(err);
              }
              results.inserted += result.inserted;
              results.updated += result.updated;
              callbackInner(); // this person is done
            });
  
          });
        });
      },
      function(err) { // 3rd param is the function to call when everything's done (inner callback)
        if (err) {
          if (callback) { // this method can be called asynchronously, without a callback
            return callback(new Error('can\'t sync posts for phone ' + phone + ': ' + err));
          } else {
            return log.error('can\'t sync posts for phone', phone, ':', err);
          }
        }
        if (callback) { // this method can be called asynchronously, without a callback
          callback(null, results);
        }
      }
    );
  },

  save: function(posts, callback) {
    log.info('saving review posts...');
    var result = {
      inserted: 0,
      updated: 0,
    };
    async.each(
      posts,
      function(post, callbackInner) {
        /*
        Review.update(
          { key: post.key }, 
          { $setOnInsert: post }, // posts do no change with time
          { upsert: true },
          function(err, numAffected) {
            if (err) {
              return callbackInner(new Error('could not update reviews: ' + err));
            }
            callbackInner();
          }
        );
        */
        Review.findOneAndUpdate(
          { key: post.key }, // query
          post, // object to save
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
          return callback(new Error('could not save reviews: ' + err));
        }
        log.info('traces save finished; inserted:', result.inserted, ', updated:', result.updated);
        callback(null, result); // success
      }
    );
  },

  getPostsByPhone: function(phone, callback) { // get review posts by phone
    Review.find({ phone: phone }).lean().exec(function(err, posts) {
      if (err) {
        return callback(err);
      }
      callback(null, posts);
    });
  },

  getTopicsByPhone: function(phone, callback) { // get review topics by phone
    Review.find({ phone: phone }, { topic: 1 }).lean()./*distinct('topic.key').*/exec(function(err, reviews) {
      if (err) {
        return callback(err);
      }

      // keep only unique topics (TODO: do this in query...)
      var dictionary = {};
      var topics = [];
console.info('getTopicsByPhone, phone:', phone, ', reviews:', reviews);
      for (var i in reviews) {
console.info('getTopicsByPhone, phone:', phone, ', review:', i);
        if (typeof(dictionary[reviews[i].topic.key]) === 'undefined') {
          topics.push(reviews[i].topic); // add this new topic review to unique topics
        }
        dictionary[reviews[i].topic.key] = true; // create this key in dictionary
      }

      callback(null, topics);
    });
  },

  getPostsByTopic: function(topicKey, callback) { // get review posts by topic
    Review.find({ 'topic.key': topicKey }).lean().exec(function(err, posts) {
      if (err) {
        return callback(err);
      }
      callback(null, posts);
    });
  },
};

module.exports = reviewProviderPrototype;