var request = require('request')
  , cheerio = require('cheerio')
  , querystring = require('querystring')
  //, util = require('util')
  , randomUseragent = require('random-ua') // to use a random user-agent
  , agent = require('socks5-http-client/lib/Agent') // to be able to proxy requests
  , config = require('./api/config') // global configuration
;

exports.searchTopics = function(search, callback) {
  var url = 'http://gnoccaforum.com/escort/search2';
  var origin = 'http://gnoccaforum.com';
  var referer = 'http://gnoccaforum.com/escort/search';
  var resultsPerPage = 15;

  var tagTopic = 'topic_details';

  var requestOptions = {
    url: url,
    method: 'POST',
/*
    headers: {
      'Origin': 'http://gnoccaforum.com',
      'Accept-Language': 'en-US,en;q=0.8,it;q=0.6',
      'Upgrade-Insecure-Requests': 1,
      'User-Agent': randomUseragent.generate(), // user agent: pick a random one
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,* /*;q=0.8',
      'Cache-Control': 'max-age=0',
      'Referer': 'http://gnoccaforum.com/escort/search',
      'Connection': 'keep-alive',
    },
*/
/*
    agentClass: config.tor.available ? agent : null, // socks5-http-client/lib/Agent
    agentOptions: { // TOR socks host/port
      socksHost: config.tor.available ? config.tor.host : null, // TOR socks host
      socksPort: config.tor.available ? config.tor.port : null, // TOR socks port
    },
*/
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

  request(requestOptions, function (err, response, body) {
    if ((err == null) && response.statusCode === 200) {
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
      })
      callback(null, topics);
    } else {
      callback(new Error('Error on response' + (response ? ' (' + response.statusCode + ')' : '') + ':' + err + ' : ' + body), null);
    }
  })
};

exports.searchPosts = function(topic, callback) {
  var topicUrlStart = topic.url.replace(/\/msg\d+\.*/, null);
  // TODO: ...
};

exports.searchEscortAdvisorPosts = function(search, callback) {
  var url = 'http://www.escort-advisor.com/ea/Numbers/?num=' + search;
  // TODO: ...
};

module.exports = exports;

// test /////////////////////////////////////////////////
//var phone = '3888350421'; // SANDRA
//var phone = '3240810872'; // ANE MARIE
  var phone = '3897876672'; // KSIUSCHA
//var phone = '3426856330'; // GIULIA
exports.searchTopics(phone, function(err, results) {
  if (err) {
    return console.error(err);
  }
  console.log(results);
});
/////////////////////////////////////////////////////////
