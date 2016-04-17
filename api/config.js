'use strict';

var os = require("os")
  , winston = require('winston') // handle logging
  , providers = require('./config.providers') // configured providers
;

var env = 'development'; // default env mode, overridable by environment
var profile = true; // profile timings flag

var config = {
  env: process.env.NODE_ENV ? process.env.NODE_ENV : env,
  profile: profile,
  category: 'women', // TODO: will get it from req, this will be a default value (?)
  city: 'torino', // TODO: will get it from req, this will be a default value (?)
  providers: providers, // imported providers
  auth: {
    // enabling allowUnauthorizedRequests we allow everybody to use our APIs;
    // of course only *read* requests will succeed, other requests will fail because no user is found
    allowUnauthorizedRequests: true, // allow unauthorized requests
    tokenExpirationDays: 7, // the days the authentication token expires after
  },
  images: {
    path: __dirname + '/..' + '/data/images',
    showcaseWidth: 320,
    thresholdDistance: (os.hostname() === 'malibox') ? 2/64 : 8/64, // TODO: debug only, fix on 2/64 on production (TODO: profile this value)
    thresholdDistanceSamePerson: (os.hostname() === 'malibox') ? 3/64 : 8/64, // TODO: debug only, fix on 3/64 on production (TODO: profile this value)
    versions: {
      full: {
        width: 0, // full width (set in init())
        quality: 100, // full quality
        dir: 'full', // directory for this version
      },
      showcase: {
        width: 0, // showcase width (set in init())
        quality: 75, // 75% quality
        dir: 'showcase', // directory for this version
      }
    }
  },
  logger: {
    //levelDetail: (env === 'development') ? 'dev' : 'default',
    levelConsole: 'silly', // 'error' to production
    levelFile: 'debug', // 'info' to production
    logFilePath: 'logs/escrape.log',
    timestamp: function() {
      var tzoffset = (new Date()).getTimezoneOffset() * 60 * 1000; // offset in milliseconds
      var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1).replace('T', ' ');
      return localISOTime;
    }
  },
  db: {
    type: 'mongodb',
    host: 'localhost',
    name: 'escrape'
  },
  networking: {
    timeout: 7 * 60 * 1000, // wait for 5' before throwing a timeout (5' is the default)
    maxAttempts: 3, // retry for 3 attempts more after the first one
    retryDelay: 3 * 1000 // wait for 3" before trying again
  },
  tor: {
    available: (os.hostname() === 'malibox'), // TOR is available only @malibox, at the moment...
    host: 'localhost',
    port: 9050
  },
  init: function() { // to set self-referenced property values
    this.images.versions.full.width = 0;
    this.images.versions.showcase.width = this.images.showcaseWidth;
    return this;
  }
}.init();

config.log = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      silent: false,
      level: config.logger.levelConsole,
      prettyPrint: true,
      colorize: true,
      showlevel: false,
      timestamp: config.logger.timestamp,
    }),
    new (winston.transports.File)({
      silent: false,
      level: config.logger.levelFile,
      prettyPrint: false,
      colorize: false,
      showlevel: true,
      timestamp: config.logger.timestamp,
      filename: config.logger.logFilePath,
      maxsize: 100000000,
      maxFiles: 1,
      json: false,
    }),
  ]
});

module.exports = config;
