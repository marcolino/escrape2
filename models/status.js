var mongoose = require('mongoose')
  , config = require('../config'); // application configuration

var statusSchema = new mongoose.Schema({
  dateStart: Date,
  dateStop: Date,
  status: String, // started, stopped
  message: String, // message
  exitus: String // success, error
}, {
  autoIndex: config.debug,
  collection: 'status'
});

module.exports = mongoose.model('Status', statusSchema);
