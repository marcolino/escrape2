var os = require("os")
  , winston = require('winston') // handle logging
;

var config = {};
config.env = 'development';
config.debug = true;
config.mode = ((os.hostname() === 'linux-backup') ? 'fake' : 'normal');
config.category = 'women'; // TODO: will get it from req, this will be a default value (?)
config.city = 'torino'; // TODO: will get it from req, this will be a default value (?)
config.images = {};
config.images.path = __dirname + '/..' + '/data/images';
config.images.thresholdDistance = 0.12;
config.logger = {};
config.logger.levelConsole = 'silly'; // 'error' to production
config.logger.levelFile = 'debug'; // 'info' to production
config.logger.logFilePath = 'logs/escrape.log';
config.logger.timestamp = function() { return (new Date()).toISOString().replace('T', ' ').replace('Z', ''); };
config.db = {};
config.db.type = 'mongodb';
config.db.host = 'localhost';
config.db.name = 'escrape';
//config.db.openshiftRootUser = 'admin';
//config.db.openshiftRootPassword = 'fSnwesCwws11';
//config.db.openshiftName = 'nodejs';

config.tor = {};
config.tor.available = (os.hostname() === 'malibox'); // TOR is available only locally, at the moment...
config.tor.host = 'localhost';
config.tor.port = 9050;

// set up logging
var logger = new (winston.Logger)({
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
config.log = logger;

// development only (?)
config.providers = [
  {
    key: 'SGI',
    mode: 'normal',
    type: 'persons',
    url: 'http://www.sexyguidaitalia.com',
    language: 'it',
    categories: {
      women: {
        pathList: '/escort',
        pathDetails: '/escort',
      },
    },
  },
  {
    key: 'TOE',
    mode: 'normal',
    type: 'persons',
    url: 'http://www.torinoerotica.com',
    language: 'it',
    categories: {
      women: {
        pathList: '/annunci-escort-donna',
        pathDetails: ''
      },
    },
  },
  {
    key: 'FORBES',
    mode: 'fake',
    type: 'persons',
    url: 'http://it.wikipedia.org',
    language: 'it',
    categories: {
      overall: {
        pathList: '/wiki/Lista_delle_persone_pi%C3%B9_potenti_del_mondo_secondo_Forbes#2014.5B2.5D',
        pathDetails: ''
      },
      women: { 
        pathList: '/wiki/Lista_delle_100_donne_pi%C3%B9_potenti_del_mondo_secondo_Forbes#2015',
        pathDetails: ''
      },
    },
  },
/*
  {
    key: 'TEST',
    mode: 'fake',
    type: 'persons',
    url: 'http://test.server.local', //http://localhost',
    language: 'it',
    categories: {
      women: { 
        pathList: '/test/list.zero',
        pathDetails: ''
      },
    },
  },
*/
  {
    key: 'GF',
    mode: 'normal',
    type: 'comments',
    // ...
  },

];

module.exports = config;