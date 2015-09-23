var os = require("os");

var config = {};
config.env = 'development';
config.debug = true;
config.mode = ((os.hostname() === 'linux-backup') ? 'fake' : 'normal');
config.category = 'women'; // TODO: will get it from req, this will be a default value (?)
config.city = 'torino'; // TODO: will get it from req, this will be a default value (?)

config.db = {};
config.db.type = 'mongodb';
config.db.host = 'localhost';
config.db.name = 'escrape';

config.tor = {};
config.tor.host = 'localhost';
config.tor.port = 9050;

config.providers = [
  {
    //'_id': new objectId,
    'key': 'FORBES',
    'mode': 'fake',
    'type': 'persons',
    'url': 'http://it.wikipedia.org',
    'language': 'it',
    'dateOfLastSync': new Date(0),
    'forbiddenRegexp': { // TODO: REMOVE THIS FIELD...
      'body': 'forbidden, please complete captcha...',
      'flags': 'gim',
    },
    'categories': {
      'overall': {
        'path': '/wiki/Lista_delle_persone_pi%C3%B9_potenti_del_mondo_secondo_Forbes#2015', // TODO: which path? list path or details path? differentiate?
      },
      'women': {  
        'path': '/wiki/Lista_delle_100_donne_pi%C3%B9_potenti_del_mondo_secondo_Forbes#2015', // TODO: which path? list path or details path? differentiate?
      },
    },
  },
  {
    //'_id': new objectId,
    'key': 'SGI',
    'mode': 'normal',
    'type': 'persons',
    'url': 'http://www.sexyguidaitalia.com',
    'language': 'it',
    'dateOfLastSync': new Date(0),
    'forbiddenRegexp': { // TODO: verify this re... - TODO: WE DON'T NEED THIS...
      'body': 'forbidden, please complete captcha...',
      'flags': 'gim',
    },
    'categories': {
      'women': {
        'path': '/escort/', // TODO: which path? list path or details path? differentiate?
        'selectors': {
          'category': 'li[id="ctl00_escort"]',
          'listCities': 'li',
        },
      },
    },
  },
  {
    //'_id': new objectId,
    'key': 'TOE',
    'mode': 'normal',
    'type': 'persons',
    'url': 'http://www.torinoerotica.com',
    'language': 'it',
    'dateOfLastSync': new Date(0),
    'forbiddenRegexp': { // TODO: verify this re...
      'body': 'forbidden, please complete captcha...',
      'flags': 'gim',
    },
    'categories': {
      'women': {
        'path': '/annunci-escort-donna/',
        'selectors': {
          'category': 'li[id="ctl00_escort"]',
          'listCities': 'li',
        },
      },
    },
  },
  {
    //'_id': new objectId,
    'key': 'GF',
    'type': 'comments',
    'mode': 'normal',
  },
];

module.exports = config;