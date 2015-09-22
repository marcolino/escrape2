var
  mongoose = require('mongoose'),
  config = require('../config') // global configuration
;

// use LOG() to log only when debugging
var LOG = config.debug ? console.log.bind(console) : function() {};

var providerSchema = new mongoose.Schema({
  key: String,
  mode: String,
  type: String,
  url: String,
  language: String,
  dateOfLastSync: { type: Date },
  forbiddenRegexp: Object,
  categories: Object,
});

var objectId = mongoose.Types.ObjectId;

mongoose.connection.on('open', function () {
  // populate providers (if not in production...)
  populateProviders(function(err, result) {
    if (err) {
      return console.error('Error populating providers:', err);
    }
    console.log('Providers populated.');
  });
});

var populateProviders = function(callback) {
  var providers = [
    {
      //'_id': new objectId,
      'key': 'FORBES',
      'mode': 'fake',
      'type': 'persons',
      'url': 'http://it.wikipedia.org',
      'language': 'it',
      'dateOfLastSync': new Date(0),
      'forbiddenRegexp': { // TODO: verify this re...
        'body': 'forbidden, please complete captcha...',
        'flags': 'gim',
      },
      'categories': {
        'overall': {
          'path': '/wiki/Lista_delle_persone_pi%C3%B9_potenti_del_mondo_secondo_Forbes#2015', // TODO: which path? list path or details path? differentiate?
        },
        'women': {  
          'path': '/wiki/Lista_delle_100_donne_pi%C3%B9_potenti_del_mondo_secondo_Forbes#2015', // TODO: which path? list path or details path? differentiate?
        },
      },
    },
    {
      //'_id': new objectId,
      'key': 'SGI',
      'mode': 'normal',
      'type': 'persons',
      'url': 'http://www.sexyguidaitalia.com',
      'language': 'it',
      'dateOfLastSync': new Date(0),
      'forbiddenRegexp': { // TODO: verify this re...
        'body': 'forbidden, please complete captcha...',
        'flags': 'gim',
      },
      'categories': {
        'women': {
          'path': '/escort/', // TODO: which path? list path or details path? differentiate?
          //'selectors': {
          //  'category': 'li[id="ctl00_escort"]',
          //  'listCities': 'li',
          //},
        },
      },
    },
    {
      //'_id': new objectId,
      'key': 'TOE',
      'mode': 'normal',
      'type': 'persons',
      'url': 'http://www.torinoerotica.com',
      'language': 'it',
      'dateOfLastSync': new Date(0),
      'forbiddenRegexp': { // TODO: verify this re...
        'body': 'forbidden, please complete captcha...',
        'flags': 'gim',
      },
      'categories': {
        'women': {
          'path': '/annunci-escort-donna/',
          'selectors': {
            'category': 'li[id="ctl00_escort"]',
            'listCities': 'li',
          },
        },
      },
    },
    {
      '_id': new objectId,
      'key': 'GF',
      'type': 'comments',
      'mode': 'normal',
    },
  ];

  // add methods to provider schema
  providerSchema.methods.getList = function($) {
    var val = [];
    if (this.key === 'SGI') {
      $('a[itemprop=url][href^="annuncio/"]').each(function(index, element) {
        var key = '...';
        var url = $(element).attr('href');
        val.push({ key: key, url: url });
      });
    }
    if (this.key === 'TOE') {
      $('div[id="row-viewmode"] > div > div[class~="/pi-img-shadow"]').each(function(index, element) {
        var key = '...';
        var url = $(element).attr('href');
        val.push({ key: key, url: url });
      });      
    }
    if (this.key === 'FORBES') {
      $('h2 > span[id="2015"]').parent().next('div').find('ol > li > a:not([class])').each(function(index, element) {
        var key = $(element).attr('title');
        var url = $(element).attr('href');
        val.push({ key: key, url: url });
      });
    }
    return val;
  };

  providerSchema.methods.getDetailsName = function($) {
    var val = '';
    if (this.key === 'SGI') {
      var element = $('td[id="ctl00_content_CellaNome"]');
      if (element) {
        val = $(element).text();
      }
    }
    if (this.key === 'TOE') {
      var element = $('h1[class~="titolo"]');
      if (element) {
        val = $(element).text();
      }
    }
    if (this.key === 'FORBES') {
      var element = $('h1[id="firstHeading"]').each(function(index, element) {
        val = $(element).text();
      });
    }
    return val;
  };

  providerSchema.methods.getDetailsZone = function($) {
    var val = '';
    if (this.key === 'SGI') {
      var element = $('td[id="ctl00_content_CellaZona"]');
      if (element) {
        val = $(element).text();
      }
    }
    if (this.key === 'TOE') {
      var element = $('a > span > i[class="icon-location"]');
      if (element) {
        val = $(element).text();
      }
    }
    if (this.key === 'FORBES') {
      val = '';
    }
    return val;
  };

  providerSchema.methods.getDetailsDescription = function($) {
    var val = '';
    if (this.key === 'SGI') {
      var element = $('td[id="ctl00_content_CellaDescrizione"]');
      if (element) {
        val = $(element).text();
      }
    }
    if (this.key === 'TOE') {
      var element = $('p[class="annuncio"]');
      if (element) {
        val = $(element).text();
      }      
    }
    if (this.key === 'FORBES') {
      var element = $('table[class="sinottico"]').next('p');
      val = $(element).text();
    }
    return val;
  };

  providerSchema.methods.getDetailsPhone = function($) {
    var val = '';
    if (this.key === 'SGI') {
      var element = $('td[id="ctl00_content_CellaTelefono"]');
      if (element) {
        val = $(element).text();
      }
    }
    if (this.key === 'TOE') {
      var element = $('span[title^="Telefono"]');
      if (element) {
        val = $(element).text();
      }
    }
    if (this.key === 'FORBES') {
      val = '333.33333333';
    }
    return val;
  };

  providerSchema.methods.getDetailsPhotos = function($) {
    var val = [];
    if (this.key === 'SGI') {
      $('a[rel="group"][class="fancybox"]').each(function(index, element) {
        var src = $(element).attr('src');
        val.push(src);
      });
    }
    if (this.key === 'TOE') {
      $('div[id="links"] > a').each(function(index, element) {
        var src = $(element).attr('src');
        val.push(src);
      });
    }
    if (this.key === 'FORBES') {
      $('table[class="sinottico"]').find('tr').eq(1).find('a > img').each(function(index, element) {
        var src = $(element).attr('src');
        //LOG('photo src:', src);
        val.push(src);
      });
    }
    return val;
  };

  // create model from schema
  var Provider = mongoose.model('Provider', providerSchema);

  // populate model (remove ad create)
  Provider.remove({}, function(err) {
    if (err) {
      console.error('Provider collection could not be dropped/created; err is:', err);
      return;
    }

    // Provider collection dropped
    Provider.create(providers, function(err, provider) {
      if (err) {
        console.error(err);
        return;
      }
      callback(null, providers);
    });
  });
};