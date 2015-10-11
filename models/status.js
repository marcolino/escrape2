var mongoose = require('mongoose')
  , config = require('../config'); // application configuration

// const DEBUG = 1; ....
var statusSchema = new mongoose.Schema({
  thread: String, // the thread (group) of this message (an ObjectId?)
  date: Date, // date of emission
  level: Number, // started, stopped
  message: String // message
}, {
  autoIndex: config.debug,
  collection: 'status',
  capped: {
    size: 1024 * 1000,
    max: 1000,
    awaitData: true,
    autoIndexId: true
  }
});

module.exports = mongoose.model('Status', statusSchema);
