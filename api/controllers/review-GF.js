'use strict';

var mongoose = require('mongoose') // mongo abstraction
  , request = require('request') // to place http requests
  , throttledRequest = require('throttled-request')(request) // to throttle requests
  , cheerio = require('cheerio') // to parse fetched DOM data
  , crypto = require('crypto') // md5
  , async = require('async') // to call many async functions in a loop
  , reviewProviderPrototype = require('../controllers/review') // review provider abstract class
  , Review = require('../models/review') // model of reviews
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

// GF reviewProvider initialization
var GF = Object.create(reviewProviderPrototype);
GF.key = 'GF';
GF.active = true;
GF.url = 'http://gnoccaforum.com';
GF.pathSearch = '/escort/search2';
GF.tags = {};
GF.locale = 'it';

GF.getTopics = function(phone, callback) {
  var topics = [];
  var url = this.url + this.pathSearch;
  //log.info('getTopics()', this.key, 'requesting topics from url:', url, 'phone:', phone);

  if (!this.active) {
    return callback(null, topics);
  }

  // TODO: we currently search only on the first page of topics, but should we search also next pages ?

  // avoid "Your last search was less than 2 seconds ago." errors
  if (!this.configured) {
    throttledRequest.configure({
      requests: 1,
      milliseconds: 3 * 1000
    }); // throttle the requests so no more than 1 is made every 3 seconds
    this.configured = true;
  }

  var that = this;
  throttledRequest(
    {
      url: url,
      method: 'POST',
      form: { search: phone },
      timeout: config.networking.timeout, // number of milliseconds to wait for a server to send response headers before aborting the request
    },
    function (err, response, body) {
      if (err || response.statusCode !== 200) {
        return callback(new Error('provider ' + that.key + ': response' + (response ? ' (' + response.statusCode + ')' : '') + (err ? ':' + err : '') + (typeof body !== 'undefined' ? ': ' + body : ''), null));
      }
      var $ = cheerio.load(body);
      $('div[class~="topic_details"]').each(function (i, element) { // topics loop
        var topic = {};
        topic.phone = phone;
        topic.providerKey = that.key;
        topic.body = null; // this driver doesn't use topic's body
        //topic.counter = $(element).find('div[class^="counter"]').text();
        topic.section = $(element).find('a').eq(0).text();
        topic.url = $(element).find('a').eq(1).attr('href');
        topic.title = $(element).find('a').eq(1).text();
        /*
        topic.author = {};
        topic.author.name = $(element).find('a').eq(2).text();
        topic.author.url = $(element).find('a').eq(2).attr('href');
        */
        topic.date = parseDate($(element).find('em').text().trim(), that.locale);

        topic.key = crypto.createHash('md5').update(
          topic.phone + '|' + topic.providerKey + '|' + topic.title + '|' + topic.date
        ).digest('hex');

        topics.push(topic);
      });
      callback(null, topics);
    }
  );
};

