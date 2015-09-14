var mongo = require('mongodb');

var Server = mongo.Server;
var Db = mongo.Db;

var server = new Server('localhost', 27017, {
  auto_reconnect: true,
  noDelay: true,
  connectTimeoutMS: 0,
  socketTimeoutMS: 0,
});
var db = new Db('escrape', server);

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

function cleanup() {
  if (opened) {
    db.close();
  }
  process.exit(0);
}

db.open(function(err, db) {
  if (!err) {
    console.log("Connected to 'escrape' database");
    db.collection('persons', { strict: true }, function(err, collection) {
      if (err) {
        console.log("The 'persons' collection doesn't exist. Creating it with sample data...");
        populateDB();
      }
    });
  } else {
    console.error('db open error:', err);
  }
});

exports.sync = function(req, res) {
  db.collection('persons', function(err, collection) {
    collection.find().toArray(function(err, items) {
      res.send(items);
    });
  });
};

exports.findAll = function(req, res) {
  db.collection('persons', function(err, collection) {
    collection.find().toArray(function(err, items) {
      res.send(items);
    });
  });
};

exports.findById = function(req, res) {
  var id = req.params.id;

  console.log('Retrieving person: ' + id);
  db.open(function(err, db) {
    if (err) {
      console.error('db open error:', err);
    } else {
      db.collection('persons', function(err, collection) {
        var o_id = new mongo.ObjectID(id);
        collection.find({ '_id': o_id }, function(err, cursor) { 
          cursor.toArray(function (err, results) {
            console.log('array:', results);
            res.send(results);
          });
        });
      });
    }
  });
};

exports.add = function(req, res) {
  var person = req.body;
  console.log('Adding person: ' + JSON.stringify(person));
  db.collection('persons', function(err, collection) {
    collection.insert(person, { safe: true }, function(err, result) {
      if (err) {
        console.log('Error adding person:', err);
        res.send({ 'error': 'An error has occurred:' + err});
      } else {
        console.log('Success: ' + JSON.stringify(result[0]));
        res.send(result[0]);
      }
    });
  });
}

exports.update = function(req, res) {
  var id = req.params.id;
  var person = req.body;
  console.log('Updating person: ' + id);
  console.log(JSON.stringify(person));
  db.collection('persons', function(err, collection) {
    collection.update({ '_id': new BSON.ObjectID(id) }, person, { safe: true }, function(err, result) {
      if (err) {
        console.log('Error updating person:', err);
        res.send({ 'error': 'An error has occurred' + err });
      } else {
        console.log('' + result + ' document(s) updated');
        res.send(person);
      }
    });
  });
}

exports.delete = function(req, res) {
  var id = req.params.id;
  console.log('Deleting person: ' + id);
  db.collection('persons', function(err, collection) {
    collection.remove({ '_id': new BSON.ObjectID(id)}, { safe: true }, function(err, result) {
      if (err) {
        console.log('Error deleting person:', err);
        res.send({ 'error': 'An error has occurred:' + err});
      } else {
        console.log('' + result + ' document(s) deleted');
        res.send(req.body);
      }
    });
  });
}

/*--------------------------------------------------------------------------------------------------------------------*/
// Populate database with sample data; only used once: the first time the application is started.
var populateDB = function() {
  var persons = [
    {
      name: "CHATEAU DE SAINT COSME",
      year: "2009",
      grapes: "Grenache / Syrah",
      country: "France",
      region: "Southern Rhone",
      description: "The aromas of fruit and spice...",
      picture: "saint_cosme.jpg"
    },
    {
      name: "LAN RIOJA CRIANZA",
      year: "2006",
      grapes: "Tempranillo",
      country: "Spain",
      region: "Rioja",
      description: "A resurgence of interest in boutique vineyards...",
      picture: "lan_rioja.jpg"
    }
  ];

  db.collection('persons', function(err, collection) {
    collection.insert(persons, { safe: true }, function(err, result) {});
  });

};