'use strict';

var mongo = require('mongodb') // MongoDB database
  , fs = require('fs') // to read static files
  , io = require('socket.io') // socket io server
  , http = require('http') // http server
;

var mongodbUri = 'mongodb://localhost/escrape';

var app = http.createServer(handler);
io = io.listen(app);
app.listen(3003);
console.log('http server on port 3003');

function handler(req, res){
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    res.writeHead(200);
    res.end(data);
  });
}

mongo.MongoClient.connect(mongodbUri, function(err, db) {

  db.collection('status', function(err, collection) {
console.log('db collection status opened');

    // open socket
    io.sockets.on('connection', function (socket) {
      // open a tailable cursor
      console.log('== open tailable cursor');
      collection.find(
        {}, {
          tailable: true,
          awaitdata: true,
          numberOfRetries: -1
        }
      ).sort(
        { $natural: 1 }
      ).each(function(err, doc) {
        console.log(doc);
        // send message to client
        //if (doc.type === 'message') {
          socket.emit('message', doc);
        //}
      })

    });

  });

});