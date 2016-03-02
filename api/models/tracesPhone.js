var mongoose = require('mongoose')
  , config = require('../config'); // application configuration

// phone traces schema
var tracesPhone = new mongoose.Schema({
  phone: { type: String, required: true },
  link: String,
  title: String,
  description: String,
  dateOfLastSync: { type: Date, default: Date.now },
},
{
  autoIndex: config.env === 'development',
  collection: 'tracesPhones'
});
tracesPhone.index({ link: 1 }, { unique: true });
tracesPhone.index({ phone: 1 }, { unique: false });

module.exports = mongoose.model('TracesPhone', tracesPhone);