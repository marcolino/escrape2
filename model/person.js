var mongoose = require('mongoose');  

var personSchema = new mongoose.Schema({  
  name: String,
  vote: Number,
  dateofcreation: { type: Date, default: Date.now },
  isloved: Boolean,
});

mongoose.model('Person', personSchema);