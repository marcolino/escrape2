var express = require('express'), // express
    mongoose = require('mongoose'), // mongo abstraction
    bodyParser = require('body-parser'), // to parse information from POST
    methodOverride = require('method-override') // to manipulate POST
    cheerio = require('cheerio'), // to parse fetched DOM data
    request = require('request'), // to request external data
    random_useragent = require('random-useragent'), // to use a random user-agent
    Agent = require('socks5-http-client/lib/Agent') // to be able to proxy requests
;

// TODO: externalize these
var setup = {
  local: true,
  debug: true,
  category: 'females',
  city: 'torino',
  tor: {
    host: 'localhost',
    port: 9050,
  },
};
 
var providers = [
  {
    'key': 'SGI',
    'url': 'http://www.sexyguidaitalia.com',
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

var router = express.Router(); // express router

router.use(bodyParser.urlencoded({ extended: true }))

router.use(methodOverride(function(req, res) { // method verride for clients supporting only POST method
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    // look in urlencoded POST bodies and delete it
    var method = req.body._method;
    delete req.body._method;
    return method;
  }
}));

router.route('/').get(function(req, res, next) { // GET all persons
  // retrieve all persons from mongo database
  mongoose.model('Person').find({}, function(err, persons) {
    if (err) {
      console.error('There was a problem retrieving persons:', err);
    } else {
      res.json(persons);
    }   
  });
});

router.route('/').post(function(req, res) { // POST a new person
/*
  var name = req.body.name;
  var vote = req.body.vote;
  var dateofcreation = req.body.dateofcreation;
  var company = req.body.company;
  var isloved = req.body.isloved;
*/
  var record = {
    name: req.body.name,
    vote: req.body.vote,
    dateofcreation: req.body.dateofcreation,
    company: req.body.company,
    isloved: req.body.isloved,
  };

/*
  mongoose.model('Person').create({
    name: name,
    vote: vote,
    dateofcreation: dateofcreation,
    isloved: isloved
  }, function(err, person) {
*/
  mongoose.model('Person').create(record, function(err, person) {
    if (err) {
      res.send("There was a problem adding a person to the database:", err);
    } else { // person has been created
      console.log('POST creating new person: ' + person);
      res.json(person);
    }
  })
});

// GET new person page
router.get('/new', function(req, res) {
  res.render('persons/new', { title: 'Add New Person' });
});

router.get('/sync', function(req, res) { // GET to sync persons
  var persons = [];
  var n = 0;

  providers.forEach(function(provider) {
console.log('provider:', provider.key);
      var url = provider.url + provider.listCategories[setup.category].path + '/' + setup.city;

    //console.log('url:', 'http://www.sexyguidaitalia.com/escort/torino');
    //sfetch('http://www.sexyguidaitalia.com/escort/torino', // TODO...
    sfetch(url,
      function(err) { // error
        console.error('provider ' + provider.key + ' page error:', err);
        res.send('There was a problem syncing provider ' + provider.key);
      },
      function(contents) { // success
console.log('url ok');
        $ = cheerio.load(contents);

        // loop to get each element
        $(provider.selectors.listElements).each(function(i, elem) {
          var person = {};
          person.url = parseUrl(elem, provider, setup);
          person.key = parseKey(elem, provider);
//console.log('5', person.url);
//res.json(i);
//return false;
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
              n++; // increment persons counter
              if (0/*<FINISHED>*/) {
                if (setup.debug) { // DEBUG ONLY
                  console.log('number of persons found is', n);
                  console.log('persons found are:', persons);
                }
                res.json(n);
              }
            }
          );
        });
      }
    );
  });

  function parseCities($, provider, setup) {
    var val = {};
    if (provider.key === 'SGI') {
      $(provider.listCategories[setup.category].selectors.category + ' > ul > li > a').each(function() {
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

  function parseUrl($, provider, setup) {
    var val;
    if (provider.key === 'SGI') {
      val = provider.url + provider.listCategories[setup.category].path + 'torino/' + $.attribs.href;
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


// route middleware to validate :id
router.param('id', function(req, res, next, id) {
  console.log('validating ' + id + ' exists');
  // find the ID in the Database
  mongoose.model('Person').findById(id, function(err, person) {
    if (err) { // if it isn't found, we are going to repond with 404
      console.error('There was a problem retrieving person with id ' + id + ':', err);
      res.status(404)
      var err = new Error('Not Found');
      err.status = 404;
      res.json({ message: err.status  + ' ' + err});
    } else { // if it is found we continue on
      console.log('JSON of person of id', id, ':', person);
      // once validation is done save the new item in the req
      req.id = id;
      // go to the next thing
      next();
    }
  });
});

router.route('/:id').get(function(req, res) { // GET to get person by ID
  mongoose.model('Person').findById(req.id, function(err, person) {
    if (err) {
      console.error('X There was a problem retrieving person with id ' + req.id + ':', err);
    } else {
      console.log('GET person id: ' + person._id);
      res.json(person);
    }
  });
});

router.route('/:id/edit').get(function(req, res) { // GET to get person by ID
  mongoose.model('Person').findById(req.id, function(err, person) {
    if (err) {
      console.error('There was a problem retrieving person with id ' + req.id + ':', err);
    } else { // get the person
      console.log('GET person id: ' + person._id);
      res.json(person);
    }
  });
});

router.route('/:id/edit').put(function(req, res) { // PUT to update a person by ID
/*
  var name = req.body.name;
  var vote = req.body.vote;
  var dateofcreation = req.body.dateofcreation;
  var company = req.body.company;
  var isloved = req.body.isloved;
*/
  var record = {
    name: req.body.name,
    vote: req.body.vote,
    dateofcreation: req.body.dateofcreation,
    company: req.body.company,
    isloved: req.body.isloved,
  };

  // find the document by ID
  mongoose.model('Person').findById(req.id, function(err, person) {
    if (err) {
      console.error('There was a problem retrieving person with id ' + req.id + ':', err);
    } else { // update the person
/*
      person.update({
        name: name,
        vote: vote,
        dateofcreation: dateofcreation,
        isloved: isloved
      }, function(err, personID) {
*/        person.update(record, function(err, personID) {
        if (err) {
          res.send('There was a problem updating person with id ' + req.id + ':', err);
        } else {
          res.json(person);
        }
      });
    }
  });
});

router.route('/:id/edit').delete(function(req, res) { // DELETE to delete a person by ID
  // find person by ID
  mongoose.model('Person').findById(req.id, function(err, person) {
    if (err) {
      console.error('There was a problem retrieving person with id ' + req.id + ':', err);
    } else { // remove the person
      person.remove(function(err, person) {
        if (err) {
          console.error(err);
          res.send('There was a problem updating person with id ' + req.id + ':', err);
        } else {
          // returning success messages saying it was deleted
          console.log('DELETE removing ID: ' + person._id);
          res.json({
            message: 'deleted',
            item: person
          });
        }
      });
    }
  });
});

function sfetch(url, error, success) { // fetch url contents, securely
  var options = {
    url: url,
    agentClass: Agent,
    agentOptions: {
      socksHost: setup.tor.host,
      socksPort: setup.tor.port,
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