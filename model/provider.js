var mongoose = require('mongoose')
  , config = require('./config'); // application configuration


var providerSchema = new mongoose.Schema({
  key: String,
  mode: String,
  type: String,
  url: String,
  language: String,
  dateOfLastSync: { type: Date },
  forbiddenRegexp: Object, // TODO: remove this, forbidder answers a 403 statusCode, no need to parse regexp...
  categories: Object,
}, {
  autoIndex: config.debug,
});

/*
// virtual method example
providerSchema.virtual('mode.type').get(function () {
  return this.mode + ' ' + this.type;
});
*/

module.exports = mongoose.model('Provider', providerSchema);