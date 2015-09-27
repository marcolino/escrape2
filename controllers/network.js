var request = require('requestretry') // to place http requests and retry if needed
  , randomUseragent = require('random-useragent') // to use a random user-agent
  , agent = require('socks5-http-client/lib/Agent') // to be able to proxy requests
  , config = require('../config'); // global configuration

/**
 * requests url contents, retrying and anonymously
 */
exports.requestRetryAnonymous = function(url, provider, error, success) {
  var options = {
    url: url,
    maxAttempts: 2, // retry for 2 attempts more after the first one
    retryDelay: 10 * 1000, // wait for 1' 30" before trying again
    retryStrategy: retryStrategyForbidden, // retry strategy: retry if forbidden status code returned
    headers: {
     //'User-Agent': randomUseragent.getRandom(), // use random UA
     'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.1'
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
    // requestretry wants these as 3rd and 4th params of request() call... TODO: with new requestretry versions we can remove these parameters...
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

if (response &&
    response.statusCode !== 200 &&
    response.statusCode !== 403 &&
    response.statusCode !== 524
  ) {
  console.warn('^^^^^^^^^^^ unforeseen response.statusCode:', response.statusCode, '^^^^^^^^^^^');
}
    /*
     * retry the request if the response was a 403 one (forbidden),
     * or if response was 200 (success), but content contain a forbidden message
     */
    var forbidden = (
      response && (
        (response.statusCode === 403) || // 403 status code (forbidden)
        (response.statusCode === 524) || ( // 524 status code (cloudfare timeout)
          (response.statusCode === 200) &&
          (response.body.match(/<title>.*?A timeout occurred.*?<\/title>/)) // SGI provider timeout signature
        )
      )
    );
    if (forbidden) {
    	console.warn('request for url [', url, '] was forbidden; will retry...');
    }
    return forbidden;
  }

};
exports.fetchLimitedStubbornlyRetryingSecurely = exports.fetchStubbornlyRetryingSecurely;

module.exports = exports;