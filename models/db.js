var mongoose = require('mongoose')
  , config = require('../config')
;

mongoose.connect(config.db.type + '://' + config.db.host + '/' + config.db.name);

mongoose.connection.on('open', function() {
  //console.log('Database connection opened.');
});

mongoose.connection.on('error', function(err) {
  console.error('Error connecting to database:', err);
});
