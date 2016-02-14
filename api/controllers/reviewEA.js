'use strict';

var mongoose = require('mongoose') // mongo abstraction
  , request = require('request') // to place http requests
  , cheerio = require('cheerio') // to parse fetched DOM data
  , async = require('async') // to call many async functions in a loop
  , Provider = require('../models/provider') // model of provider
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

exports.getTopics = function(provider, phone, callback) {
  var url = provider.url + provider.pathSearch;
  var noNumber = 'Numero non trovato';
  var noReview = 'Nessuna recensione presente per questa Escort';

  console.log('getTopics()', provider.key, 'requesting topics from url:', url);

  // TODO: we currently search only on the first page of topics, but should we search also next pages? (non found a single page with continuation...)
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
      //var $ = cheerio.load(body);
      var topics = [];
      //console.log(body);
      var noNumberRE = new RegExp(noNumber, 'g');
      var noReviewRE = new RegExp(noReview, 'g');
      if (body.match(noNumberRE) || body.match(noReviewRE)) {
        //console.log('getTopics()', provider.key, 'NUMERO NON TROVATO o NESSUNA RECENSIONE TROVATA');
      } else {
      	//console.log('getTopics()', provider.key, 'NUMERO TROVATO');
        var topic = {};
        topic.phone = phone;
        topic.providerKey = provider.key;
        topic.body = body;
        topic.counter = 1;
        topic.section = 'EA topic section';
        topic.url = url;
        topic.title = 'EA topic title';
        topic.author = {};
        topic.author.name = 'EA topic author';
        topic.author.url = 'EA author url';
        topic.dateOfCreation = 'EA date of creation';
        topics.push(topic);
        console.log('getTopics()', provider.key, 'found', topics.length, 'topics');
      }
      callback(null, topics);
    }
  );
};

exports.getPosts = function(provider, topics, callback) {
  var postsHead = [];
  var postsBody = [];
  var posts = [];

  async.each(
    topics,
    function(topic, callbackTopics) {
      console.log('getPosts()', provider.key, 'scraping topic:', topic.title);

      async.whilst(
        function() { return topic.url !== null; },
        function(callbackWhilst) {
          console.log('getPosts()', provider.key, 'parsing topic');
          var $ = cheerio.load(topic.body);
          $('div[class="span2"]').each(function(i, element) { // post elements
            var post = {};
            post.phone = topic.phone;
            post.topic = topic.title;
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
            if (match) {
              post.author = {};
              post.author.name = match[1];
              post.author.karma = match[2];
              post.author.postsCount = match[3];
            }
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
            if (match) {
              post.title = match[1];
              post.date = parseDate(match[2]); // post date format is dd/mm/yyyy
              post.contents = match[3];
              if (post.contents) {
                post.contents = post.contents.replace(/\t/g, '<br>');
                post.contents = post.contents.replace(/^\s*/, '');
                post.contents = post.contents.replace(/\s*$/, '');
                post.contents = post.contents.replace(/^(<br>)*/, '');
                post.contents = post.contents.replace(/(<br>)*$/, '');
                post.contents = post.contents.replace(/^\s*/, '');
                post.contents = post.contents.replace(/\s*$/, '');
              }
              post.cost = parseCost(match[4]);
              post.beauty = parse5Stars(match[5]);
              post.performance = parse5Stars(match[6]);
              post.sympathy = parse5Stars(match[7]);
              post.cleanliness = parse5Stars(match[8]);
              post.site = {};
              post.site.quality = match[9];
              post.site.cleanliness = match[10];
              post.site.reachability = match[11];
              postsBody.push(post);
            }
          });
      
          // no pagination on this provider
          topic.url = null;
          callbackWhilst();
        },
        function(err, done) {
          //console.log('getPosts()', 'done async.whilst');
          callbackTopics(null); // this topic is done, go to next one
        }
      );

    },
    function(err, done) { // all topics are done, call return callback
//console.log('getPosts()', 'done async.each - postsHead: ', postsHead, '\n\n\n - postsBody:', postsBody);
//console.log('getPosts()', 'done async.each - posts:', posts);
//console.log('getPosts()', 'done async.each - posts:', mergeArraysOfObjects(postsHead, postsBody));
      callback(null, mergeArraysOfObjects(postsHead, postsBody));
    }
  );
};

function mergeArraysOfObjects(a1, a2) {
  var a = [];
  var i, prop;
  for (i in a1) {
    a[i] = {};
    for (prop in a1[i]) {
      if (!a[i].hasOwnProperty(prop)) {
        a[i][prop] = a1[i][prop];
      }
    }
  }
  for (i in a2) {
    for (prop in a2[i]) {
      if (!a[i].hasOwnProperty(prop)) {
        a[i][prop] = a2[i][prop];
      }
    }
  }
  return a;
}

function parseDate(ddmmyyyy) { // parse date from format dd/mm/yyyy to Date()
  var DMY = ddmmyyyy.split('/');
  return new Date(DMY[2], DMY[1], DMY[0]);
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
