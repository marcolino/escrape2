var os = require("os")
  , winston = require('winston') // handle logging
  , providers = require('./config.providers') // configured providers
;

var config = {
  env: 'development',
  debug: true,
  category: 'women', // TODO: will get it from req, this will be a default value (?)
  city: 'torino', // TODO: will get it from req, this will be a default value (?)
  providers: providers, // imported providers
  images: {
    path: __dirname + '/..' + '/data/images',
    thresholdDistance: (os.hostname() === 'malibox') ? 0.07 : 0.125, // TODO: debug only, fix on 0.04 or 0.07 on production
    thresholdDistanceSamePerson: 0.02
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
    timeout: 5 * 60 * 1000, // wait for 1' before throwing a timeout
    maxAttempts: 3, // retry for 3 attempts more after the first one
    retryDelay: 3 * 1000 // wait for 3" before trying again
  },
  tor: {
    available: (os.hostname() === 'malibox'), // TOR is available only @malibox, at the moment...
    host: 'localhost',
    port: 9050
  },
};

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
