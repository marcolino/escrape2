//var config = require('../config') // global configuration
//;

module.exports = function CustomError(message, extra) {
  Error.captureStackTrace(this, this.constructor);
  this.name = 'Error'; //this.constructor.name;
  this.message = message;
  this.extra = extra;
};

require('util').inherits(module.exports, Error);