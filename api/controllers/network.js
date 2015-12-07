var requestretry = require('requestretry'); // to place http requests and retry if needed
var request = require('request') // to place http requests
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
//if (resource.type === 'image') { return success('contents', resource); }
//if (resource.type === 'image') { log.silly('request url 1:', resource.url); }
  var encoding = // set encoding to null (auto) for text resources, to binary for images
    (resource.type === 'text') ? null :
    (resource.type === 'image') ? 'binary' :
    null
  ;
  var options = {
    url: resource.url, // url to download
    maxAttempts: config.networking.maxAttempts, // number of attempts to retry after the first one
    retryDelay: config.networking.retryDelay, // number of milliseconds to wait for before trying again
    retryStrategy: retryStrategyForbidden, // retry strategy: retry if forbidden status code returned
    headers: {
      'User-Agent': randomUseragent.generate()
    },
    encoding: encoding,
    timeout: config.networking.timeout // number of milliseconds to wait for a server to send response headers before aborting the request
  };
  if (resource.etag) { // set header's If-None-Match tag if we have an etag
    //log.info('>network downloading resource with etag set');
    options.headers['If-None-Match'] = resource.etag;
  } //else log.info('>network downloading resource with etag NOT set');
  if (config.tor.available) { // TOR is available
    options.agentClass = agent;
    options.agentOptions = { // TOR socks host/port
      socksHost: config.tor.host,
      socksPort: config.tor.port
    };
  }

//log.silly('STARTING REQUESTRETRY WITH URL:', resource.url);
  requestretry(
    options,
    function(err, response, contents) {
      if (err) {
        return error(err);
      }
if (resource.type === 'image') {log.info('RESPONSE:', response.request.uri.href); }
/*
if (response.headers.etag) log.info('<network downloaded resource with etag set');
else log.info('<network downloaded resource with etag NOT set');

      resource.statusCode = response.statusCode;
      
      if (response.statusCode < 300) { // 2xx, success, download effected
log.info('<network downloaded resource with etag NOT set');
        if (response.headers.etag)
          log.info('<network downloaded resource with statusCode < 300(' + response.statusCode < 300 + '), reporting it to response');
          resource.etag = response.headers.etag;
      }
*/
      //resource.url = response.request.uri.href; // copy request url to response
      resource.statusCode = response.statusCode;    
      if (response.headers.etag) {
        resource.etagNew = response.headers.etag;
      }
//log.silly('request url 2:', resource.url);
//log.silly('ENDING REQUESTRETRY WITH URL:', resource.url);
      success(contents, resource);
    }
/*
    // requestretry wants these as 3rd and 4th params of request() call...
    // TODO: with new requestretry versions we can remove these parameters...
    // TEST THIS !!!!!!!!!!!!!!!!!!!!
    ,
    options.maxAttempts,
    options.retryDelay
*/
  );



  /**
   * request-retry strategies
   */

  /**
   * @param  {Null | Object} err
   * @param  {Object} response
   * @return {Boolean} true if the request should be retried
   */
  function retryStrategyForbidden(err, response) { // TODO: use a more generic name than '...Forbidden'...
    // TODO: debug only
    if (response &&
        response.statusCode !== 200 &&
        response.statusCode !== 304 &&
        response.statusCode !== 403 &&
        response.statusCode !== 404 &&
        response.statusCode !== 502 &&
        response.statusCode !== 503 &&
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
        (response.statusCode === 404) || // 404 status code (not found)
        (response.statusCode === 502) || // 502 status code (bad gateway, tor proxy problem?)
        (response.statusCode === 503) || // 503 status code (service unavailable, tor proxy problem?)
        (response.statusCode === 524) || // 524 status code (cloudfare timeout)
          (
            (response.statusCode === 200) &&
            (response.body && (
              response.body.toString().match(
                /<title>404 - .*?<\/title>/ // TOE page not found
              ) ||
              response.body.toString().match(
                /<title>.*?A timeout occurred.*?<\/title>/ // SGI timeout signature
              ) ||
              response.body.toString().match(
                /<title>Attention Required!\s*\|\s*CloudFlare<\/title>/ // SGI CloudFlare warning
              ) ||
              response.body.toString().match(
                /<title>.*?\| 522: Connection timed out<\/title>/ // SGI connection timed out
              )
            )
          )
        )
      )
    );
    if (forbidden) {
      log.warn('request was forbidden (' + (response ? response.statusCode : '?') + '); will retry in ', (options.retryDelay / 1000), ' seconds...');
    }

    // TODO: debug this condition... is this the cause of freezes on full sync's (callbackInner() not called) ?
    if (response && response.statusCode >= 400) { log.error('retry strategy - not found a forbidden condition (status code is:', response.statusCode + ')'); }

    return forbidden;
  }

};

/**
 * requests url contents, smartfully
 */
exports.requestSmart = function(resource, error, success) {
  var encoding = // set encoding to null (auto) for text resources, to binary for images
    (resource.type === 'text') ? null :
    (resource.type === 'image') ? 'binary' :
    null
  ;
  var options = {
    uri: resource.url, // uri to download
    headers: {
      'User-Agent': randomUseragent.generate()
    },
    encoding: encoding,
    timeout: config.networking.timeout // number of milliseconds to wait for a server to send response headers before aborting the request
  };
  if (resource.etag) { // set header's If-None-Match tag if we have an etag
//log.info('>network downloading resource with etag set');
    options.headers['If-None-Match'] = resource.etag;
  }
//else log.info('>network downloading resource with etag NOT set');
  if (config.tor.available) { // TOR is available
    options.agentClass = agent;
    options.agentOptions = { // TOR socks host/port
      socksHost: config.tor.host,
      socksPort: config.tor.port
    };
  }

  request(
    options,
    function(err, response, contents) {
      if (err) {
        return error(err);
      }
//if (response.headers.etag) log.info('<network downloaded resource with etag set');
//else log.info('<network downloaded resource with etag NOT set');
      resource.statusCode = response.statusCode;    
      //if (response.statusCode < 300) { // 2xx, success, download effected
        if (response.headers.etag) {
          resource.etagNew = response.headers.etag;
        }
      //}
      success(contents, resource);
    }
  );
};

module.exports = exports;
