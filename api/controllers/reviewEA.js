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
  var noNumber = 'Numero non trovato';
  var noReview = 'Nessuna recensione presente per quest';

  // TODO: we currently search only on the first page of topics, but should we search also next pages? (not found yet a single page with continuation...)
log.info('EA getTopics()', provider.key, 'requesting topics from url:', url, 'phone:', phone);
  request(
    {
      url: url,
      method: 'GET',
      encoding: 'binary',
      qs: { num: phone },
      timeout: config.networking.timeout, // number of milliseconds to wait for a server to send response headers before aborting the request
    },
    function (err, response, body) {
      if (err || response.statusCode !== 200) {
        return callback(new Error('error on response' + (response ? ' (' + response.statusCode + ')' : '') + ':' + err + ' : ' + body), null);
      }
      var topics = [];
      var noNumberRE = new RegExp(noNumber, 'g');
      var noReviewRE = new RegExp(noReview, 'g');
      if (!(body.match(noNumberRE) || body.match(noReviewRE))) {
        var topic = {};
        topic.phone = phone;
        topic.providerKey = provider.key;
        topic.body = body;
        topic.section = provider.key + ' reviews';
        topic.url = url;
        topic.pageLast = {};
        topic.pageLast.url = url;
        topic.pageLast.etag = response.headers.etag;
        topic.title = 'Review about ' + phone;
        topic.author = {};
        topic.author.name = provider.key;
        topic.author.url = provider.url;
        topic.date = null; // will be set to the date of first post
        topics.push(topic);
      }
      console.log('getTopics()', provider.key, 'found', topics.length, 'topics');
      callback(null, topics);
    }
  );
};

