var os = require("os")
  , winston = require('winston') // handle logging
  , providers = require('./config.providers') // configured providers
;

var env = 'development'; // default env mode, overridable by environment
var profile = false; // profile timings flag

var config = {
  env: process.env.NODE_ENV ? process.env.NODE_ENV : env,
  profile: profile,
  category: 'women', // TODO: will get it from req, this will be a default value (?)
  city: 'torino', // TODO: will get it from req, this will be a default value (?)
  providers: providers, // imported providers
  images: {
    path: __dirname + '/..' + '/data/images',
    showcaseWidth: 320,
    thresholdDistance: (os.hostname() === 'malibox') ? 0.0625 : 0.125, // TODO: debug only, fix on 0.0625 on production
    thresholdDistanceSamePerson: (os.hostname() === 'malibox') ? 0.078125: 0.125, // TODO: debug only, fix on 0.078125 on production
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
    timeout: 5 * 60 * 1000, // wait for 5' before throwing a timeout (5' is the default)
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
      maxsize: 10000000,
      maxFiles: 1,
      json: false,
    }),
  ]
});

module.exports = config;
