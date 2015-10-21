var mongoose = require('mongoose')
  , config = require('../config') // application configuration
;

var imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  providerKey: String,
  idPerson: String, // ObjectId reference
  etag: String, // ETag
  lastModified: String, // last modified tag
  basename: String, // image file base name
  dateOfFirstSync: { type: Date, default: Date.now }, // date of creation
  signature: String, // image signature (TODO)
  isShowcase: Boolean, // this image is the person showcase
  isTruthful: Boolean // this image is to be considered thruthful
},
{
  autoIndex: config.debug
});
imageSchema.index({ url: 1 }, { unique: true });

imageSchema.methods.xSave = function(callback) {
  return this.model('Image').savefind({ type: this.type }, callback);
};

/*
// expose collection methods
imageSchema.statics.findAndModify = function(query, sort, doc, options, callback) {
  return this.collection.findAndModify(query, sort, doc, options, callback);
};
*/

module.exports = mongoose.model('Image', imageSchema);
