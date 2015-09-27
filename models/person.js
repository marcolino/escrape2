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
  providerUrl: String,
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
  active: Boolean,
  aliasPrev: String, // ObjectId reference
  aliasNext: String, // ObjectId reference
},
{
  autoIndex: config.debug,
  collection: "persons",
});
personSchema.index({ name: 1, type: -1 });

personSchema.methods.xSave = function(callback) {
  return this.model('Person').savefind({ type: this.type }, cb);
}
module.exports = mongoose.model('Person', personSchema);