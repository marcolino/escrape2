'use strict';

var mongoose = require('mongoose') // mongo abstraction
  , request = require('request') // to place http requests
  , cheerio = require('cheerio') // to parse fetched DOM data
  , crypto = require('crypto') // md5
  , async = require('async') // to call many async functions in a loop
  , Provider = require('../models/provider') // model of provider
  , Review = require('../models/review') // model of reviews
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

var UNKNOWN_ENTITY = ''; // &#xfffd;';

exports.getTopics = function(provider, phone, callback) {
  var url = provider.url + provider.pathSearch;

  // TODO: we currently search only on the first page of topics, but should search also next pages (yes?)
log.info('GF getTopics()', provider.key, 'requesting topics from url:', url, 'phone:', phone);
  request(
    {
      url: url,
      method: 'POST',
      form: { search: phone },
      timeout: config.networking.timeout, // number of milliseconds to wait for a server to send response headers before aborting the request
    },
    function (err, response, body) {
      if (err || response.statusCode !== 200) {
        return callback(new Error('error on response' + (response ? ' (' + response.statusCode + ')' : '') + ':' + err + ' : ' + body), null);
      }
//console.log(body);
      var $ = cheerio.load(body);
      var topics = [];
      $('div[class~="topic_details"]').each(function (i, element) { // topics loop
        var topic = {};
        topic.phone = phone;
        topic.providerKey = provider.key;
        topic.body = null; // this driver doesn't use topic's body
        //topic.counter = $(element).find('div[class^="counter"]').text();
        topic.section = $(element).find('a').eq(0).text();
        topic.url = $(element).find('a').eq(1).attr('href');
        topic.pageLast = {};
        topic.pageLast.url = url;
        topic.pageLast.etag = response.headers.etag;
        topic.title = $(element).find('a').eq(1).text();
        topic.author = {};
        topic.author.name = $(element).find('a').eq(2).text();
        topic.author.url = $(element).find('a').eq(2).attr('href');
        topic.date = parseDate($(element).find('em').text().trim());
        topics.push(topic);
      });
      console.log('getTopics()', provider.key, 'found', topics.length, 'topics');
      callback(null, topics);
    }
  );
};

exports.getPosts = function(provider, topics, callback) {
log.info('GF getPosts:', provider.key);
  var posts = [];

  async.each(
    topics,
    function(topic, callbackTopics) {

      // check if topic is new or exists already
      log.info('getPosts()', provider.key, 'check if topic exists already in DB:', topic.title);
      Review.find({ 'topic.pageLast.url': topic.pageLast.url }, function(err, results) {
        if (err) {
          return callback(err);
        }
        if (results.length > 0) { // topic is already present in DB

          // TODO: remove this test at production (?)
          if (results.length > 1) { // safety check, this should not happen!
            return callback(new Error('more than one review post found for provider', provider.key, 'with topic.pageLast.url value', topic.pageLast.url));
          }
          var topicFound = results[0];
          log.debug('getPosts()', provider.key, 'scraping EXISTING topic:', topicFound.title);
          topic.url = topicFound.pageLast.url; // set url as the last page url of found topic
          topic.etag = topicFound.pageLast.etag; // set etag to last page etag of found topic

        } else { // topic is new

          log.debug('getPosts()', provider.key, 'scraping NEW topic:', topic.title);
          topic.url = topic.url.replace(/\/msg\d+\/.*/, ''); // transform specific post url to topic base url
          topic.etag = null; // don't set etag

        }

        async.whilst(
          function() { return topic.url !== null; },
          function(callbackWhilst) {
            log.info('GF getPosts()', 'requesting url', topic.url);
            var options = {
              url: topic.url,
            };
            if (topic.etag) { // must check etag is not null, can't set a null If-None-Match header
              options.headers['If-None-Match'] = topic.etag ; // eTag field
            }
            request(
              options,
              function(err, response, body) {
                if (err || (response.statusCode !== 200 && response.statusCode !== 304)) {
                  return callback(new Error('error on response' + (response ? ' (' + response.statusCode + ')' : '') + ':' + err + ' : ' + body), null);
                }
                if (response.statusCode === 304) {
                  log.info('GF getPosts()', 'TOPIC PAGE DID NOT CHANGE (304 status code returned): SKIPPING');
                  topic.url = null;
                  return callbackWhilst();
                } else {
                  log.info('GF getPosts()', 'TOPIC PAGE DID CHANGE (!304 status code returned): ELABORATING');
                }
                var $ = cheerio.load(body);
                $('table[border-color="#cccccc"]').each(function(i, element) { // post elements
                  var post = {};
                  post.phone = topic.phone;
                  post.topic = {};
                  post.topic.providerKey = topic.providerKey;
                  post.topic.section = topic.section;
                  post.topic.url = topic.url;
                  post.topic.title = topic.title;
                  post.topic.author = {};
                  post.topic.author.name = topic.author.name ? topic.author.name : UNKNOWN_ENTITY;
                  post.topic.author.url = topic.author.url ? topic.author.url : UNKNOWN_ENTITY;
    
                  var postHtml = $(element).html();
            
                  post.title = $(element).find('a[title^="TITLE..."]').text(); // post title (TODO!!!)

                  post.author = {};
                  post.author.name = $(element).find('a[title^="View the profile of "]').text(); // post author name regex
    
                  var authorHtml = $(element).find('span[class="smalltext"]').html();
            
                  var authorKarmaRE = /Karma:\s*(.*?)\s*<br>/; // post author karma regex
                  post.author.karma = authorKarmaRE.exec(authorHtml);
                  post.author.karma = post.author.karma && post.author.karma.length >= 1 ? post.author.karma[1] : null;
    
                  var authorPostsRE = /Posts:\s*(.*?)\s*<br>/; // post author posts count regex
                  post.author.postsCount = authorPostsRE.exec(authorHtml);
                  post.author.postsCount = post.author.postsCount && post.author.postsCount.length >= 1 ? post.author.postsCount[1] : null;
    
                  var dateRE = /&#xAB;\s*<b>(?:.*?)\s*on\:<\/b>\s*(.*?)\s*&#xBB;/; // post date regex
                  post.date = dateRE.exec(postHtml);
                  post.date = post.date && post.date.length >= 1 ? parseDate(post.date[1]) : null;
    
                  // remove quotes of previous post from post
                  var contents = $(element).find('div.post').html();
                  post.contents = parseContents(contents);
    
                  posts.push(post);
                });
                //console.log('posts:', posts);
          
                var last = $('a[name="lastPost"]').next().html();
                //log.info('GF  *** LAST:', last);
                var nextRE = /\[<strong>\d+<\/strong>\] <a class="navPages" href="(.*?)".*>/g;
                var match = nextRE.exec(last);
                if (match && match[1]) {
                  //log.info('GF getPosts()', 'next url:', match[1]);
                  topic.url = match[1];
                } else {
                  topic.url = null;
                }
                callbackWhilst();
              }
            );
          },
          function(err, done) {
            //log.info('GF getPosts()', 'done async.whilst');
            callbackTopics(null); // this topic is done, go to next one
          }
        );
      });

    },
    function(err, done) { // all topics are done, call return callback
      //log.info('GF getPosts()', 'done async.each:', posts);
      var postsWithKeys = posts.map(function(post) {
        post.key = crypto.createHash('md5').update(
          post.phone + '|' + post.author.name + '|' + post.date + '|' + post.contents
        ).digest('hex');
        return post;
      });
      callback(null, postsWithKeys);
    }
  );
};

