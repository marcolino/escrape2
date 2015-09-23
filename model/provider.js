var
  mongoose = require('mongoose'),
  config = require('../config') // global configuration
;
var exports = {}; // ???
var internals = {};

//// use LOG() to log only when debugging
//var LOG = config.debug ? console.log.bind(console) : function() {};

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

//var objectId = mongoose.Types.ObjectId; // ???

var Providers; // providers model; assign it in populateProviders method

mongoose.connection.on('open', function () {
  // populate providers (if not in production...)
  internals.populateProviders(function(err, result) {
    if (err) {
      return console.error('Error populating providers:', err);
    }
    // create model from schema
    Provider = mongoose.model('Provider', result.schema);

    // create providers
    internals.createProviders(result.providers, function(err, result) {
      if (err) {
        return console.error('Error creating providers:', err);
      }
      console.log('Providers populated.');
    });
  });
});

mongoose.connection.on('error', function(err) {
  console.error('MONGOOSE CONNECTION ERROR:', err);
});

internals.populateProviders = function(callback) {
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
      'forbiddenRegexp': { // TODO: verify this re... - TODO: WE DON'T NEED THIS...
        'body': 'forbidden, please complete captcha...',
        'flags': 'gim',
      },
      'categories': {
        'women': {
          'path': '/escort/', // TODO: which path? list path or details path? differentiate?
          'selectors': {
            'category': 'li[id="ctl00_escort"]',
            'listCities': 'li',
          },
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
      //'_id': new objectId,
      'key': 'GF',
      'type': 'comments',
      'mode': 'normal',
    },
  ];

  var methods = {};

  // define methods to be added to schema
  methods.getList = function($) {
    var val = [];
    if (this.key === 'SGI') {
      $('a[itemprop="url"]').each(function(index, element) {
        var url = $(element).attr('href');
        var key = url; // TODO: parse 'adv2787' from 'annuncio/adv2787' ...
        val.push({ key: key, url: url });
      });
    }
    if (this.key === 'TOE') {
      $('div[id="row-viewmode"] > div > div[class~="/pi-img-shadow"]').each(function(index, element) {
        var url = $(element).attr('href');
        var key = '...';
        val.push({ key: key, url: url });
      });      
    }
    if (this.key === 'FORBES') {
      $('h2 > span[id="2015"]').parent().next('div').find('ol > li > a:not([class])').each(function(index, element) {
        var url = $(element).attr('href');
        var key = $(element).attr('title');
        val.push({ key: key, url: url });
      });
    }
    return val;
  };

  methods.getDetailsName = function($) {
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

  methods.getDetailsZone = function($) {
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

  methods.getDetailsDescription = function($) {
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

  methods.getDetailsPhone = function($) {
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

  methods.getDetailsPhotos = function($) {
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
        val.push(src);
      });
    }
    return val;
  };

  for (var method in methods) {
    try {
      if (typeof(methods[method]) == "function") {
        providerSchema.methods[method] = methods[method];
      }
    } catch (err) {
      console.error('method', method, "is inaccessible");
    };
  }

/*
  // create model from schema
  Provider = mongoose.model('Provider', providerSchema);

*/

  var result = {};
  result.providers = providers;
  result.schema = providerSchema;
  callback(null, result);
};

internals.createProviders = function(providers, callback) {
  // populate model (remove ad create)
  Provider.remove({}, function(err) {
    if (err) {
      //console.error('Provider collection could not be dropped/created; err is:', err);
      return callback(err);
    }
  
    // Provider collection dropped
    Provider.create(providers, function(err, provider) {
      if (err) {
        return callback(err);
      }
      callback(null, provider);
    });
  });
}