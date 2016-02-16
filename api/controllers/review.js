'use strict';

var mongoose = require('mongoose') // mongo abstraction
  , request = require('request') // to place http requests
  , cheerio = require('cheerio') // to parse fetched DOM data
  , async = require('async') // to call many async functions in a loop
  //, provider = require('../controllers/provider') // provider's controller
  , provider = require('../controllers/provider') // controller of provider
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
  provider.getAllLean({ type: 'reviews' }, function(err, providers) {
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
//log.warn('/api/controllers/review/getByPhone()', 'reviews:', reviews);
// DEBUG ONLY
if (reviews.length === 0) {
  reviews = [
    {
      topic: {
        phone: '3336480983',
        providerKey: 'SGI',
        body: null,
        counter: 1,
        section: 'EA topic section A',
        url: 'http://topic.1.url/',
        title: 'this is the first nice small topic',
        author: {
          name: 'EA topic author one',
          url: 'EA topic author url one',
        },
        dateOfCreation: 'EA topic one date of creation',
      },
      author: {
        name: 'myself',
        karma: 'super duper',
        postsCount: 7,
      },
      title: 'my first small post',
      date: new Date(),
      contents: 'I am very satisfied...<br>line 2<br>line 3<br>line 4<br>line 5<br>line 6<br>line 7<br>line 8<br>line 9<br>line 10<br>line 11<br>line 12<br>',
      cost: '200€',
      beauty: 1.0,
      performance: 0.8,
      sympathy: 0.4,
      cleanliness: 0.2,
      location: {
        quality: 0.6,
        cleanliness: 0.2,
        reachability: 0,
      },
    },
    {
      topic: {
        phone: '3334567890',
        providerKey: 'TOE',
        body: null,
        counter: 2,
        section: 'EA topic section B',
        url: 'http://topic.2.url/',
        title: 'this is the second nice small topic',
        author: {
          name: 'EA topic author two',
          url: 'EA topic author url two',
        },
        dateOfCreation: 'EA topic two date of creation',
      },
      author: {
        name: 'my other self',
        karma: 'beginner',
        postsCount: 2,
      },
      title: 'my second small post',
      date: new Date(),
      contents: 'I am very dissatisfied...',
      cost: '150€',
      beauty: 0.1,
      performance: 0.6,
      sympathy: 0.2,
      cleanliness: 0.3,
      site: {
        quality: 0.5,
        cleanliness: 0.1,
        reachability: 0.9,
      },
    },
  ];
}

    callback(null, reviews);
  });
};

module.exports = exports;
