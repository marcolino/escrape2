var request = require('request');
var cheerio = require('cheerio');
var random_useragent = require('random-useragent');
var Agent = require('socks5-http-client/lib/Agent');

var setup = {
  local: false,
  debug: true,
  category: 'females',
  city: 'torino',
  tor: {
    host: 'localhost',
    port: 9050,
  },
};

get('http://www.sexyguidaitalia.com/escort/torino',
  function(error) {
    console.error(error);
  },
  function(contents) {
    console.info(contents);
  }
);
function get(url, error, success) {
  var options = {
    url: url,
    agentClass: Agent,
    agentOptions: {
      socksHost: setup.tor.host,
      socksPort: setup.tor.port,
    },
    headers: {
      'User-Agent': random_useragent.getRandom(),
    }
  };
  
  request(options, function (error, response, contents) {
    if (error) {
      console.error('Status code:', error);
      error(error);
    }
    if (response.statusCode !== 200) {
      console.error('Status code:', response.statusCode);
      error(error);
    }
    //console.info(contents);
    return success(contents);
  });
}