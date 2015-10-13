var os = require("os");

var config = {};
config.env = 'development';
config.debug = true;
config.mode = ((os.hostname() === 'linux-backup') ? 'fake' : 'normal');
config.category = 'women'; // TODO: will get it from req, this will be a default value (?)
config.city = 'torino'; // TODO: will get it from req, this will be a default value (?)
config.imagesPath = './data/images';
config.logger = {};
config.logger.logFilePath = 'logs/escrape.log';
config.logger.timestampFormat = 'YYYY-MM-DD HH:mm:ss.SSS';
config.log = require('simple-node-logger').createSimpleLogger(config.logger); // create a simple logger
config.db = {};
config.db.type = 'mongodb';
config.db.host = 'localhost';
config.db.name = 'escrape';
config.tor = {};
//console.log(os.hostname());
config.tor.available = (os.hostname() === 'malibox'); // TOR is available only locally, at the moment...
config.tor.host = 'localhost';
config.tor.port = 9050;

// development only
config.providers = [
  {
    key: 'SGI',
    mode: 'normal',
    type: 'persons',
    url: 'http://www.sexyguidaitalia.com',
    language: 'it',
    //limit: 5 * 1000, // don't use it aymore...
    categories: {
      women: {
        path: '/escort', // list path (TODO: use a better name...)
      },
    },
  },
  {
    key: 'TOE',
    mode: 'normal',
    type: 'persons',
    url: 'http://www.torinoerotica.com',
    language: 'it',
    //limit: 5 * 1000, // don't use it aymore...
    categories: {
      women: {
        path: '/annunci-escort-donna', // list path (TODO: use a better name...)
      },
    },
  },
  {
    key: 'FORBES',
    mode: 'fake',
    type: 'persons',
    url: 'http://it.wikipedia.org',
    language: 'it',
    //limit: 1, // don't use it aymore...
    categories: {
      overall: {
        path: '/wiki/Lista_delle_persone_pi%C3%B9_potenti_del_mondo_secondo_Forbes#2014.5B2.5D', // list path (TODO: use a better name...)
      },
      women: { 
        path: '/wiki/Lista_delle_100_donne_pi%C3%B9_potenti_del_mondo_secondo_Forbes#2015', // list path (TODO: use a better name...)
      },
    },
  },
  {
    key: 'TEST',
    mode: 'fake',
    type: 'persons',
    url: 'http://localhost',
    language: 'it',
    //limit: 1, // don't use it aymore...
    categories: {
      women: { 
        path: '/test/list.zero'
      },
    },
  },
  {
    key: 'GF',
    mode: 'normal',
    type: 'comments',
    // ...
  },

];

module.exports = config;