'use strict';

var requestretry = require('requestretry') // to place http requests and retry if needed
  , randomUseragent = require('random-ua') // to use a random user-agent
  , agent = require('socks5-http-client/lib/Agent') // to be able to proxy requests
  , fs = require('fs') // to be able to use filesystem
  , config = require('../config') // global configuration
;

var request = require('request'); // to place http requests

var log = config.log;

/**
 * fetch resource contents, retrying and anonymously
 */
exports.fetch = function(resource, callback) {
//console.warn('fetch resource.url:', resource.url);
  var options = {
    url: resource.url, // url to download
    maxAttempts: config.networking.maxAttempts, // number of attempts to retry after the first one
    retryDelay: config.networking.retryDelay, // number of milliseconds to wait for before trying again
    retryStrategy: retryStrategyForbidden, // retry strategy: retry if forbidden status code returned
    timeout: config.networking.timeout, // number of milliseconds to wait for a server to send response headers before aborting the request
    headers: {
      'User-Agent': randomUseragent.generate(), // user agent: pick a random one
    },
    agentClass: config.tor.available ? agent : null, // socks5-http-client/lib/Agent
    agentOptions: { // TOR socks host/port
      socksHost: config.tor.available ? config.tor.host : null, // TOR socks host
      socksPort: config.tor.available ? config.tor.port : null, // TOR socks port
    },
  };
  if (resource.type === 'image') { // set encoding to binary if type is image
    options.encoding = 'binary';
  }
  if (resource.etag) { // must check etag is not null, can't set a null If-None-Match header
    options.headers['If-None-Match'] = resource.etag; // eTag field
  }

  // TODO: requestretry() sometimes gives SOCKS error (really is requestretry() ? RE-TEST REQUESTRETRY!!!)...
  requestretry(
    options,
    function(err, response, contents) {
      var requestEtag;
log.warn('network.fetch status code:', response.statusCode);
      if (!err && (response.statusCode === 200 || response.statusCode === 304)) {
        var result = {};
        result.etag = response.headers.etag;
        result.url = response.request.uri.href;
        if (response.statusCode === 304) { // unchanged
          result.isChanged = false;
          if (config.env === 'development') { // TODO: just to be safe, should not need this test on production
            if (requestEtag && (result.etag !== response.request.headers['If-None-Match'])) {
              log.warn(
                'result', result.url, 'not downloaded, but etag does change, If-None-Match not honoured;',
                'response status code:', response.statusCode, ';',
                'eTags - response:', result.etag, ', request:', response.request.headers['If-None-Match'], ';',
                'contents length:', (contents ? contents.length : 'zero')
              );
            }
          }

        } else { // downloaded
          result.isChanged = true;
          result.contents = contents;

          if (config.env === 'development') { // TODO: just to be safe, should not need this test on production
            if (requestEtag && (result.etag === response.request.headers['If-None-Match'])) {
              log.warn(
                'result', result.url, 'downloaded, but etag does not change, If-None-Match not honoured;',
                'response status code:', response.statusCode, ';',
                'eTags - response:', result.etag, ', request:', response.request.headers['If-None-Match'], ';',
                'contents length:', (contents ? contents.length : 'zero')
              );
            }
          }

        }
        callback(null, result); // success
      } else {
        callback(err, response); // error
      }
    }
  );
};

/**
 * fetch resource contents, retrying and anonymously
 */
