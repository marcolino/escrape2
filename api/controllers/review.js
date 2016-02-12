'use strict';

var mongoose = require('mongoose') // mongo abstraction
  , request = require('request') // to place http requests
  , cheerio = require('cheerio') // to parse fetched DOM data
  , async = require('async') // to call many async functions in a loop
  //, provider = require('../controllers/provider') // provider's controller
  , Provider = require('../models/provider') // model of provider
  //, Person = require('../models/person') // model of person
  , reviewGF = require('./reviewGF') // GF provider methods
  , reviewEA = require('./reviewEA') // EA provider methods
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

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

exports.syncPosts = function(search, callback) {
  console.log('syncPosts()', 'syncyng posts for search value', search);
  Provider.find({ type: 'reviews' }).lean().exec(function(err, providers) {
    if (err) {
      return log.error('error getting providers:', err);
    }
    var posts = [];
    //var topics = [];
    async.each(
      providers, // 1st param in async.each() is the array of items
      function(provider, callbackInner) { // 2nd param is the function that each item is passed to
        console.log('syncPosts()', 'provider:', provider.key);
        if (!(provider.key in perProviderMethods)) {
          return callbackInner(new Error('provider', provider.key, 'is not handled'));
        }
        perProviderMethods[provider.key].getTopics(provider, search, function(err, results) {
          if (err) {
            return callbackInner(err);
          }
          //topics = topics.concat(results);
          perProviderMethods[provider.key].getPosts(provider, results, function(err, results) { // TODO...
            if (err) {
              return callbackInner(err);
            }
            //console.log('posts.length before concat:', posts.length);
            posts = posts.concat(results); // TODO: concat to array, or insert in DB?
            //console.log('posts.length after concat:', posts.length);
            callbackInner(null);
          });
        });
      },
      function(err) { // 3rd param is the function to call when everything's done (outer callback)
        if (err) {
          return callback(err);
        }
        //console.log('FINAL POSTS:', posts);
        callback(null, posts);
      }
    );
  });
};

module.exports = exports;
