var
  mongoose = require('mongoose'),
  config = require('../config') // global configuration
;

var providerSchema = new mongoose.Schema({
  type: String,
  key: String,
  url: String,
  urlFake: String,
  language: String,
  listCategories: Object,
  selectors: Object,
  dateOfLastSync: { type: Date },
});

var Provider = mongoose.model('Provider', providerSchema);

var objectId = mongoose.Types.ObjectId;

mongoose.connection.on('open', function () {

  // TODO: ALWAYS POPULATE PROVIDERS !!!!!!!!!!! (?)

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

var populateProviders = function(callback) {

  var providers = [
    {
      '_id': new objectId,
      'type': 'persons',
      'key': 'SGI',
      'url': 'http://www.sexyguidaitalia.com',
      'urlFake': 'http://localhost/data/providers/SGI',
      'language': 'it',
      'dateOfLastSync': new Date(0),
      'listCategories': {
        'females': {
          'path': '/escort/', // TODO: which path? list path or details path? differentiate?
          'selectors': {
            'category': 'li[id="ctl00_escort"]',
            'listCities': 'li',
          },
        },
      },
      'selectors': {
        'listElements': 'a[itemprop=url][href^="annuncio/"]',
        'element': {
          'name': 'td[id="ctl00_content_CellaNome"]',
          'zone': 'td[id="ctl00_content_CellaZona"]',
          'description': 'td[id="ctl00_content_CellaDescrizione"]',
          'phone': 'td[id="ctl00_content_CellaTelefono"]',
          'photos': 'a[rel="group"][class="fancybox"]',
        },
      },
    },
    {
      '_id': new objectId,
      'type': 'persons',
      'key': 'TOE',
      'url': 'http://www.torinoerotica.com',
      'urlFake': 'http://localhost/data/providers/TOE',
      'language': 'it',
      'dateOfLastSync': new Date(0),
      'listCategories': {
        'females': {
          'path': '/annunci-escort-donna/',
          'selectors': {
            'category': 'li[id="ctl00_escort"]',
            'listCities': 'li',
          },
        },
      },
      'selectors': {
        'listElements': 'div[id="row-viewmode"] > div > div[class~="/pi-img-shadow"]',
        'element': {
          'name': 'h1[class~="titolo"]',
          'zone': 'a > span > i[class="icon-location"]',
/*
          <a href="#" title="Espandi">
                                <span class="pi-accordion-toggle"></span><i class="icon-location pi-icon-left"></i> Location (Pozzo Strada)
                                </a>
*/
          'description': 'p[class="annuncio"]',
          'phone': 'span[title^="Telefono"]',
          'photos': 'div[id="links"] > a',
        },
      },
    },
    {
      '_id': new objectId,
      'type': 'comments',
      'key': 'GF',
    },
  ];

  Provider.create(providers, function(err, provider) {
    if (err) {
      console.error(err);
    }
    callback(null, providers);
  });
};