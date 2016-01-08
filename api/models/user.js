var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  name: String,
  email: String,
  username: { type: String, required: true },
  passwordHash: { type: String, required: true },
  roles: Array,
  dateOfCreation: { type: Date, default: Date.now }
});

mongoose.model('User', userSchema);

module.exports = mongoose.model('User', userSchema);

var mongoose = require('mongoose');
