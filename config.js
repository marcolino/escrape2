var os = require("os");

var config = {};

config.env = 'development';
config.mode = ((os.hostname() === 'linux-backup') ? 'fake' : 'normal');
//config.mode = 'fake';
config.debug = true;
config.category = 'women'; // TODO: will get it from req, this will be a default value (?)
config.city = 'torino'; // TODO: will get it from req, this will be a default value (?)
config.tor = {};
config.tor.host = 'localhost';
config.tor.port = 9050;

module.exports = config;