var
  mongoose = require('mongoose'), // mongo abstraction
  cheerio = require('cheerio'), // to parse fetched DOM data
//  request = require('request'), // to request external data
//  randomUseragent = require('random-useragent'), // to use a random user-agent
//  agent = require('socks5-http-client/lib/Agent'), // to be able to proxy requests
  async = require("async"), // to call many async functions in a loop
  network = require('./network-controller'), // network handling
  config = require('../config') // global configuration
;
var exports = {};
var internals = {};
        
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
  internals.getAll(function(err, providers) {
    if (err) {
      console.error('Error retrieving providers:', err);
      res.json({ error: err });
    } else {
      console.log('GET providers: ' + providers);
      res.json(providers);
    }   
  });
}

internals.getAll = function(filter, result) { // GET all providers
  mongoose.model('Provider').find(filter, function(err, providers) {
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
  var persons = [];
  var n = 0;

  internals.getAll({ type: 'persons', key: 'TOE' }, function(err, providers) { // GET all providers
    if (err) {
      console.error('Error retrieving providers:', err);
      res.json({ error: err });
    } else {

      /*
       * providers are expected to publish a main page containing
       * a list with each person link, pointing to each person detail page
       */
    
      // loop to get list page from all providers
      async.each(
        providers, // 1st param in async.each() is the array of items
        function(provider, callbackOuter) { // 2nd param is the function that each item is passed to
          console.log('provider:', provider.key);
          // TODO: 'url =' in a method dependent by provider.key...
          var url
          if (provider.key === 'SGI') {
            url = (config.fake ? provider.urlFake : provider.url) + provider.listCategories[config.category].path + config.city;
          }
          if (provider.key === 'TOE') {
            url = (config.fake ? provider.urlFake : provider.url) + provider.listCategories[config.category].path;
          }
console.log('provider url:', url);
          network.sfetch(
            url,
            function(err) { // error
              console.error('Error syncing provider ' + provider.key + ':', err);
              res.json({ error: err });
            },
            function(contents) { // success
              //console.log('getAll', url, 'contents:', contents);
              $ = cheerio.load(contents);
    
              // loop to get each element url (person url)
              var list = parseList($, provider);
console.log('LIST:', provider.key, list);
              async.each(
                list, // 1st param in async.each() is the array of items
                function(element, callbackInner) { // 2nd param is the function that each item is passed to
                  var person = {};
                  person.url = parseUrl(element, provider, config);
console.log('ELEMENT:', provider.key, element);
                  person.key = parseKey(element, provider);
                  //console.log('FETCHING person url:', person.url);
                  network.sfetch(
                    person.url,
                    function(err) { // error
                      console.error('Error fetching provider ' + provider.key + ', person ' + person.key + ':', err);
                    },
                    function(contents) {
                      $ = cheerio.load(contents);
                      person.name = parseName($, provider);
console.log('person', person.key, '(' + person.name + ')', 'found');
                      person.sex = parseSex($, provider);
                      person.zone = parseZone($, provider);
                      person.description = parseDescription($, provider);
                      person.phone = parsePhone($, provider);
                      person.photos = parsePhotos($, provider);
                      persons.push(person); // add this person to persons list
                      // TODO: save this person to database
                      callbackInner();
                    }
                  );
                },
                function(err) { // 3rd param is the function to call when everything's done (callback)
                  if (err) {
                    console.error('Error in the final internal async callback:', err);
                  } else {
                    // all tasks are successfully done now
                    callbackOuter();
                  }
                }
              );
            }
          );
        },
        function(err) { // 3rd param is the function to call when everything's done (callback)
          if (err) {
            console.error('Error in the final external async callback:', err);
          } else {
            // all tasks are successfully done now
            res.json(persons.length);
          }
        }
      );
    }
  });

  function parseList($, provider) {
    var val;
    if (provider.key === 'SGI') {
      val = $(provider.selectors.listElements);
    }
    if (provider.key === 'TOE') {
      var val = [];
      $(provider.selectors.listElements).find('div > div > a').each(function (index, element) {
        val.push($(element).attr('href'));
      });
      console.dir(val);
    }
    return val;
  }

  function parseKey($, provider) {
    var val;
    if (provider.key === 'SGI') {
      val = $.attribs.href.substr($.attribs.href.lastIndexOf('/') + 1);
    }
    if (provider.key === 'TOE') {
//console.log('ELEMENT xx:', provider.key, $);
      val = $; //.attribs.href.substr($.attribs.href.lastIndexOf('/') + 1);
//console.log('ELEMENT xx:', provider.key, val);
//console.log('parseKey', provider.key, val);
      var regex = /id=(.*)$/; // keep only leading not lower case
      val = val.match(regex)[1]; // TODO...
console.log('ELEMENT xx:', provider.key, val);
    }
console.log(' * parseKey', provider.key, val);
    return val;
  }

  function parseUrl($, provider, config) {
    var val;
    if (provider.key === 'SGI') {
      val = (config.fake ? provider.urlFake : provider.url) + provider.listCategories[config.category].path + $.attribs.href;
    }
    if (provider.key === 'TOE') {
      val = (config.fake ? provider.urlFake : provider.url) + provider.listCategories[config.category].path; // + $.attribs.href;
    }
//console.log('parseUrl', provider.key, val);
    return val;
  }
  
  function parseName($, provider) {
    var val;
    if (provider.key === 'SGI') {
      val = $(provider.selectors.element.name).text();
      val = val.trim(); // trim value
    }
    if (provider.key === 'TOE') {
      val = $(provider.selectors.element.name).text();
console.log('parseName', provider.key, val);
      var regex = /^([^a-z]+)/; // keep only leading not lower case
      val = val.match(regex).trim(); // trim value
    }
    return val;
  }
  
  function parseSex($, provider) {
    var val = $(provider.selectors.element.sex).text();
    return val ? (
      (val === 'F') ?  'F' :
      (val === 'M') ?  'M' :
      (val === 'TX') ? 'TX' :
                       '?'
    ) : null;
  }
  
  function parseZone($, provider) {
    return $(provider.selectors.element.zone).text();
  }
  
  function parseDescription($, provider) {
    var val = $(provider.selectors.element.description).html();
    return val ? (
      val.
        replace(/<br>.*$/, ''). // remove trailing fixed part
        replace(/\r+/, ''). // remove CRs
        replace(/\n+/, '\n') // remove multiple LFs
    ) : null;
  }
  
  function parsePhone($, provider) {
    var val = $(provider.selectors.element.phone).text();
    return val ? (
      val.
        replace(/[^\d]/, '')
    ) : null;
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

exports.syncComments = function(req, res) { // sync comments
  // TODO
};

exports.status = function(req, res) { // GET providers status
  mongoose.model('Globals').find({ 'key': 'status-current' }, function(err, currentStatus) {
    if (err) {
      console.error('Error retrieving current status:', err);
      res.json({ error: err });
    } else {
      console.log('current status: ' + currentStatus);
      res.json(currentStatus);
    }   
  });
};

module.exports = exports;