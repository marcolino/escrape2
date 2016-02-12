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

exports.getTopics = function(provider, search, callback) {
  var url = provider.url + provider.pathSearch;
  console.log('getTopics()', provider.key, 'requesting topics from url:', url);

  // TODO: we currently search only on the first page of topics, but should search also next pages (?)
  request(
    {
      url: url,
      method: 'POST',
      form: { search: search },
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
        //console.log($(element).html());
        topic.providerKey = provider.key;
        topic.body = null; // this driver doesn't use topic body
        topic.counter = $(element).find('div[class^="counter"]').text();
        topic.section = $(element).find('a').eq(0).text();
        topic.url = $(element).find('a').eq(1).attr('href');
        topic.title = $(element).find('a').eq(1).text();
        topic.author = {};
        topic.author.name = $(element).find('a').eq(2).text();
        topic.author.url = $(element).find('a').eq(2).attr('href');
        topic.dateOfCreation = $(element).find('em').text().trim();
        topics.push(topic);
      });
      console.log('getTopics()', provider.key, 'found', topics.length, 'topics');
      callback(null, topics);
    }
  );
};

exports.getPosts = function(provider, topics, callback) {
  //log.info('getPosts:', provider.key);
  var posts = [];
  //var url;

  async.each(
    topics,
    function(topic, callbackTopics) {
      console.log('getPosts()', provider.key, 'scraping topic:', topic.title);

      async.whilst(
        function() { console.log('whilst check:', topic.url); return topic.url !== null; },
        function(callbackWhilst) {
          //if (!topic.url) {
            topic.url = topic.url.replace(/\/msg\d+\/.*/, ''); // transform specific post url to topic base url
            console.log('getPosts()', provider.key, 'url was undefinened, set to:', topic.url);
          //}
          console.log('getPosts()', provider.key, 'requesting url:', topic.url);
          request(topic.url, function(err, response, body) {
            if (err || response.statusCode !== 200) {
              return callback(new Error('error on response' + (response ? ' (' + response.statusCode + ')' : '') + ':' + err + ' : ' + body), null);
            }
            var $ = cheerio.load(body);
            $('table[border-color="#cccccc"]').each(function(i, element) { // post elements
              var post = {};
              post.topic = topic.title;
              var postHtml = $(element).html();
        
              post.author = {};
              post.author.name = $(element).find('a[title^="View the profile of "]').text(); // post author name regex
              console.log('getPosts()', provider.key, 'author post:', post.author.name ? post.author.name : 'guest');
        
              var authorHtml = $(element).find('span[class="smalltext"]').html();
        
              var authorKarmaRE = /Karma:\s*(.*?)\s*<br>/; // post author karma regex
              post.author.karma = authorKarmaRE.exec(authorHtml);
              post.author.karma = post.author.karma && post.author.karma.length >= 1 ? post.author.karma[1] : null;

              var authorPostsRE = /Posts:\s*(.*?)\s*<br>/; // post author posts count regex
              post.author.postsCount = authorPostsRE.exec(authorHtml);
              post.author.postsCount = post.author.postsCount && post.author.postsCount.length >= 1 ? post.author.postsCount[1] : null;
        
              var dateRE = /&#xAB;\s*<b>(?:.*?)\s*on\:<\/b>\s*(.*?)\s*&#xBB;/; // post date regex
              post.date = dateRE.exec(postHtml);
              post.date = post.date && post.date.length >= 1 ? post.date[1] : null;
        
              // remove quotes of previous post from post
              var contents = $(element).find('div.post').html();
              var contentsQuotesRE = /(.*?)(<div class="quoteheader"><div class="topslice_quote"><a .*?>.*?<\/a><\/div><\/div><blockquote.*?>.*?<\/blockquote><div class="quotefooter"><div class="botslice_quote"><\/div><\/div>)(.*)/;
              var quotes = contentsQuotesRE.exec(contents);
              if (quotes) {
                contents = quotes[1] + quotes[3];
              }
              contents = contents.replace(/^\s*/, '');
              contents = contents.replace(/\s*$/, '');
              contents = contents.replace(/^(<br>)*/, '');
              contents = contents.replace(/(<br>)*$/, '');
              post.contents = contents; 
        
              posts.push(post);
            });
            //console.log('posts:', posts);
      
            var last = $('a[name="lastPost"]').next().html();
            //console.log(' *** LAST:', last);
            var nextRE = /\[<strong>\d+<\/strong>\] <a class="navPages" href="(.*?)".*>/g;
            var match = nextRE.exec(last);
            if (match && match[1]) {
              console.log('getPosts()', 'next url:', match[1]);
              topic.url = match[1];
            } else {
              topic.url = null;
            }
            callbackWhilst();
          });
        },
        function(err, done) {
          console.log('getPosts()', 'done async.whilst');
          callbackTopics(null); // this topic is done, go to next one
        }
      );

    },
    function(err, done) { // all topics are done, call return callback
      console.log('getPosts()', 'done async.each');
      callback(null, posts);
    }
  );
};

module.exports = exports;
