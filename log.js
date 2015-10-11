    var mongoose = require('mongoose');

    mongoose.connect('mongodb://localhost/mydb');
    
    mongoose.connection.on('open', function() {
      console.log('database connection opened');
    });
    
    mongoose.connection.on('error', function(err) {
      console.error('error connecting to database:', err);
    });

    var mongoose = require('mongoose')
    var logSchema = new mongoose.Schema({
      date: Date,
      message: String
    }, {
      capped: {
        size: 1024000,
        autoIndexId: true
      }
    });
    var Log = mongoose.model('Log', logSchema);

    var filter = { "date": { "$gte": Date.now() } };
    var stream = Log.find(filter).tailable().stream();
    
    stream.on('data', function(doc) {
      console.log('log stream data - new doc:', doc.message);
    }).on('error', function (error) {
      console.log('status stream data - error:', error.message);
    }).on('close', function () {
      console.log('status stream data - closed');
    });

    // ...

    var log = new Log();
    logger = function(message) {
      log.date = new Date();
      log.message = message;
      log.save(function(err) {
        if (err) {
          return console.error('error saving log');
        }
        console.log('log message "' + message + '" added');
      });
    };
    
    // ...
    
    logger('my new message');