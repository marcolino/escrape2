var
  request = require('requestretry'); // to place http requests and retry if needed
  //request = require('request'), // to place http requests
  randomUseragent = require('random-useragent'), // to use a random user-agent
  agent = require('socks5-http-client/lib/Agent'), // to be able to proxy requests
  config = require('../config') // global configuration
;
var exports = {};

/**
 * fetches url contents, stubbrnly and securely
 */
exports.sfetch = function(url, error, success) {
  const retriesMax = 3; // maximum number of retries
  const retriesTimeout = 45 * 1000; // time to sleep between retries (milliseconds)

  var options = {
    url: url,
    maxAttempts: 3, // retry for 3 attempts
    retryDelay: 45 * 1000, // wait for 10 seconds before trying again
    retryStrategy: retryStrategyForbidden, // retry strategy: retry if forbidden status code returned
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

  request(
  	options,
/*
    {
      maxAttempts: 3, // retry for 3 attempts
      retryDelay: 45 * 1000, // wait for 10 seconds before trying again
      retryStrategy: retryStrategyForbidden, // retry strategy: retry if forbidden status code returned
    },
*/
  	function (err, response, contents) {
      if (err) {
        return error(err);
      }
      success(contents);
    }
/*
      , {
      retries: 3, // the maximum amount of times to retry the operation
      factor: 2, // the exponential factor to use
      minTimeout: 3 * 1000, // the amount of time before starting the first retry
      maxTimeout: 36 * 1000, // the maximum amount of time between two retries
      randomize: true, // randomizes the timeouts by multiplying with a factor between 1 to 2
    })
    .on('replay', function (replay) {
      console.log('request failed: ' + replay.error.code + ' ' + replay.error.message);
      console.log('replay nr: #' + replay.number);
      console.log('will retry in: ' + replay.delay + 'ms');
    }
  );
*/
  );

/**
 * @param  {Null | Object} err
 * @param  {Object} response
 * @return {Boolean} true if the request should be retried
 */
function retryStrategyForbidden(err, response, retry) {
  // retry the request if the response was a 400-499 one (forbidden)
  var forbidden = response && 400 <= response.statusCode && response.statusCode < 500;
  if (forbidden) {
  	console.warn('request for url [', url, '] was forbidden; will retry...');
  }
  return forbidden;
}

}

module.exports = exports;