var mongoose = require('mongoose')
  , config = require('../config') // application configuration
;

var imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  personKey: { type: String, required: true }, // person.providerKey + '/' + person.key
  etag: String, // ETag
  size: Number, // image contents size
  //lastModified: String, // last modified tag
  basename: String, // image file base name
  dateOfFirstSync: { type: Date, default: Date.now }, // date of first sync
  //dateOfLastSync: { type: Date, default: Date.now }, // date of last sync
  signature: String, // 64) binary ([0-1])bytes signature (perceptual hash)
  //hasDuplicate: Boolean, // this image has a duplicate
  isShowcase: Boolean, // this image is showcase for person
  isTruthful: Boolean // this image is to be considered thruthful
},
{
  autoIndex: config.env === 'development'
});
imageSchema.index({ url: 1 }, { unique: false }); // for some provider issue, more persons could share same image url

/*
imageSchema.methods.Save = function(callback) {
  return this.model('Image').savefind({ type: this.type }, callback);
};
*/

/*
// expose collection methods
imageSchema.statics.findAndModify = function(query, sort, doc, options, callback) {
  return this.collection.findAndModify(query, sort, doc, options, callback);
};
*/

module.exports = mongoose.model('Image', imageSchema);
