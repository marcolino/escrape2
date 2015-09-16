var express = require('express'), // express
    mongoose = require('mongoose'), // mongo abstraction
    cheerio = require('cheerio'), // to parse fetched DOM data
    request = require('request'), // to request external data
    random_useragent = require('random-useragent'), // to use a random user-agent
    Agent = require('socks5-http-client/lib/Agent'), // to be able to proxy requests
    config = require('../config') // global configuration
;

var router = express.Router(); // express router

var providers = [
  {
    'key': 'SGI',
    'url': config.local ? 'http://localhost/data/SGI' : 'http://www.sexyguidaitalia.com',
    'listCategories': {
      'females': {
        'path': '/escort/',
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
        'sex': 'td[id="ctl00_content_CellaSesso"]',
        'zone': 'td[id="ctl00_content_CellaZona"]',
        'description': 'td[id="ctl00_content_CellaDescrizione"]',
        'phone': 'td[id="ctl00_content_CellaTelefono"]',
        'photos': 'a[rel="group"][class="fancybox"]',
      },
    },
  },
];

router.route('/').get(function(req, res, next) { // GET all providers
  // retrieve all persons from mongo database
  mongoose.model('Provider').find({}, function(err, providers) {
    if (err) {
      console.error('There was a problem retrieving providers:', err);
      err.context = 'get /';
      res.json(err);
    } else {
      console.log('GET providers: ' + providers);
      res.json(providers);
    }   
  });
});

router.get('/sync', function(req, res) { // GET to sync persons
  var persons = [];
  var n = 0;

  /*
   * providers are expected to publish a main page containing
   * a list with each person link, pointing to each person detail page
   */

  // loop to get list page from all providers
  providers.forEach(function(provider) {
    console.log('provider:', provider.key);
    var url = provider.url + provider.listCategories[config.category].path + '/' + config.city;

    sfetch(url,
      function(err) { // error
        console.error('provider ' + provider.key + ' page error:', err);
        res.send('There was a problem syncing provider ' + provider.key);
      },
      function(contents) { // success
        $ = cheerio.load(contents);

        // loop to get each element url (person url)
        $(provider.selectors.listElements).each(function(i, elemement) {
          var person = {};
          person.url = parseUrl(element, provider, config);
          persons.push(person); // add this person to persons list
        });
      }
    );
  });

  // loop to get each element details (person details)
  var i = 0;
  persons.forEach(function(person) {
    i++;
    person.key = parseKey(element, provider);
    sfetch(person.url,
      function(err) { // error
        console.error('provider ' + provider.key + ', person ' + person.key + ' page error:', err);
        res.send('There was a problem syncing provider ' + provider.key + ', person ' + person.key + ' page');
      },
      function(contents) {
        console.info('person ' + person.key + ' found');
        $ = cheerio.load(contents);
        person.name = parseName($, provider);
        person.sex = parseSex($, provider);
        person.zone = parseZone($, provider);
        person.description = parseDescription($, provider);
        person.phone = parsePhone($, provider);
        person.photos = parsePhotos($, provider);
        persons.push(person); // add this person to persons list
        if (i >= persons.length) {
          if (config.debug) { // DEBUG ONLY
            console.log('number of persons found is', i);
            console.log('persons found are:', persons);
          }
          res.json(i);
        }
      }
    );
  });

  function parseCities($, provider, config) {
    var val = {};
    if (provider.key === 'SGI') {
      $(provider.listCategories[config.category].selectors.category + ' > ul > li > a').each(function() {
        var region = $(this).text();
        var city = $(this).next('ul').find('li a').map(function() {
          return $(this).text();
        }).get();
        val[region] = city;
      });
    }
    return val;
  }
  
  function parseKey($, provider) {
    var val;
    if (provider.key === 'SGI') {
      val = $.attribs.href.substr($.attribs.href.lastIndexOf('/') + 1);
    }
    return val;
  }

  function parseUrl($, provider, config) {
    var val;
    if (provider.key === 'SGI') {
      val = provider.url + provider.listCategories[config.category].path + 'torino/' + $.attribs.href;
    }
    return val;
  }
  
  function parseName($, provider) {
    return $(provider.selectors.element.name).text();
  }
  
  function parseSex($, provider) {
    var val = $(provider.selectors.element.sex).text();
    return (
      (val === 'F') ?  'F' :
      (val === 'M') ?  'M' :
      (val === 'TX') ? 'TX' :
                       '?'
    );
  }
  
  function parseZone($, provider) {
    return $(provider.selectors.element.zone).text();
  }
  
  function parseDescription($, provider) {
    var val = $(provider.selectors.element.description).html();
    val = val.replace(/<br>.*$/, ''); // remove trailing fixed part
    val = val.replace(/\r+/, ''); // remove CRs
    val = val.replace(/\n+/, '\n'); // remove multiple LFs
    return val;
  }
  
  function parsePhone($, provider) {
    var val = $(provider.selectors.element.phone).text();
    val = val.replace(/[^\d]/, '');
    return val;
  }
  
  function parsePhotos($, provider) {
    var val = [];
    // loop to get each photo
    $(provider.selectors.element.photos).each(function(i, elem) {
      var href = elem.attribs.href;
      href = href.replace(/(\.\.\/)+/, ''); // remove relative paths
      href = href.replace(/\?.*$/, ''); // remove query string
      val.push(href);
    });
    return val;
  }

});

function sfetch(url, error, success) { // fetch url contents, securely
  var options = {
    url: url,
    agentClass: Agent,
    agentOptions: {
      socksHost: config.tor.host,
      socksPort: config.tor.port,
    },
    headers: {
      'User-Agent': random_useragent.getRandom(),
    }
  };

  request(options, function(error, response, contents) {
    if (error) {
      console.error('Get error:', error);
      error(error);
    }
    if (response.statusCode !== 200) {
      console.error('Get status code:', response.statusCode);
    }
    //console.info(contents);
    return success(contents);
  });
}


// export all router methods
module.exports = router;