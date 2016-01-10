var mongoose = require('mongoose')
  , config = require('../config'); // application configuration


// person per user child schema
var personPerUserSchema = new mongoose.Schema({ userId: String, hide: Boolean });

// person schema
var personSchema = new mongoose.Schema({
  key: String,
  //idUser: String,
  url: String,
  etag: String,
  md5: String,
  name: String,
  sex: String,
  addressZone: String,
  addressStreet: String,
  addressCity: String,
  description: String,
  category: String,
  notes: String,
  phone: String,
  nationality: String,
  age: Number,
  vote: Number,
  rating: Number,
  thruthful: Boolean,
  dateOfFirstSync: { type: Date, default: Date.now },
  dateOfLastSync: { type: Date, default: Date.now },
  phoneIsAvailable: Boolean,
  isPresent: Boolean,
  alias: String,
  showcaseBasename: String,
  users: [ personPerUserSchema ]
},
{
  autoIndex: config.env === 'development',
  collection: 'persons'
});
personSchema.index({ key: 1 }, { unique: true });

/*
personSchema.methods.ToDo_Save = function(callback) {
  return this.model('Person').savefind({ type: this.type }, callback);
};
*/

/*
// expose collection methods
personSchema.statics.findAndModify = function(query, sort, doc, options, callback) {
  return this.collection.findAndModify(query, sort, doc, options, callback);
};
*/

module.exports = mongoose.model('Person', personSchema);
