var mongo = require('mongodb');

var mongodbUri = 'mongodb://127.0.0.1/escrape';

mongo.MongoClient.connect(mongodbUri, function (err, db) {

  db.collection('status', function(err, collection) {
    // open a tailable cursor
    if (err) {
      return console.error('error in status collection:', err);
    }
    console.log('opening tailable cursor');
    var filter = { date: { '$gte': Date.now() } };
    var options = { tailable: true, awaitdata: true, numberOfRetries: -1 };
    collection.find(
      filter,
      options
    ).each(function(err, doc) {
      if (err) {
        if (err.message === 'No more documents in tailed cursor') {
          console.log('no more documents in tailed cursor');
        } else {
          console.error('error in status collection scan:', err);
          return false;
        }
      } else {
        if (doc) {
          console.log('message:', doc.message);
        }
      }
    })
  });

});