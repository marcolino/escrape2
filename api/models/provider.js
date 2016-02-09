var mongoose = require('mongoose')
  , config = require('../config'); // application configuration

var providerSchema = new mongoose.Schema({
  key: String,
  //mode: String,
  type: String,
  url: String,
  language: String,
  categories: Object,
  whenImageChangesUrlChangesToo: Boolean,
  pathSearch: String,
}, {
  autoIndex: config.env === 'development'
});
providerSchema.index({ key: 1 }, { unique: true });

/*
// virtual method example
providerSchema.virtual('mode.type').get(function () {
  return this.mode + ' ' + this.type;
});
*/
/*
var model = mongoose.model('Provider', providerSchema);

var getAll = function(filter, result) { // get all providers
console.log('model.providers:', filter);
  model.find(filter, function(err, providers) {
console.log('PROVIDERS:', providers);
    result(err, providers);
  });
};

module.exports = {
  getAll: getAll,
  schema: providerSchema,
  model: model
};
*/
module.exports = mongoose.model('Provider', providerSchema);