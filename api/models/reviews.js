var mongoose = require('mongoose')
  , config = require('../config'); // application configuration

// review schema
var reviewSchema = new mongoose.Schema({
  key: String,
  url: String,
  author: { }
,  content: String,
},
{
  autoIndex: config.env === 'development',
  collection: 'reviews'
});
reviewSchema.index({ key: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
