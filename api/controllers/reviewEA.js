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

/*
exports.getTopics = function(provider, search, callback) {
  var url = 'http://www.escort-advisor.com/ea/Numbers/?num=' + search;
  // TODO: ...

  // NOT FOUND: <div class='light30'>Numero non trovato</div>

callback(null, []);
};

exports.getPosts = function(provider, topics, callback) {
  var url = 'http://www.escort-advisor.com/ea/Numbers/?num=' + search;
  // TODO: ...

  // NOT FOUND: <div class='light30'>Numero non trovato</div>

callback(null, []);
};
*/

exports.getTopics = function(provider, search, callback) {
  var url = provider.url + provider.pathSearch;
  var noNumber = 'Numero non trovato';
  var noReview = 'Nessuna recensione presente per questa Escort';

  console.log('getTopics()', provider.key, 'requesting topics from url:', url);

  // TODO: we currently search only on the first page of topics, but should search also next pages (?)
  request(
    {
      url: url,
      method: 'GET',
      qs: { num: search },
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
//return callback(null, topics);
  //log.info('getPosts:', provider.key);
  var posts = [];
  //var url;

  async.each(
    topics,
    function(topic, callbackTopics) {
      console.log('getPosts()', provider.key, 'scraping topic:', topic.title);

      async.whilst(
        function() { /*console.log('whilst check:', topic.url); */ return topic.url !== null; },
        function(callbackWhilst) {
          console.log('getPosts()', provider.key, 'parsing topic');
          var $ = cheerio.load(topic.body);
          var post = {};
          post.topic = topic.title;
          $('div[class="span2"]').each(function(i, element) { // post elements
            var postHtml = $(element).html();
//console.log('POST 2: [', postHtml, '] ---');
            var postRE = new RegExp([
               /\s*<img.*?>\s*/
              ,/<div.*?>\s*/
              ,/<b>(.*?)<\/b>\s*/ // post.author.name
              ,/<br>\s*/
              ,/<span.*?>.*?\s*/
              ,/<br>\s*/
              ,/<b>(.*?)<\/b>\s*/ // post.author.karma
              ,/<\/div>\s*/
              ,/<div.*?>\s*/
              ,/<img.*?>.*?(\d+)\s*<a.*?>recensioni<\/a>\s*/ // post.author.postsCount
              ,/<\/div>\s*/
              ,/<div.*?>\s*/
              ,/<img.*?>.*?\d+.*?\s*/  // (post.author.votes)
              ,/<\/div>\s*/
              ,/<div.*?>\s*/
              ,/<form.*?>\s*/
              ,/(?:<input.*?>\s*)+/
              ,/<\/form>\s*/
              ,/<\/div>\s*(.*)$/
            ].map(function(r) { return r.source; }).join(''));
            var match = postRE.exec(postHtml);
            if (match) {
              post.author = {};
              post.author.name = match[1];
              post.author.karma = match[2];
              post.author.postsCount = match[3];
            }
          });
          $('div[class="span7"]').each(function(i, element) { // post elements
            var postHtml = $(element).html();
//console.log('POST 7: [', postHtml, '] ---');
            var postRE = new RegExp([
               /<span.*?>&quot;(.*?)&quot;<\/span>.*?\s*/
              ,/<div.*?>\s*/
              ,/<img.*?>\s*/
              ,/<\/div>\s*/
              ,/<div.*?>Recensione del:\s*(.*?)<\/div>\s*/ // post.date
              ,/<div.*?><\/div>\s*/
              ,/<div>(.*?)<\/div>\s*/
              ,/<!-- dati aggiuntivi - inizio -->\s*/
              ,/<div><\/div>\s*/
              ,/<div class="toggle">\s*/
              ,/<br>\s*/
              ,/.*?/
              ,/<br>\s*/
              ,/.*?/
              ,/<br>\s*/
              ,/.*?/
              ,/<br>\s*/
              ,/.*?/
              ,/<br>\s*/
              ,/<!--.*?-->\s*/
              ,/<br>\s*/
              ,/<b>Costo:<\/b>\s*/
              ,/<!--.*?-->\s*/
              ,/<!--.*?-->\s*/
              ,/<span>/
              ,/\s*/
              ,/(<img src="\/ea\/img\/euro\.png">)?\s*/
              ,/(<img src="\/ea\/img\/euro\.png">)?\s*/
              ,/(<img src="\/ea\/img\/euro\.png">)?\s*/
              ,/(<img src="\/ea\/img\/euro\.png">)?\s*/
              ,/(<img src="\/ea\/img\/euro\.png">)?\s*/
              ,/<br>\s*/
              ,/(?:&.*<br>\s*)+/
              ,/(?:&.*0\s*)+/
              ,/<\/span>\s*/
              ,/<br><br>\s*/
              ,/<b>Qualit&.*?; personali.*<br>\s*/
              ,/<span.*?>Bellezza<\/span><img src="\/ea\/img\/(\d+)-star\.png".*?><br>\s*/
              ,/<span.*?>Prestazioni Sessuali<\/span><img src="\/ea\/img\/(\d+)-star\.png".*?><br>\s*/
              ,/<span.*?>Simpatia<\/span><img src="\/ea\/img\/(\d+)-star\.png".*?><br>\s*/
              ,/<span.*?>Pulizia<\/span><img src="\/ea\/img\/(\d+)-star\.png".*?><br>\s*/
              ,/<div.*?><\/div><br>\s*/
              ,/<b>Ambiente:<\/b><br>\s*/
              ,/<span.*?>Qualit&.*;<\/span><img src="\/ea\/img\/(\d+)-star.png".*?><br>\s*/
              ,/<span.*?>Pulizia<\/span><img src="\/ea\/img\/(\d+)-star.png".*?><br>\s*/
              ,/<span.*?>Raggiungibilit&.*?<\/span><img src="\/ea\/img\/(\d+)-star.png".*?><br>\s*/
            ].map(function(r) { return r.source; }).join(''));
            var match = postRE.exec(postHtml);
            if (match) {
              post.title = match[1];
              post.date = parseDate(match[2]); // post date format is dd/mm/yyyy
              post.contents = match[3];
              post.contents = post.contents.replace(/^\s*/, '');
              post.contents = post.contents.replace(/\s*$/, '');
              post.contents = post.contents.replace(/^(<br>)*/, '');
              post.contents = post.contents.replace(/(<br>)*$/, '');
              post.cost = parseCost([ match[4], match[5], match[6], match[7], match[8] ]);
              post.beauty = match[9];
              post.attitude = match[10];
              post.sympathy = match[11];
              post.cleanliness = match[12];
              post.site = {};
              post.site.quality = match[13];
              post.site.cleanliness = match[14];
              post.site.reachability = match[15];
            }
            posts.push(post);
//console.log('pushed post:', post, 'to posts, which are now long', posts.length);
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
      //console.log('getPosts()', 'done async.each');
      callback(null, posts);
    }
  );
};

function parseDate(ddmmyyyy) { // parse date from format dd/mm/yyyy to Date()
  return new Date(ddmmyyyy);
}


function parseCost(costs) { // parse costs from array to value in €
  if (typeof(costs[4]) !== 'undefined') {
  	return '€ 500+';
  }
  if (typeof(costs[3]) !== 'undefined') {
  	return '€ 200-500';
  }
  if (typeof(costs[2]) !== 'undefined') {
  	return '€ 100-200';
  }
  if (typeof(costs[1]) !== 'undefined') {
  	return '€ 50-100';
  }
  if (typeof(costs[0]) !== 'undefined') {
  	return '€ 0-50';
  }
  return 'unknown';
}