var os = require("os");

var config = {};

config.env = 'development';
config.fake = (os.hostname() === 'linux-backup');
console.log('fake:', config.fake);
config.debug = true;
config.category = 'females';
config.city = 'torino';
config.tor = {};
config.tor.host = 'localhost';
config.tor.port = 9050;

module.exports = config;