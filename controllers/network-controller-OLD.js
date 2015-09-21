var
  request = require('request'), // to request external data
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
  const retriesTimeout = 10 * 1000; // time to sleep between retries (milliseconds)
  var options = {
    url: url,
    _retries: 0,
  };
  if (config.mode !== 'fake') { // not fake, use TOR
    options.agentClass = agent;
    options.agentOptions = {
      socksHost: config.tor.host,
      socksPort: config.tor.port,
    };
    options.headers = {
      'User-Agent': randomUseragent.getRandom(),
    };
  }

  // call requestStubborn()
  requestStubborn(options, function(err, response, contents) {
    if (err) {
      error(err);
    } else {
      success(contents);
    }
  });

  /**
   * requests an url, and retries if response status code is 403
   */
  function requestStubborn(options, callback) {
    request(options, function(err, response, contents) {
      if (err) {
        error(err);
      } else {
        if (response.statusCode === 200) { // statusCode: Success
          success(contents);
        } else {
          if (response.statusCode === 403) { // statusCode: Forbidden
            // retry (SGI aswers with this content: 'Please complete the security check')
            options._retries++;
            if (options._retries >= retriesMax) {
              console.warn('request to url', options.url, 'was forbidden; will retry in a moment...');
              setTimeout(function() {
                requestStubborn(options, callback);
              }, retriesTimeout);
            } else {
              console.warn('request to url', options.url, 'was forbidden for', retriesMax, 'times; giving up.');
              var err = new Error('Forbidden, and too many retries');
              err.status = response.statusCode;
              error(err);
            }
          } else { // all other statusCode (errors)
            var err = new Error('Request error');
            err.status = response.statusCode;
            error(err);
          }
        }
      }
    });
  }
}

module.exports = exports;

/*
function tryUntilSuccess(options, callback) {
    var req = https.request(options, function(res) {
        var acc = "";
        res.on("data", function(msg) {
            acc += msg.toString("utf-8");
        });
        res.on("end", function() {
            var history = JSON.parse(acc);  //<== Protect this if you may not get JSON back
            if (history.success) {
                callback(null, history);
            } else {
                tryUntilSuccess(options, callback);
            }
        });
    });
    req.end();

    req.on('error', function(e) {
        // Decide what to do here
        // if error is recoverable
        //     tryUntilSuccess(options, callback);
        // else
        //     callback(e);
    });
}

// Use the standard callback pattern of err in first param, success in second
tryUntilSuccess(options, function(err, resp) {
    // Your code here...
});
*/