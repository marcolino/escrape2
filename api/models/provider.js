var mongoose = require('mongoose')
  , config = require('../config'); // application configuration

var providerSchema = new mongoose.Schema({
  key: String,
  //mode: String,
  type: String,
  url: String,
  language: String,
  categories: Object
}, {
  autoIndex: config.debug
});

/*
// virtual method example
providerSchema.virtual('mode.type').get(function () {
  return this.mode + ' ' + this.type;
});
*/

var model = mongoose.model('Provider', providerSchema);

var getAll = function(filter, result) { // get all providers
  model.find(filter, function(err, providers) {
    result(err, providers);
  });
};

module.exports = {
  getAll: getAll,
  schema: providerSchema,
  model: model
};
