var mongo = require("mongodb");

var mongodbUri = "mongodb://127.0.0.1/escrape";

mongo.MongoClient.connect (mongodbUri, function (err, db) {

  db.collection('messages', function(err, collection) {
    // open a tailable cursor
    if (err) {
      return console.error('error in messages collection:', err);
    }
    //console.log("== open tailable cursor");
    collection.find(
      {},
      { tailable: true, awaitdata: true, numberOfRetries: -1 }
    ).each(function(err, doc) {
      if (err) {
        if (err.message === 'No more documents in tailed cursor') {
          console.log('...');
        } else {
          return console.error('error in messages collection scan:', err);
        }
        return;
      }
      console.log('type of document:', doc.type);
    })
  });

});