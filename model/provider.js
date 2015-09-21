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
  language: String,
  categories: Object,
  selectors: Object,
});

var Provider = mongoose.model('Provider', providerSchema);

var objectId = mongoose.Types.ObjectId;

mongoose.connection.on('open', function () {
  // TODO: check this is a good thing...
  // populate providers (if not in production...)
  populateProviders(function(err, result) {
    if (err) {
      return console.error('Error populating providers:', err);
    }
    console.log('Providers populated.');
  });
/*
  // TODO: ALWAYS POPULATE PROVIDERS !!!!!!!!!!! (if not in production...)
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
*/
});

var populateProviders = function(callback) {

  var providers = [
    {
      '_id': new objectId,
      'key': 'FORBES',
      'mode': 'fake',
      'type': 'persons',
      'url': 'http://it.wikipedia.org',
      'language': 'en',
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
          //'selectors': {
          //  'category': 'li[id="ctl00_escort"]',
          //  'listCities': 'li',
          //},
        },
      },
      'selectors': {
        //'elements': 'tbody[id="list-table-body"] > tr > td[class="name"] > a[href]',
        //'elements': 'span[id="2015"] ...
        //'elements': 'span[id="2015"]
        'elements': 'h2:contains("2015")', // div > ol > li > a', //' span[id="2015"] >> div[id="mw-content-text"] > div > ol > li > a[href]',
        'elements2': 'div[id="mw-content-text"] > div > ol > li > a[href]',
/*
<ol>
<li><a href="/wiki/Angela_Merkel" title="Angela Merkel">Angela Merkel</a> <a href="/wiki/File:Flag_of_Germany.svg" class="image" title="Germania"><img alt="Germania" src="//upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Flag_of_Germany.svg/20px-Flag_of_Germany.svg.png" class="noviewer thumbborder" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Flag_of_Germany.svg/30px-Flag_of_Germany.svg.png 1.5x, //upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Flag_of_Germany.svg/40px-Flag_of_Germany.svg.png 2x" data-file-width="1000" data-file-height="600" height="12" width="20"></a></li>
*/

/*
        <tbody id="list-table-body">     
        <tr class="data">
          <td class="image"><a href="/profile/vladimir-putin/?list=powerful-people" class="exit_trigger_set"><img src="http://i.forbesimg.com/media/lists/people/vladimir-putin_100x100.jpg" alt=""></a></td>
          <td class="rank">#1 </td>
          <td class="name"><a href="/profile/vladimir-putin/?list=powerful-people" class="exit_trigger_set">Vladimir Putin</a></td>
          <td>Russia</td>
          <td>62</td>
        </tr>
*/  
        'element': {
          'name': 'div[id="content"] > div[id="left_rail"] > div[class="main_info"] > div[class~="data"] > ul > li > h1',
          'zone': 'div[class~="data"] > dl > dt:contains("Citizenship") dd',
          'description': 'div[id="content"] > div[id="left_rail"] > div[class="profile"]',
          'phone': '',
          'photos': 'div[class="gallery_carousel"] > div > div > ul > li > a[href]',
        },
      },
    },

    {
      '_id': new objectId,
      'key': 'SGI',
      'mode': 'normal',
      'type': 'persons',
      'url': 'http://www.sexyguidaitalia.com',
      //'urlFake': 'http://localhost/data/providers/SGI',
      'language': 'it',
      'dateOfLastSync': new Date(0),
      'forbiddenRegexp': [ 'forbidden, please complete captcha...', 'gi' ], // TODO: check this...
      'categories': {
        'women': {
          'path': '/escort/', // TODO: which path? list path or details path? differentiate?
          'selectors': {
            'category': 'li[id="ctl00_escort"]',
            'listCities': 'li',
          },
        },
      },
      'selectors': {
        'elements': 'a[itemprop=url][href^="annuncio/"]',
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
      'key': 'TOE',
      'mode': 'normal',
      'type': 'persons',
      'url': 'http://www.torinoerotica.com',
      //'urlFake': 'http://localhost/data/providers/TOE',
      'language': 'it',
      'dateOfLastSync': new Date(0),
      'forbiddenRegexp': [ 'forbidden, please complete captcha...', 'gi' ], // TODO: check this...
      'categories': {
        'women': {
          'path': '/annunci-escort-donna/',
          'selectors': {
            'category': 'li[id="ctl00_escort"]',
            'listCities': 'li',
          },
        },
      },
      'selectors': {
        'elements': 'div[id="row-viewmode"] > div > div[class~="/pi-img-shadow"]',
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
      'key': 'GF',
      'type': 'comments',
      'mode': 'normal',
    },
  ];

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