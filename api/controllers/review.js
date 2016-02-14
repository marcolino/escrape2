'use strict';

var mongoose = require('mongoose') // mongo abstraction
  , request = require('request') // to place http requests
  , cheerio = require('cheerio') // to parse fetched DOM data
  , async = require('async') // to call many async functions in a loop
  //, provider = require('../controllers/provider') // provider's controller
  , Provider = require('../models/provider') // model of provider
  , Review = require('../models/review') // model of reviews
  , reviewGF = require('./reviewGF') // GF provider methods
  , reviewEA = require('./reviewEA') // EA provider methods
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

// TODO: instead, try using JS prototypes: see https://github.com/serebrov/so-questions/tree/master/js-inheritance
var perProviderMethods = {
  'GF': {
    'getTopics': reviewGF.getTopics,
    'getPosts': reviewGF.getPosts,
  },
  'EA': {
    'getTopics': reviewEA.getTopics,
    'getPosts': reviewEA.getPosts,
  },
};

exports.sync = function(phone, callback) {
  console.log('sync()', 'syncyng reviews for phone value', phone);
  Provider.find({ type: 'reviews' }).lean().exec(function(err, providers) {
    if (err) {
      return log.error('error getting providers:', err);
    }
    var posts = [];
    //var topics = [];
    async.each(
      providers, // 1st param in async.each() is the array of items
      function(provider, callbackInner) { // 2nd param is the function that each item is passed to
        console.log('sync()', 'provider:', provider.key);
        if (!(provider.key in perProviderMethods)) {
          return callbackInner(new Error('provider', provider.key, 'is not handled'));
        }
        perProviderMethods[provider.key].getTopics(provider, phone, function(err, results) {
          if (err) {
            return callbackInner(err);
          }
          //topics = topics.concat(results);
          perProviderMethods[provider.key].getPosts(provider, results, function(err, results) {
            if (err) {
              return callbackInner(err);
            }
            if (results.length === 0) {
              log.debug('no posts found on provider', provider.key, 'for phone', phone);
              return callbackInner();
            }

            //console.log('posts.length before concat:', posts.length);
            //posts = posts.concat(results); // TODO: concat to array, or insert in DB?
            //console.log('posts.length after concat:', posts.length);

            // save results to database
            exports.save(results, function(err, doc) {
              if (err) {
                return callbackInner(err);
              }
              callbackInner(); // this person is done
            });
            //callbackInner(null);

          });
        });
      },
      function(err) { // 3rd param is the function to call when everything's done (outer callback)
        if (err) {
          //return callback(err);
          return log.warn('can\'t sync phone', phone, 'posts:', err);
        }
        //console.log('FINAL POSTS:', posts);
        log.info('sync\'d phone', phone, 'posts');
        //callback(null, posts);
      }
    );
  });
};

exports.save = function(posts, callback) {
log.info('saving review posts:', posts);
  Review.create(posts, function(err, docs) {
    if (err) {
      return callback('could not create reviews: ' + err);
    }
    log.debug('saved', docs.length, 'posts in reviews');
    callback();
  });
};

exports.getByPhone = function(filter, callback) { // get reviews by phone
  Review.find(filter).lean().exec(function(err, reviews) {
    if (err) {
      return callback(err);
    }
log.warn('/api/controllers/review/getByPhone()', 'reviews:', reviews);
    callback(null, reviews);
  });
};

module.exports = exports;
