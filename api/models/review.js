var mongoose = require('mongoose')
  , config = require('../config'); // application configuration

// review schema
var reviewSchema = new mongoose.Schema({
  phone: String,
  url: String,
  topic: String,
  content: String,
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
reviewSchema.index({ key: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
