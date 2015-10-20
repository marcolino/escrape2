var mongoose = require('mongoose')
  , config = require('../config') // application configuration
;

var placeSchema = new mongoose.Schema({
  name: String
},
{
  autoIndex: config.debug
});

module.exports = mongoose.model('Place', placeSchema);
