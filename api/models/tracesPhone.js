var mongoose = require('mongoose')
  , config = require('../config'); // application configuration

// phone traces schema
var tracesPhone = new mongoose.Schema({
  phone: { type: String, required: true },
  url: String,
  img: String,
  title: String,
  body: String,
},
{
  autoIndex: config.env === 'development',
});
tracesPhone.index({ phone: 1 }, { unique: true });

module.exports = mongoose.model('TracesPhone', tracesPhone);