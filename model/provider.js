var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var providerSchema = new mongoose.Schema({
  key: String,
  url: String,
  listCategories: Object,
  selectors: Object,
  dateOfLastSync: { type: Date },
});

var Provider = mongoose.model('Provider', providerSchema);

var populateProviders = function(callback) {
  var providerIds = [ new ObjectId, new ObjectId ];
  var providers = [];

  providers.push({
  	_id: providerIds[0],
    key: 'SGI',
    dateOfLastSync: new Date(0),
  });
  providers.push({
  	_id: providerIds[1],
    key: 'TOE',
    dateOfLastSync: new Date(0),
  });

  Provider.create(providers, function(err, provider) {
    if (err) {
      console.error(err);
    }
    callback(null, providerIds);
  });
};

mongoose.connection.on('open', function () {
  Provider.findOne({}, function (err, result) { // check if Provider collection is empty
    if (err) {
      console.error(err);
    }
    if (!result) { // Provider collection is empty: populate it
      populateProviders(function(err, result) {
        if (err) {
          console.error('Error populating providers:', err);
        }
        console.log('Populated providers...');
      });
    }
  });
});