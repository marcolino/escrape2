var mongoose = require('mongoose')
  , config = require('../config'); // application configuration

var personSchema = new mongoose.Schema({
  key: String,
  //idUser: String,
  url: String,
  name: String,
  sex: String,
  addressZone: String,
  addressStreet: String,
  addressCity: String,
  description: String,
  notes: String,
  phone: String,
  nationality: String,
  age: Number,
  vote: Number,
  rating: Number,
  thruthful: Boolean,
  dateOfFirstSync: { type: Date, default: Date.now /*(?)*/ },
  dateOfLastSync: { type: Date, default: Date.now },
  phoneIsAvailable: Boolean,
  isPresent: Boolean,
  isAliasFor: { type: Array, default: [] },
  showcaseUrl: String // showcase image (local) url
},
{
  autoIndex: config.debug,
  collection: 'persons'
});
personSchema.index({ key: 1 }, { unique: true });

personSchema.methods.ToDo_Save = function(callback) {
  return this.model('Person').savefind({ type: this.type }, callback);
};

/*
// expose collection methods
personSchema.statics.findAndModify = function(query, sort, doc, options, callback) {
  return this.collection.findAndModify(query, sort, doc, options, callback);
};
*/

module.exports = mongoose.model('Person', personSchema);
