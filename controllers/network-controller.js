var
  request = require('requestretry'); // to place http requests and retry if needed
  //request = require('request'), // to place http requests
  randomUseragent = require('random-useragent'), // to use a random user-agent
  agent = require('socks5-http-client/lib/Agent'), // to be able to proxy requests
  config = require('../config') // global configuration
;
var exports = {};

/**
 * fetches url contents, stubbornly and securely
 */
exports.sfetch = function(url, provider, error, success) {
  var options = {
    url: url,
    maxAttempts: 2, // retry for 3 attempts
    retryDelay: 15 * 1000, // wait for 10 seconds before trying again
    retryStrategy: retryStrategyForbidden, // retry strategy: retry if forbidden status code returned
    headers: {
     'User-Agent': randomUseragent.getRandom(), // use random UA
    },
  };
  if (config.mode !== 'fake') { // not fake, use TOR
    options.agentClass = agent;
    options.agentOptions = { // TOR socks host/port
      socksHost: config.tor.host,
      socksPort: config.tor.port,
    };
  }

  request(
  	options,
  	function (err, response, contents) {
      if (err) {
        console.error('error in sfetch(request()) callback:', err);
        return error(err);
      }
      success(contents);
    },
    // requestretry wants these as 3rd and 4th params of request() call...
    options.maxAttempts,
    options.retryDelay
  );

  // request retry strategies

  /**
   * @param  {Null | Object} err
   * @param  {Object} response
   * @return {Boolean} true if the request should be retried
   */
  function retryStrategyForbidden(err, response, retry) {
    var providerForbiddenRegexp = new RegExp(
      provider.forbiddenRegexp.body,
      provider.forbiddenRegexp.flags
    );
//console.log('RESPONSE:', response);
//console.log('RESPONSE.statusCode:', response.statusCode);
    /*
     * retry the request if the response was a 403 one (forbidden),
     * or if response was 200 (success), but content contain a forbidden message
     */
    var forbidden =
      response && (
        (response.statusCode == 403) || // 403 status code (forbidden)
        ( // probably 'providerForbiddenRegexp' arrives with statusCode = 403, so this is not useful...
          (response.statusCode == 200) && // 200 status code (success)
          (response.body.match(providerForbiddenRegexp)) // body matches 'forbidden' warning
        )
      )
    ;
    if (forbidden) {
    	console.warn('request for url [', url, '] was forbidden; will retry...');
    }
    return forbidden;
  }

}

module.exports = exports;