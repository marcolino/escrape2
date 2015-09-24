var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  name: String,
  email: String,
  dateofcreation: { type: Date, default: Date.now },
});

mongoose.model('User', userSchema);