exports.getPosts = function(provider, topics, callback) {
log.info('EA getPosts:', provider.key);
  var postsHead = [];
  var postsBody = [];
  var posts = [];

  async.each(
    topics,
    function(topic, callbackTopics) {
      log.info('EA getPosts()', provider.key, 'scraping topic:', topic.title);

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
          topic.url = topic.url; // keep topic url unchanged
          topic.etag = null; // don't set etag

        }

        async.whilst(
          function() { return topic.url !== null; },
          function(callbackWhilst) {
            log.info('EA getPosts()', provider.key, 'parsing topic');
            var $ = cheerio.load(topic.body);
            $('div[class="span2"]').each(function(i, element) { // post elements
              var post = {};
              post.phone = topic.phone;
              post.topic = {};
              post.topic.providerKey = topic.providerKey;
              post.topic.section = topic.section;
              post.topic.url = topic.url;
              post.topic.title = topic.title;
              post.topic.author = {};
              post.topic.author.name = topic.author.name;
              post.topic.author.url = topic.author.url;
  
              var postHtml = $(element).html().replace(/\r?\n|\r/g, '\t'); // change all newlines to space to have a one line string
              var postRE = new RegExp(
                '\\s*<img.*?>\\s*' +
                '<div.*?>\\s*' +
                '<b>(.*?)<\\/b>\\s*' + // post.author.name
                '<br>\\s*' +
                '<span.*?>.*?\\s*' +
                '<br>\\s*' +
                '<b>(.*?)<\\/b>\\s*' + // post.author.karma
                '<\\/div>\\s*' +
                '<div.*?>\\s*' +
                '<img.*?>.*?(\\d+)\\s*<a.*?>recensioni<\\/a>\\s*' + // post.author.postsCount
                '<\\/div>\\s*' +
                '<div.*?>\\s*' +
                '<img.*?>.*?\\d+.*?\\s*' + // (post.author.votes)
                ''
              );
              var match = postRE.exec(postHtml);
              post.author = {};
              post.author.name = match && match[1] ? parseAuthorName(match[1]) : UNKNOWN_ENTITY;
              post.author.karma = match && match[2] ? parseAuthorKarma(match[2]) : UNKNOWN_ENTITY;
              post.author.postsCount = match && match[3] ? parseAuthorPostsCount(match[3]) : UNKNOWN_ENTITY;
              postsHead.push(post);
            });
  
            $('div[class="span7"]').each(function(i, element) { // post elements
              var post = {};
              var postHtml = $(element).html().replace(/\r?\n|\r/g, '\t'); // change all newlines to space to have a one line string
              var postRE = new RegExp(
                '<span.*?>&quot;(.*?)&quot;<\\/span>.*?\\s*' + // post.title
                '<div.*?>\\s*' +
                '<img.*?>\\s*' +
                '<\\/div>\\s*' +
                '<div.*?>Recensione del:\\s*(.*?)<\\/div>\\s*' + // post.date
                '<div.*?><\\/div>\\s*' +
                '<div>(.*?)<\\/div>\\s*' + // post.contents
                '<!-- dati aggiuntivi - inizio -->\\s*' +
                '<div><\\/div>\\s*' +
                '<div class="toggle">\\s*' +
                '<br>\\s*' +
                '.*?' +
                '<br>\\s*' +
                '.*?' +
                '<br>\\s*' +
                '.*?' +
                '<br>\\s*' +
                '.*?' +
                '<br>\\s*' +
                '<!--.*?-->\\s*' +
                '<br>\\s*' +
                '<b>Costo:<\\/b>\\s*' +
                '<!--.*?-->\\s*' +
                '<!--.*?-->\\s*' +
                '<span>' +
                '\\s*' +
                '((?:<img src=".*?">\\s*)*)' + // post.cost
                '<br>\\s*' +
                '(?:&.*<br>\\s*)+' +
                '(?:&.*0\\s*)+' +
                '<\\/span>\\s*' +
                '<br><br>\\s*' +
                '<b>Qualit&.*?; personali.*<br>\\s*' +
                '<span.*?>Bellezza<\\/span><img src=".*?\\/img\\/(\\d+)-star.*?".*?><br>\\s*' + // post.beauty
                '<span.*?>Prestazioni Sessuali<\\/span><img src="\\/ea\\/img\\/(\\d+)-star\\.png".*?><br>\\s*' + // post.performance
                '<span.*?>Simpatia<\\/span><img src="\\/ea\\/img\\/(\\d+)-star\\.png".*?><br>\\s*' + // post.sympathy
                '<span.*?>Pulizia<\\/span><img src="\\/ea\\/img\\/(\\d+)-star\\.png".*?><br>\\s*' + // post.cleanliness
                '<div.*?><\\/div><br>\\s*' +
                '<b>Ambiente:<\\/b><br>\\s*' +
                '<span.*?>Qualit&.*;<\\/span><img src="\\/ea\\/img\\/(\\d+)-star.png".*?><br>\\s*' + // post.site.quality
                '<span.*?>Pulizia<\\/span><img src="\\/ea\\/img\\/(\\d+)-star.png".*?><br>\\s*' + // post.site.cleanliness
                '<span.*?>Raggiungibilit&.*?<\\/span><img src="\\/ea\\/img\\/(\\d+)-star.png".*?><br>\\s*' + // post.reachability
                ''
              );
              var match = postRE.exec(postHtml);
              post.title = match && match[1] ? parseTitle(match[1]) : UNKNOWN_ENTITY;
              post.date = match && match[2] ? parseDate(match[2]) : UNKNOWN_ENTITY; // post date format is dd/mm/yyyy
//log.debug('postsBody.length: *************', postsBody.length);
              // set topic date as the date of the first post
              post.topic = {};
              if (postsBody.length === 0) {
                post.topic.date = post.date;
//log.debug('post.topic.date: *************', post.topic.date);
              } else {
                post.topic.date = postsBody[0].topic.date;
              }
              post.contents = match && match[3] ? parseContents(match[3]) : UNKNOWN_ENTITY;
              post.cost = match && match[4] ? parseCost(match[4]) : UNKNOWN_ENTITY;
              post.beauty = match && match[5] ? parse5Stars(match[5]) : UNKNOWN_ENTITY;
              post.performance = match && match[6] ? parse5Stars(match[6]) : UNKNOWN_ENTITY;
              post.sympathy = match && match[7] ? parse5Stars(match[7]) : UNKNOWN_ENTITY;
              post.cleanliness = match && match[8] ? parse5Stars(match[8]) : UNKNOWN_ENTITY;
              post.location = {};
              post.location.quality = match && match[9] ? match[9] : UNKNOWN_ENTITY;
              post.location.cleanliness = match && match[10] ? match[10] : UNKNOWN_ENTITY;
              post.location.reachability = match && match[11] ? match[11] : UNKNOWN_ENTITY;
              postsBody.push(post);
            });
        
            topic.url = null; // no continuation pages for this provider
            callbackWhilst();
          },
          function(err, done) {
            //log.info('getPosts()', 'EA done async.whilst');
            callbackTopics(null); // this topic is done, go to next one
          }
        );
      });

    },
    function(err, done) { // all topics are done, call return callback
      // TODO: safety check, this should not happen, remove in production (?)
      if (postsHead.length !== postsBody.length) {
        return callback(new Error('...'));
      }
      // merge posts headers and posts bodyes
log.debug('EA POSTS HEAD (CHECK!):', postsHead);
log.debug('EA POSTS BODY (CHECK!):', postsBody);
      var postsWithoutKeys = mergeArraysOfObjects(postsHead, postsBody);
log.debug('EA postsWithoutKeys (CHECK!):', postsWithoutKeys);
      // create keys for posts
      var posts = postsWithoutKeys.map(function(post) {
        post.key = crypto.createHash('md5').update(
          post.phone + '|' + post.author.name + '|' + post.date + '|' + post.contents
        ).digest('hex');
        return post;
      });
log.debug('EA POSTS SUMMMMMMMMMMM (CHECK!):', posts);
      callback(null, posts);
    }
  );
};