function parseDate(date, locale) { // parse date from custom format to Date()
  var monthLocales =
  {
    en: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    it: [
      'Gennaio',
      'Febbraio',
      'Marzo',
      'Aprile',
      'Maggio',
      'Giugno',
      'Luglio',
      'Agosto',
      'Settembre',
      'Ottobre',
      'Novembre',
      'Dicembre',
    ],
  };
  var year, month, day, hours, minutes, seconds, ampm;

  var dateStandardRE = /(\d\{4\}) (\w+) (\d\{2\}), (\d\{2\}):(\d\{2\}:(\d\{2\}) ([ap]m))/;
  var dateStandard = dateStandardRE.exec(date);
  if (dateStandard !== null) { // source date is in 'Standard' format
    year = dateStandard[0];
    month = 1 + dateStandard[locale][dateStandard[1]];
    day = dateStandard[2];
    hours = dateStandard[3];
    minutes = dateToday[4];
    seconds = dateToday[5];
    ampm = dateToday[6];
    // see https://en.wikipedia.org/wiki/12-hour_clock
    if (ampm === 'am') {
      if (hours === 12) {
        hours = hours - 12;
      }
    } else
    if (ampm === 'pm') {
      if (hours < 12) {
        hours = hours + 12;
      }
    }
    return new Date(year, month, day, hours, minutes, seconds); // TODO: TO BE TESTED
  }

  var dateTodayRE = /<strong>Today<\/strong> at (\d\d):(\d\d):(\d\d)/;
  var dateToday = dateTodayRE.exec(date);
  if (dateToday !== null) { // source date is in 'Today' format
    var today = new Date();
    year = today.getUTCFullYear();
    month = today.getUTCMonth() + 1;
    day = today.getUTCDate();
    hours = dateToday[0];
    minutes = dateToday[1];
    seconds = dateToday[1];
    return new Date(year, month, day, hours, minutes, seconds); // TODO: TO BE TESTED
  }

  // source date is in unknown format
  return null;  
}

function parseContents(contents) { // parse contents from contents string
  var contentsQuotesRE = /(.*?)(<div class="quoteheader">.*?<div class="topslice_quote">.*?<a .*?>.*?<\/a>.*?<\/div>.*?<\/div>.*?<blockquote.*?>.*?<\/blockquote>.*?<div class="quotefooter">.*?<div class="botslice_quote">.*?<\/div>.*?<\/div>)(.*)/;
  var quotes = contentsQuotesRE.exec(contents);
  if (quotes) {
    contents = quotes[1] + quotes[3];
  }
  contents = contents.replace(/^\s*/, '');
  contents = contents.replace(/\s*$/, '');
  contents = contents.replace(/^(<br>)*/, '');
  contents = contents.replace(/(<br>)*$/, '');
  return contents; 
}

module.exports = exports;