exports.fetchCUSTOM = function(resource, callback) {
  var options = {
    url: resource.url, // url to download
    maxAttempts: config.networking.maxAttempts, // number of attempts to retry after the first one
    retryDelay: config.networking.retryDelay, // number of milliseconds to wait for before trying again
    retryStrategy: retryStrategyForbidden, // retry strategy: retry if forbidden status code returned
    timeout: config.networking.timeout, // number of milliseconds to wait for a server to send response headers before aborting the request
    encoding: ((resource.custom.type === 'text') ? null : (resource.custom.type === 'image') ? 'binary' : null), // encoding
    headers: {
      'User-Agent': randomUseragent.generate(), // user agent: pick a random one
    },
    agentClass: config.tor.available ? agent : null, // socks5-http-client/lib/Agent
    agentOptions: { // TOR socks host/port
      socksHost: config.tor.available ? config.tor.host : null, // TOR socks host
      socksPort: config.tor.available ? config.tor.port : null, // TOR socks port
    },
    custom: resource.custom, // custom properties to be returned back
    /*
    personKey: resource.personKey, // person key
    isNew: resource.isNew, // is new flag
    isShowcase: resource.isShowcase, // is showcase flag
    */
  };
  if (resource.custom.etag) { // must check etag is not null, can't set a null If-None-Match header
    options.headers['If-None-Match'] = resource.custom.etag; // eTag field
  }

  requestretry(
    options,
    function(err, response, contents) {

      if (!err && (response.statusCode === 200 || response.statusCode === 304)) {
        var resource = {};
        resource.custom = {};
        resource.url = response.request.uri.href;
        resource.custom.etag = response.request.headers['If-None-Match'];
        if (response.statusCode === 304) { // not changed
          resource.custom.isChanged = false;

          if (config.env === 'development') {
            if (resource.custom.etag !== response.headers.etag) { // TODO: just to be safe, should not need this test on production
              log.warn(
                'resource', response.url, 'not downloaded, but etag does change, If-None-Match not honoured;',
                'response status code:', response.statusCode, ';',
                'eTags - resource:', resource.custom.etag, ', response:', response.headers.etag, ';',
                'contents length:', (contents ? contents.length : 'zero')
              );
              return callback(null, resource);
            }
          }

        } else {

          if (config.env === 'development') {
            if (resource.custom.etag === response.headers.etag) { // TODO: just to be safe, should not need this test on production
              log.warn(
                'resource', response.url, 'downloaded, but etag does not change, If-None-Match not honoured;',
                'response status code:', response.statusCode, ';',
                'eTags - resource:', resource.custom.etag, ', response:', response.headers.etag, ';',
                'contents length:', (contents ? contents.length : 'zero')
              );
              return callback(null, resource);
            }
          }
          //log.info('fetched uri', response.request.uri.href);
          resource.contents = contents;
          resource.custom = response.request.custom; // return request custom properties, too
          resource.custom.isChanged = true;
          resource.custom.etag = response.headers.etag;
/*
          resource.isChanged = true;
          resource.etag = response.headers.etag;
          resource.personKey = response.request.personKey;
          resource.isNew = response.request.isNew;
          resource.isShowcase = response.request.isShowcase;
*/
        }
        callback(null, resource); // success
      } else {
        callback(err, null); // error
      }
    }
  );
};

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


exports.checkUrlChanged = function(url, etag, callback) {
  var options = {
    url: url,
    method: 'HEAD',
    headers: {
      'If-None-Match': etag,
    }
  };
  request(options, function (error, response, body) {
    if (error) {
      return console.error('check failed:', error);
    }
    console.log('resp statuscode:', response.statusCode);
    if (response.headers.etag) {
      console.log('resp etag:', response.headers.etag);
    }
    return callback(response.statusCode < 300);
  });
};

// TODO: use this to check for url change by eTag - before fetch() - since this should be very fast...
exports.OLDDDDDcheckUrlChanged = function(url, etag, callback) {
log.debug('checkUrlChanged():', url, etag);
  var http = require('http');
  var options = {
    //method: 'GET',
    method: 'HEAD',
    url: url,
    //headers: {
    //  'If-None-Match': etag,
    //}
  };

/*
  //var t = process.hrtime();
console.log('request started');
  var req = http.request(options, function(res) {
console.log('request returned:', res);
    //console.log(res);
    //console.log('checkUrlChanged() - HEAD http get:', process.hrtime(t)[0] + (process.hrtime(t)[1] / 1000000000), 'seconds');
    req.end();
    return callback(res.statusCode < 300);
  });
*/
  var req = http.get(options, function(res) {
    console.log('STATUS: ', res.statusCode);
    console.log('HEADERS: ', res.headers);

    // Buffer the body entirely for processing as a whole.
    var bodyChunks = [];
    res.on('data', function(chunk) {
      // You can process streamed parts here...
      //bodyChunks.push(chunk);
log.info('data');
    }).on('end', function() {
      //var body = Buffer.concat(bodyChunks);
      //console.log('BODY: ' + body);
      // ...and/or process the entire body here.
log.info('end');
      return callback(res.statusCode < 300);
    });
  });
  req.on('error', function(e) {
    console.log('ERROR: ' + e.message);
    return callback(true); // on error, return with 'changed' flag, to force a real download
  });
};


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
      log.warn('request did not succeed for uri', response.request.uri.href, '(status code is', (response ? response.statusCode : '?') + ')');
    } else {
      if (response && response.statusCode >= 400) {
        log.warn('retry strategy - unhandled condition for uri', response.request.uri.href, '(status code is:', response.statusCode + '), giving up');
      }
    }

    return forbidden;
  }

module.exports = exports;
