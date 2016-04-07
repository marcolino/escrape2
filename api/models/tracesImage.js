var mongoose = require('mongoose')
  , config = require('../config'); // application configuration

// phone traces schema
var tracesImage = new mongoose.Schema({
  image: { type: String, required: true },
  url: { type: String, required: true },
  title: String,
  description: String,
  thumbnailSrc: String,
},
{
  autoIndex: config.env === 'development',
  collection: 'tracesImages'
});
// define compound index, unique
tracesImage.index({ image: 1, url: 1 }, { unique: false });

module.exports = mongoose.model('TracesImage', tracesImage);