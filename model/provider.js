var mongoose = require('mongoose');

var providerSchema = new mongoose.Schema({
  key: String,
  mode: String,
  type: String,
  url: String,
  language: String,
  dateOfLastSync: { type: Date },
  forbiddenRegexp: Object, // TODO: remove this, forbidder answers a 403 statusCode, no need to parse regexp...
  categories: Object,
});

module.exports = mongoose.model('Provider', providerSchema);