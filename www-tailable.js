
"use strict";

var mongo = require("mongodb"),
    fs = require("fs"),         // to read static files
    io = require("socket.io"),  // socket io server
    http = require("http");

var mongodbUri = "mongodb://localhost/escrape";

var app = http.createServer(handler);
io = io.listen(app);
app.listen(3333);
console.log("http server on port 3333");

function handler(req, res){
  fs.readFile(__dirname + "/index.html",
  function (err, data) {
    res.writeHead(200);
    res.end(data);
  });
}

mongo.MongoClient.connect (mongodbUri, function (err, db) {

  db.collection('messages', function(err, collection) {

    // open socket
    io.sockets.on("connection", function (socket) {
      // open a tailable cursor
      console.log("== open tailable cursor");
      //collection.find({}, {tailable:true, awaitdata:true, numberOfRetries:-1}).sort({ $natural: 1 }).each(function(err, doc) {
      collection.find({}, {tailable:true, awaitdata:true, numberOfRetries:-1}).each(function(err, doc) {
        console.log(doc);
        // send message to client
        if (!err) {
          if (doc.type == "init") {
            console.log('EMITTING');
            socket.emit("message", doc);
          }
        }
      })

    });

  });

});