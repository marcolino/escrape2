var mongoose = require('mongoose')
  , config = require('../config'); // application configuration

// review schema
var reviewSchema = new mongoose.Schema({
  key: String,
  phone: String,
  topic: {
    providerKey: String,
    section: String,
    url: String,
    pageLast: {
      url: String,
      etag: String,
    },
    title: String,
    author: {
      name: String,
      url: String,
    },
    date: Date,
  },
  author: {
    name: String,
    karma: String,
    postsCount: Number
  },
  title: String,
  date: Date,
  contents: String,
  beauty: Number,
  performance: Number,
  sympathy: Number,
  cleanliness: Number,
  site: {
  	quality: Number,
  	cleanliness: Number,
  	reachability: Number,
  }
},
{
  autoIndex: config.env === 'development',
  collection: 'reviews'
});
reviewSchema.index({ 'key': 1 }, { unique: true });
reviewSchema.index({ 'phone': 1 }, { unique: false });
reviewSchema.index({ 'topic.url': 1 }, { unique: true });
reviewSchema.index({ 'topic.pageLast.url': 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