function mergeArraysOfObjects(a1, a2) {
  var a = [];  
  for (var i = 0; i < a1.length; i++) {
    a[i] = mergeObjects(a1[i], a2[i]);
  }
  return a;
}

function mergeObjects(obj1, obj2) {
  for (var p in obj2) {
    try {
      // property in destination object set; update its value
      if (obj2[p].constructor == Object) {
        obj1[p] = mergeObjects(obj1[p], obj2[p]);
      } else {
        obj1[p] = obj2[p];
      }
    } catch(e) {
      // property in destination object not set; create it and set its value
      obj1[p] = obj2[p];
    }
  }
  return obj1;
}

function parseAuthorName(authorName) {
  return authorName;
}

function parseAuthorKarma(authorKarma) {
  return authorKarma;
}

function parseAuthorPostsCount(authorPostsCount) {
  return authorPostsCount;
}

function parseDate(ddmmyyyy) { // parse date from format dd/mm/yyyy to Date()
  var DMY = ddmmyyyy.split('/');
  return new Date(DMY[2], DMY[1], DMY[0]);
}

function parseTitle(title) { // parse title from string title
  return title;
}

function parseContents(contents) { // parse contents from contents string
  if (contents) {
    contents = contents.replace(/\t/g, '<br>');
    contents = contents.replace(/^\s*/, '');
    contents = contents.replace(/\s*$/, '');
    contents = contents.replace(/^(<br>)*/, '');
    contents = contents.replace(/(<br>)*$/, '');
    contents = contents.replace(/^\s*/, '');
    contents = contents.replace(/\s*$/, '');
  }
  return contents;
}

function parseCost(costs) { // parse costs from string to value in €
  var cost = (costs.match(/<img/g) || []).length;
  switch(cost) {
    case 0:
      return undefined;
    case 1:
      return '€ 0-50';
    case 2:
      return '€ 50-100';
    case 3:
      return '€ 100-200';
    case 4:
      return '€ 200-500';
    case 5:
      return '€ 500+';
    default:
      return undefined;
  }
}

function parse5Stars(starsCount) { // parse value from integer [1-5] to value in [0-1]
  return starsCount / 5; 
}
