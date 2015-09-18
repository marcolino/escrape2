var
  request = require('request'), // to request external data
  randomUseragent = require('random-useragent'), // to use a random user-agent
  agent = require('socks5-http-client/lib/Agent'), // to be able to proxy requests
  config = require('../config') // global configuration
;
var exports = {};

/**
 * fetch url contents, securely
 */
exports.sfetch = function(url, error, success) {
  var options = {
    url: url,
  };
  if (!config.fake) { // not fake, use TOR
    options.agentClass = agent;
    options.agentOptions = {
      socksHost: config.tor.host,
      socksPort: config.tor.port,
    };
    options.headers = {
      'User-Agent': randomUseragent.getRandom(),
    };
  }
  request(options, function(err, response, contents) {
    if (err) {
      error(err);
    } else {
      if (response.statusCode !== 200) {
      	// TODO: test this...
        var err = new Error('Request error');
        err.status = response.statusCode;
        error(err);
      } else {
        //console.log('sfetch() response sontents:', contents);
        return success(contents);
      }
    }
  });
}

module.exports = exports;