var request = require('requestretry') // to place http requests and retry if needed
  , randomUseragent = require('random-useragent') // to use a random user-agent
  , agent = require('socks5-http-client/lib/Agent') // to be able to proxy requests
  , fs = require('fs') // to be able to use filesystem
  , config = require('../config'); // global configuration

/**
 * requests url contents, retrying and anonymously
 */
exports.requestRetryAnonymous = function(resource, error, success) {
  // TODO: handle type (text / image / ...) ...
  var encoding =
    (resource.type === 'text') ? null :
    (resource.type === 'image') ? 'binary' :
    null
  ;
  //console.log('!!!!! setting header If-Modified-Since to', resource.lastModified);
  var options = {
    url: resource.url,
    maxAttempts: 2, // retry for 2 attempts more after the first one
    retryDelay: 600 * 1000, // wait for 10' before trying again
    retryStrategy: retryStrategyForbidden, // retry strategy: retry if forbidden status code returned
    headers: {
      'User-Agent': randomUseragent.getRandom() // use random UA
      //'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.1'
    },
    encoding: encoding
  };
  // TODO: before setting cache fields in request header, check we have image on fs, it could have been deleted...
  if (resource.etag) { // set header's If-None-Match tag if we have an etag
    options.headers['If-None-Match'] = resource.etag;
  } else {
    if (resource.lastModified) { // set header's If-Modified-Since tag if we have a lastModified
      options.headers['If-Modified-Since'] = resource.lastModified;
    }
  }
  if (config.mode !== 'fake') { // not fake
    if (config.tor.available) { // TOR is available
      options.agentClass = agent;
      options.agentOptions = { // TOR socks host/port
        socksHost: config.tor.host,
        socksPort: config.tor.port
      };
    }
  }

  request(
    options,
    function(err, response, contents) {
      if (err) {
        console.error('error in request to', options.url + ':', err);
        return error(err);
      }
      if (response.statusCode < 300) { // 2xx, success, download effected
        resource.etag = response.headers.etag;
        resource.lastModified = response.headers['last-modified'];
      }
      success(contents, resource);
    }
    // requestretry wants these as 3rd and 4th params of request() call...
    // TODO: with new requestretry versions we can remove these parameters...
    // TEST THIS !!!!!!!!!!!!!!!!!!!!
    //,
    //options.maxAttempts,
    //options.retryDelay
  );

  // request retry strategies

  /**
   * @param  {Null | Object} err
   * @param  {Object} response
   * @return {Boolean} true if the request should be retried
   */
  function retryStrategyForbidden(err, response) {
    // TODO: debug only
    if (response &&
        response.statusCode !== 200 &&
        response.statusCode !== 304 &&
        response.statusCode !== 403 &&
        response.statusCode !== 524
      ) {
      console.warn('^^^', 'retryStrategyForbiddwn()', 'unforeseen response.statusCode:', response.statusCode, '^^^');
    }

    /*
     * retry the request if the response was a 403 one (forbidden),
     * or if response was 200 (success), but content contain a forbidden message
     */
    //console.log('response.body:', response.body.toString());
    var forbidden = (
      response && (
        (response.statusCode === 403) || // 403 status code (forbidden)
        (response.statusCode === 524) || // 524 status code (cloudfare timeout)
          (
            (response.statusCode === 200) &&
            (response.body && (
              response.body.toString().match(
                /<title>.*?A timeout occurred.*?<\/title>/ // SGI provider timeout signature
              ) ||
              response.body.toString().match(
                /<title>Attention Required!\s*\|\s*CloudFlare<\/title>/ // SGI provider cloud warning
              )
            )
          )
        )
      )
    );
    if (forbidden) {
      console.warn('request was forbidden; will retry in', options.retryDelay, 'ms...');
    }
    return forbidden;
  }

};

module.exports = exports;
