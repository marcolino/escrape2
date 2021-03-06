var
  mongoose = require('mongoose'), // mongo abstraction
  cheerio = require('cheerio'), // to parse fetched DOM data
  request = require('request'), // to request external data
  randomUseragent = require('random-useragent'), // to use a random user-agent
  agent = require('socks5-http-client/lib/Agent'), // to be able to proxy requests
  config = require('../config') // global configuration
;

var exports = {};
var locals = {};
        
/*
exports.getAll = function(req, res, next) { // GET all providers
  mongoose.model('Provider').find({}, function(err, providers) {
    if (err) {
      console.error('Error retrieving providers:', err);
      res.json({ error: err });
    } else {
      console.log('GET providers: ' + providers);
      res.json(providers);
    }   
  });
}
*/

exports.getAll = function(req, res, next) { // GET all providers
  locals.getAll(function(err, providers) {
    if (err) {
      console.error('Error retrieving providers:', err);
      res.json({ error: err });
    } else {
      console.log('GET providers: ' + providers);
      res.json(providers);
    }   
  });
}

locals.getAll = function(result) { // GET all providers
  mongoose.model('Provider').find({}, function(err, providers) {
    result(err, providers);
  });
}

exports.syncPlaces = function(req, res) { // GET to sync persons
  // ... parsePlaces($, provider, config);

  function parsePlaces($, provider, config) {
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
};

exports.syncPersons = function(req, res) { // GET to sync persons
console.log('1111111111');
return;
  var persons = [];
  var n = 0;

  //var providers = exports.getProviders(req, res); // GET all providers
  locals.getAll(function(err, providers) { // GET all providers
    if (err) {
      console.error('Error retrieving providers:', err);
      res.json({ error: err });
    } else {
console.log('getAll', 'providers:', providers);
      /*
       * providers are expected to publish a main page containing
       * a list with each person link, pointing to each person detail page
       */
    
      // loop to get list page from all providers
      providers.forEach(function(provider) {
        console.log('provider:', provider.key);
        var url = provider.url + provider.listCategories[config.category].path; // + config.city;
    
        sfetch(url,
          function(err) { // error
            console.error('Error syncing provider ' + provider.key + ':', err);
            res.json({ error: err });
          },
          function(contents) { // success
console.log('getAll', url, 'contents:', contents);
            $ = cheerio.load(contents);
    
            // loop to get each element url (person url)
            $(provider.selectors.listElements).each(function(i, element) {
              var person = {};
              person.url = parseUrl(element, provider, config);
              //persons.push(person); // add this person to persons list
              person.key = parseKey(element, provider);
console.log('FETCHING person url:', person.url);
              sfetch(person.url,
                function(err) { // error
                  console.error('Error fetching provider ' + provider.key + ', person ' + person.key + ':', err);
                  //res.json({ error: err });
                  return true; // TODO: always put "return true/false;" in "function (err)" in a loop...
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
                  /*
                  if (i >= persons.length) {
                    if (config.debug) { // DEBUG ONLY
                      console.log('number of persons found is', i);
                      console.log('persons found are:', persons);
                    }
                    res.json(i);
                  }
                  */
                }
              );
            });
          }
        );
      });
    }
  });

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
      val = provider.url + provider.listCategories[config.category].path + $.attribs.href;
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

};

exports.syncComments = function(req, res) { // GET to sync comments
};

/*
exports.status = function(req, res) { // GET providers status
  mongoose.model('Status').find({ 'key': 'current' }, function(err, currentStatus) {
    if (err) {
      console.error('Error retrieving current status:', err);
      res.json({ error: err });
    } else {
      console.log('current status: ' + currentStatus);
      res.json(currentStatus);
    }   
  });
};
*/

// TODO: put this in network-controller.js
function sfetch(url, error, success) { // fetch url contents, securely
  var options = {
    url: url,
    /*
    agentClass: agent,
    agentOptions: {
      socksHost: config.tor.host,
      socksPort: config.tor.port,
    },
    headers: {
      'User-Agent': randomUseragent.getRandom(),
    }
    */
  };
  if (!config.local) { // not local, use TOR
    options.agentClass = agent;
    options.agentOptions = {
      socksHost: config.tor.host,
      socksPort: config.tor.port,
    };
    options.headers = {
      'User-Agent': randomUseragent.getRandom(),
    };

  }
  console.info('requesting url:' + url);
  request(options, function(err, response, contents) {
    if (err) {
      //console.error('Request error:', err);
      error(err);
    } else {
      if (response.statusCode !== 200) {
        //console.error('Request status code:', response.statusCode);
        var err = new Error('Request error');
        err.status = response.statusCode;
        error(err);
      } else {
        //console.log('Request response: ', contents);
        return success(contents);
      }
    }
  });
}


module.exports = exports;