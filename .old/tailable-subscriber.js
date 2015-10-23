var mongo = require('mongodb');

var publish = function() {
  var args = [].slice.call(arguments);
  var next = args.pop();
  var filter = args.shift() || {};
  if ('function' !== typeof(next)) {
    throw('Callback function not defined');
  }
  mongo.MongoClient.connect('mongodb://localhost/escrape', function(err, db) {
    if (err) { return console.error('error:', err); }
    db.collection('status', function(err, collection) {
      if (err) { return console.error('error:', err); }
      var cursor = collection.find(filter).sort({$natural: -1}).limit(1);
      cursor.nextObject(function(err, item) { // item is latest one
        if (err) { return console.error('error:', err); }
        if (item) {
          filter._id = { $gt: item._id }
        }
        var cursorOptions = {
          tailable: true,
          awaitdata: true,
          numberOfRetries: -1
        };
        var stream = collection.find(filter, cursorOptions)./*sort({ $natural: -1 }).*/stream();
        stream.on('data', next);
        stream.on('error', function(val) {
          if (val.message !== 'No more documents in tailed cursor') {
            console.error(val.message);
          }
          stream.destroy();
          subscribe();
        });
      });
    });
  });
};

function subscribe() { // subscribe to new messages
  publish(
    function(document) {
      console.log(document.message);
    }
  );
}

subscribe();
