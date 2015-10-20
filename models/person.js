var mongoose = require('mongoose')
  , config = require('../config'); // application configuration

var personSchema = new mongoose.Schema({
  /*
  name: String,
  vote: Number,
  dateofcreation: { type: Date, default: Date.now },
  isloved: Boolean,
  */
  idUser: String, // ObjectId reference
  key: String,
  //key: String, TODO: define a compound key from: key, providerKey
  providerKey: String,
  url: String,
  name: String,
  //sex: String,
  addressZone: String,
  addressStreet: String,
  addressCity: String,
  description: String,
  notes: String,
  phone: Number,
  nationality: String,
  age: Number,
  vote: Number,
  rating: Number,
  thruthful: Boolean,
  dateOfFirstSync: { type: Date, default: Date.now /*(?)*/ },
  dateOfLastSync: { type: Date, default: Date.now },
  isPresent: Boolean,
  aliasPrev: String, // ObjectId reference
  aliasNext: String, // ObjectId reference
  images: [
    String
  ]
},
{
  autoIndex: config.debug,
  collection: 'persons'
});
personSchema.index({ providerKey: 1, key: 1 }, { unique: true });

personSchema.methods.xSave = function(callback) {
  return this.model('Person').savefind({ type: this.type }, callback);
};

/*
// expose collection methods
personSchema.statics.findAndModify = function(query, sort, doc, options, callback) {
  return this.collection.findAndModify(query, sort, doc, options, callback);
};
*/

module.exports = mongoose.model('Person', personSchema);
