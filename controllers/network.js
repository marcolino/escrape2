var requestretry = require('requestretry') // to place http requests and retry if needed
  , randomUseragent = require('random-ua') // to use a random user-agent
  , agent = require('socks5-http-client/lib/Agent') // to be able to proxy requests
  , fs = require('fs') // to be able to use filesystem
  , config = require('../config') // global configuration
;

var log = config.log;

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
  //log.debug('!!!!! setting header If-Modified-Since to', resource.lastModified);
  var options = {
    url: resource.url,
    maxAttempts: 12, // retry for 2 attempts more after the first one
    retryDelay: 10 * 1000, // wait for 10" before trying again
    retryStrategy: retryStrategyForbidden, // retry strategy: retry if forbidden status code returned
    headers: {
      'User-Agent': randomUseragent.generate()
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

  //replay(
    requestretry(
      options,
      function(err, response, contents) {
        if (err) {
          //log.error('error in request to ', options.url, ': ', err);
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
      ,
      options.maxAttempts,
      options.retryDelay
    );//, {
  //    retries: 10,
  //    factor: 2
  //  }
  //)
  //.on('replay', function (replay) {
  //  // "replay" is an object that contains some useful information 
  //  console.log('request failed: ' + replay.error.code + ' ' + replay.error.message);
  //  console.log('replay nr: #' + replay.number);
  //  console.log('will replay in: ' + replay.delay + 'ms')
  //});

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
      log.warn('retry strategy forbidden ignored response status code ', response.statusCode);
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
      log.warn('request was forbidden; will retry in ', (options.retryDelay / 1000), ' seconds...');
    }
    return forbidden;
  }

};

module.exports = exports;
