var mongoose = require('mongoose')
  , config = require('../config'); // application configuration

// user to person schema
var userToPersonSchema = new mongoose.Schema({
  username: { type: String, required: true },
  personkey: { type: String, required: true },
  hide: Boolean,
  vote: Number,
  notes: String,
},
{
  autoIndex: config.env === 'development',
  collection: 'usersToPersons'
});
userToPersonSchema.index({ username: 1 }, { unique: false });
userToPersonSchema.index({ personKey: 1 }, { unique: false });

//mongoose.model('UserToPerson', userToPersonSchema);

module.exports = mongoose.model('UserToPerson', userToPersonSchema);