GF.getPosts = function(topics, callback) {
//log.info('getPosts:', this.key);
  var posts = [];

  if (!this.active) {
    return callback(null, posts);
  }

  var that = this;
  async.each(
    topics,
    function(topic, callbackTopics) {

      // check if topic is new or exists already
      Review.find({ 'topic.key': topic.key }).lean().exec(function(err, results) {
        if (err) {
          return callback(err);
        }
        if (results.length > 0) { // topic is already present in DB
//log.debug('getPosts()', that.key, 'topic exists already in DB:', topic.title);

          // TODO: remove that test at production (?)
          //if (results.length > 1) { // safety check, this should not happen!
          //  return callback(new Error('more than one (' + results.length + ') review post found for provider ' + that.key + ' with topic.key value ' + topic.key + ' - results:' + results));
          //}

          var lastTopicFound = results[results.length - 1].topic;
          topic.pageLast = {};
          topic.pageLast.url = lastTopicFound.pageLast.url;
//log.warn('starting existing topic scraping from last url:', topic.pageLast.url);
          topic.pageLast.lastModified = lastTopicFound.pageLast.lastModified;

        } else { // topic is new
//log.debug('getPosts()', that.key, 'scraping NEW topic');
          topic.pageLast = {};
          topic.pageLast.url = topic.url.replace(/\/msg\d+\/.*/, ''); // transform specific post url to topic base url
          topic.pageLast.lastModified = null; // don't set lastModified
//log.warn('starting new topic scraping from url:', topic.pageLast.url);
        }

        topic.nextUrl = topic.pageLast.url;
//log.debug('********** topic.pageLast.url:', topic.pageLast.url);
        async.whilst(
          function() { return topic.nextUrl !== null; },
          function(callbackWhilst) {
            //log.debug('getPosts('+topic.phone+')', that.key, 'url', topic.nextUrl);
            var options = {
              url: topic.nextUrl,
            };
            if (topic.pageLast.lastModified) { // must check lastModified is not null, can't set a null If-Modified-Since header
              options.headers = {};
              options.headers['If-Modified-Since'] = topic.pageLast.lastModified; // lastModified field
//log.debug('********** options.headers[If-Modified-Since]:', topic.pageLast.lastModified);
            }
            request(
              options,
              function(err, response, body) {
                if (err) {
                  return callback(new Error('error on response' + (response ? ' (' + response.statusCode + ')' : '') + ':' + err + ' : ' + body), null);
                }
                if (response.statusCode === 304) {
                  log.info('getPosts()', that.key, 'TOPIC PAGE DID NOT CHANGE: SKIPPING');
                  topic.nextUrl = null;
                  return callbackWhilst();
                }
                if (response.statusCode === 404) {
                  log.info('getPosts()', that.key, 'TOPIC PAGE NOT FOUND: SKIPPING', 'url:', topic.nextUrl, topic.title);
                  topic.nextUrl = null;
                  return callbackWhilst();
                }
                if (response.statusCode !== 200) {
                  log.info('getPosts()', that.key, 'TOPIC PAGE RETURNED STATUS CODE', response.statusCode, ': SKIPPING');
                  topic.nextUrl = null;
                  return callbackWhilst();
                }
                var $ = cheerio.load(body);
                $('table[border-color="#cccccc"]').each(function(i, element) { // post elements
                  var post = {};
                  post.phone = topic.phone;
                  post.topic = {};
                  post.topic.key = topic.key;
                  post.topic.providerKey = topic.providerKey;
                  post.topic.section = topic.section;
                  post.topic.url = topic.url;
                  post.topic.pageLast = {};
                  post.topic.pageLast.url = topic.pageLast.url;
//console.warn('response.headers:', response.headers['last-modified']);
                  post.topic.pageLast.lastModified = response.headers['last-modified'];
                  post.topic.title = topic.title;
                  /*
                  post.topic.author = {};
                  post.topic.author.name = topic.author.name ? topic.author.name : that.UNKNOWN_ENTITY;
                  post.topic.author.url = topic.author.url ? topic.author.url : that.UNKNOWN_ENTITY;
                  */
                  post.topic.date = topic.date;
                  //log.error('GF post topic date:', post.topic.date);

                  var postHtml = $(element).html();
            
                  post.title = $(element).find('div[id^="subject_"]').find('a').html(); // post title
if (typeof post.title === 'undefined' || post.title === null) {
  log.warn('post with null title - object:', post);
  log.warn('post with null title - html:', postHtml);
}
                  post.author = {};
                  post.author.name = $(element).find('a[title^="View the profile of "]').text(); // post author name regex
    
                  var authorHtml = $(element).find('span[class="smalltext"]').html();
            
                  var authorKarmaRE = /Karma:\s*(.*?)\s*<br>/; // post author karma regex
                  post.author.karma = authorKarmaRE.exec(authorHtml);
                  post.author.karma = post.author.karma && post.author.karma.length >= 1 ? post.author.karma[1] : that.UNKNOWN_ENTITY;
    
                  var authorPostsRE = /Posts:\s*(.*?)\s*<br>/; // post author posts count regex
                  post.author.postsCount = authorPostsRE.exec(authorHtml);
                  post.author.postsCount = post.author.postsCount && post.author.postsCount.length >= 1 ? post.author.postsCount[1] : that.UNKNOWN_ENTITY;

                  var dateRE = /&#xAB;\s*<b>(?:.*?)\s*on\:<\/b>\s*(.*?)\s*&#xBB;/; // post date regex
                  post.date = dateRE.exec(postHtml);
                  post.date = (post.date && (post.date.length >= 1)) ? parseDate(post.date[1], that.locale) : that.UNKNOWN_ENTITY;
/*
if (post.date === 'undefined' || post.date === null || post.date.length < 10) {
  log.error('GF post with null date:', post, ' - postHtml:', postHtml);
}
*/
                  // remove quotes of previous post from post
                  var contents = $(element).find('div.post').html();
                  post.contents = parseContents(contents);
    
                  posts.push(post);
                });
                //console.log('posts:', posts);
          
                var last = $('a[name="lastPost"]').next().html();
                //log.info('GF  *** LAST:', last);
                var nextRE = /\[<strong>\d+<\/strong>\].*?<a class="navPages" href="(.*?)".*>/;
                var match = nextRE.exec(last);
                if (match && match[1]) {
//log.info('GF getPosts()', 'next url:', match[1]);
                  var url = match[1];
                  url = decodeHTMLEntities(url); // decode html entities in url
                  topic.nextUrl = url;
                  topic.pageLast.url = url;
                } else {
//log.info('GF getPosts()', 'next url:', 'NULL');
                  topic.nextUrl = null;
                }
//log.info('topic', topic.title, 'next url:', topic.nextUrl);
//topic.nextUrl = null; // DEBUG ONLY: sync only first page!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                callbackWhilst();
              }
            );
          },
          function(err, done) {
//log.debug('topic', topic.title, 'done.');

            callbackTopics(null); // this topic is done, go to next one
          }
        );
      });

    },
    function(err, done) { // all topics are done, call return callback
      //log.info('GF getPosts()', 'done async.each:', posts);
      if (err) {
        return callback(err);
      }
      var postsWithKeys = posts.map(function(post) {
        post.key = crypto.createHash('md5').update(
          post.phone + '|' + post.author.name + '|' + post.date + '|' + post.contents
        ).digest('hex');
        return post;
      });
//log.debug('GF POSTS SUMMMMMMMMMMM (CHECK!):', postsWithKeys);
      callback(null, postsWithKeys);
    }
  );
};

