var os = require("os");

var config = {};

config.env = 'development';
config.fake = (os.hostname() === 'linux-backup'); // development only
//config.fake = true;
config.debug = true;
config.category = 'females'; // TODO: will get it from req, this will be a default value (?)
config.city = 'torino'; // TODO: will get it from req, this will be a default value (?)
config.tor = {};
config.tor.host = 'localhost';
config.tor.port = 9050;

module.exports = config;