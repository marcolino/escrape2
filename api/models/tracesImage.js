var mongoose = require('mongoose')
  , config = require('../config'); // application configuration

// phone traces schema
var tracesImage = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  url: { type: String, required: true },
  title: String,
  description: String,
  thumbnailUrl: String,
  bestGuess: String,
  dateOfLastSync: { type: Date, default: Date.now },
},
{
  autoIndex: config.env === 'development',
  collection: 'tracesImages'
});
// define compound index, unique
tracesImage.index({ imageUrl: 1, url: 1 }, { unique: true });

module.exports = mongoose.model('TracesImage', tracesImage);