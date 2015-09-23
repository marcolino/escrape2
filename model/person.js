var mongoose = require('mongoose');  

var personSchema = new mongoose.Schema({  
  name: String,
  vote: Number,
  dateofcreation: { type: Date, default: Date.now },
  isloved: Boolean,
});

module.exports = mongoose.model('Person', personSchema);

/*
var person_data = {
  first_name: req.params.first,
  last_name: req.params.last,
  username: req.params.username,
};

var person = new Person(person_data);

person.save(function(err, data) {
  if (err) {
    res.json({ error: err });
  } else {
    res.json(data);
  }
});
*/