var mongoose = require('mongoose') // mongo abstraction
  , config = require('../config') // global configuration
  , Status = require('../models/status') // model of provider logging
;

var status = new Status();

var filter = { "date": { "$gte": Date.now() } };
var stream = Status.find(filter).tailable().stream();
//var stream = Status.find(filter, {tailable: true, awaitdata: true}).stream();
//var stream = Status.find(filter, {}, { tailable: true, awaitdata: false }).stream();

stream.on('data', function(doc) {
  console.log('=============== status stream data: new doc');
  console.log(doc);
}).on('error', function (error) {
  //if (error.message !== 'No more documents in tailed cursor') {
    console.log('=============== status stream data error:', error);
  //}
}).on('close', function () {
  console.log('=============== status stream data closed');
});

/*
/**
 * subscribe for new MongoDB documents using tailable cursor
 * /

// subscriber function
var subscribe = function() {
  var args = [].slice.call(arguments);
  var next = args.pop();
  var filter = args.shift() || {};

  if ('function' !== typeof next) {
    throw('Callback function not defined');
  }

  mongoose.model('Status').find(filter, function(err, seekCursor) {
    if (err) {
      return console.error('Error getting seek cursor on Status collection:', err);
    }
    if ('function' !== typeof seekCursor) {
      return console.log('seek cursor on Status collection is empty');
    }
    seekCursor.nextObject(function(err, latest) {
      if (err) {
        return console.error('Error getting next object from seek cursor on Status collection:', err);
      }
      // TODO: what do we ned this for?
      if (latest) {
        filter._id = { $gt: latest._id };
      }

      // set MongoDB cursor options
      var cursorOptions = {
        tailable: true,
        awaitdata: true,
        numberOfRetries: -1
      };

      // create stream and listen
      var stream = coll.find(filter, cursorOptions).sort({ $natural: -1 }).stream();

      // call the callback
      stream.on('data', next);
    });
  }).sort({ $natural: -1 }).limit(1);
};

// new documents will appear in the console
subscribe(function(document) {
  console.log('==================== status:', document);
});
*/

exports.log = function(message) {
  return exports._do('log', message);
};

exports.info = function(message) {
  return exports._do('info', message);
};

exports.warn = function(message) {
  return exports._do('warn', message);
};

exports.error = function(message) {
  return exports._do('error', message);
};

exports._do = function(action, message) {
  status.dateStart = new Date();
  status.message = message;
  status.save(function(err) {
    if (err) {
      return console.error('error saving log into the status collection');
    }
    console.log('* adding status document *', action, message);
//subscribe(function(document) {
//  console.log('_do ==================== status:', document);
//});
  });
};

module.exports = exports;