function decodeHTMLEntities(text) {
  var entities = [
    ['apos', '\''],
    ['amp', '&'],
    ['lt', '<'],
    ['gt', '>']
  ];

  for (var i = 0, len = entities.length; i < len; ++i) {
    text = text.replace(new RegExp('&' + entities[i][0] + ';', 'g'), entities[i][1]);
  }
  return text;
}

function parseDate(dateString, locale) { // parse date from custom format to Date()
//log.error('parseDate(): [' + dateString + '],', locale);
  var monthLocales =
  {
    en: {
      January: 1,
      February: 2,
      March: 3,
      April: 4,
      May: 5,
      June: 6,
      July: 7,
      August: 8,
      September: 9,
      October: 10,
      November: 11,
      December: 12,
    },
    it: {
      Gennaio: 1,
      Febbraio: 2,
      Marzo: 3,
      Aprile: 4,
      Maggio: 5,
      Giugno: 6,
      Luglio: 7,
      Agosto: 8,
      Settembre: 9,
      Ottobre: 10,
      Novembre: 11,
      Dicembre: 12,
    },
  };
  var year, month, day, hours, minutes, seconds, ampm;

  var dateStandardRE = /(\d{4}) (\w+) (\d{1,2}), (\d{2}):(\d{2}):(\d{2}) ([ap]m)/;
//log.error('GF parseDate standard dateString:', dateString);
  var dateStandard = dateStandardRE.exec(dateString);
//log.error('GF parseDate standard dateStandard:', dateStandard);
  if (dateStandard !== null) { // source date is in 'Standard' format
    year = parseInt(dateStandard[1]);
    month = dateStandard[2];
//log.error('GF parseDate standard month1:', month);
//log.error('GF parseDate standard month2:', monthLocales[locale][month] - 1);
    month = parseInt(monthLocales[locale][month] - 1);
//log.error('GF parseDate standard month:', month);
    day = parseInt(dateStandard[3]);
    hours = parseInt(dateStandard[4]);
    minutes = parseInt(dateStandard[5]);
    seconds = parseInt(dateStandard[6]);
    ampm = dateStandard[7];
//log.debug('parseDate():', year, month, day, hours, minutes, seconds, ampm);

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
//log.error('GF parseDate standard values:', year, month, day, hours, minutes, seconds);
    return new Date(year, month, day, hours, minutes, seconds); // TODO: TO BE TESTED
  }

  var dateTodayRE = /<strong>Today<\/strong> at (\d\d):(\d\d):(\d\d)/;
  var dateToday = dateTodayRE.exec(dateString);
  if (dateToday !== null) { // source date is in 'Today' format
    var today = new Date();
    year = today.getUTCFullYear();
    month = today.getUTCMonth() + 1;
    day = today.getUTCDate();
    hours = dateToday[1];
    minutes = dateToday[2];
    seconds = dateToday[3];
//log.error('GF parseDate today:', new Date(year, month, day, hours, minutes, seconds));
    return new Date(year, month, day, hours, minutes, seconds); // TODO: TO BE TESTED
  }

  // source date is in unknown format
//log.error('GF parseDate NULL');
  return null;  
}

function parseContents(contents) { // parse contents from contents string
  var contentsQuotesRE = /(.*?)(<div class="quoteheader">.*?<div class="topslice_quote">.*?<a .*?>.*?<\/a>.*?<\/div>.*?<\/div>.*?<blockquote.*?>.*?<\/blockquote>.*?<div class="quotefooter">.*?<div class="botslice_quote">.*?<\/div>.*?<\/div>)(.*)/;
  var quotes = contentsQuotesRE.exec(contents);
  if (quotes) {
    contents = quotes[1] + quotes[3];
  }
  if (contents) {
    contents = contents.replace(/^\s*/, '');
    contents = contents.replace(/\s*$/, '');
    contents = contents.replace(/^(<br>)*/, '');
    contents = contents.replace(/(<br>)*$/, '');
  }
  return contents; 
}

module.exports = GF;
