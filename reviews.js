var request = require('request') // to place http requests
  , cheerio = require('cheerio') // to parse fetched DOM data
  , async = require('async') // to call many async functions in a loop
  , config = require('./api/config') // global configuration
;

exports.searchTopics = function(search, callback) {
  var url = 'http://gnoccaforum.com/escort/search2';
  var origin = 'http://gnoccaforum.com';
  var referer = 'http://gnoccaforum.com/escort/search';
  var resultsPerPage = 15;

  var tagTopic = 'topic_details';

  var options = {
    url: url,
    method: 'POST',
    form: {
      search: search,
      advanced: 1,
      searchtype: 1,
      userspec: '*',
      sort: 'relevance%7Cdesc',
      minage: 0,
      maxage: 9999
    },
    timeout: config.networking.timeout, // number of milliseconds to wait for a server to send response headers before aborting the request
  }

  request(options, function (err, response, body) {
    if (err || response.statusCode !== 200) {
      return callback(new Error('Error on response' + (response ? ' (' + response.statusCode + ')' : '') + ':' + err + ' : ' + body), null);
    }
    //console.log(body);
    var $ = cheerio.load(body);
    var topics = [];

    $('div[class~="'+tagTopic+'"]').each(function (i, element) { // topics loop
      var topic = {};
      //console.log($(element).html());
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

    callback(null, topics);
  })
};

exports.searchPosts = function(topic, callback) {
  var topicUrlStart = topic.url.replace(/\/msg\d+\/.*/, '');

  var posts = [];

  var url = topicUrlStart;

  async.whilst(
    function() { return url !== null; },
    function(callbackWhilst) {
      console.log('REQUESTING');
      request(url, function(err, response, body) {
        if (err || response.statusCode !== 200) {
          return callback(new Error('Error on response' + (response ? ' (' + response.statusCode + ')' : '') + ':' + err + ' : ' + body), null);
        }
        var $ = cheerio.load(body);
        $('table[border-color="#cccccc"]').each(function(i, element) { // post elements
          var post = {};
          post.n = 1 + posts.length;
          var postHtml = $(element).html();
    
          post.author = {};
          post.author.name = $(element).find('a[title^="View the profile of "]').text(); // post author name regex
    
          var authorHtml = $(element).find('span[class="smalltext"]').html();
    
          var authorKarmaRE = /Karma:\s*(.*?)\s*<br>/; // post author karma regex
          post.author.karma = authorKarmaRE.exec(authorHtml)[1];
    
          var authorPostsRE = /Posts:\s*(.*?)\s*<br>/; // post author posts count regex
          post.author.postsCount = authorPostsRE.exec(authorHtml)[1];
    
          var dateRE = /&#xAB;\s*<b>(?:.*?)\s*on\:<\/b>\s*(.*?)\s*&#xBB;/; // post date regex
          post.date = dateRE.exec(postHtml)[1];
    
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
        console.log('posts:', posts);
  
        var last = $('a[name="lastPost"]').next().html();
        //console.log(' *** LAST:', last);
        var nextRE = /\[<strong>\d+<\/strong>\] <a class="navPages" href="(.*?)".*>/g;
        var match = nextRE.exec(last);
        if (match && match[1]) {
          url = match[1];
          //console.log(' QQQQQQQQQ next page url found:', url);
        } else {
          url = null;
          //console.log(' QQQQQQQQQ NO NEXT URL FOUND');
        }
        callbackWhilst();
      });
    },
    function(err, done) {
      //console.log(' ************************** done:', done ? done : '');
      callback(null, posts);
    }
  );
};

exports.searchEscortAdvisorPosts = function(search, callback) {
  var url = 'http://www.escort-advisor.com/ea/Numbers/?num=' + search;
  // TODO: ...

  // NOT FOUND: <div class='light30'>Numero non trovato</div>
};

module.exports = exports;



// test /////////////////////////////////////////////////
var topic = {};
topic.url = 'http://gnoccaforum.com/escort/info-torino-e-provincia-111/una-nuova-e-bella-russa-nastia-(ma-sara-anche-nasty)/msg1326531/#msg1326531';
//topic.url = 'http://gnoccaforum.com/escort/girlescort-torino/italiana-semplice-ma-molto-disponibile/';
//topic.url = 'http://gnoccaforum.com/escort/info-torino-e-provincia-111/scuderia-russe-bollettino/1290/';
exports.searchPosts(topic, function(err, results) {
  if (err) {
    return console.error(err);
  }
  console.log('results.length:', results.length);
});
/////////////////////////////////////////////////////////

/*
//var phone = '3888350421'; // SANDRA
//var phone = '3240810872'; // ANE MARIE
//var phone = '3897876672'; // KSIUSCHA
  var phone = '3426856330'; // GIULIA
exports.searchTopics(phone, function(err, results) {
  if (err) {
    return console.error(err);
  }
  console.log(results);
});
/////////////////////////////////////////////////////////
*/