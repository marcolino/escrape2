var mongoose = require('mongoose') // mongo abstraction
  , cheerio = require('cheerio') // to parse fetched DOM data
  , async = require('async') // to call many async functions in a loop
  , fs = require('fs') // file-system handling
  , path = require('path') // paths handling
  , _ = require('lodash') // lo-dash utilities
  , network = require('../controllers/network') // network handling
  , image = require('../controllers/image') // network handling
  , provider = require('./provider') // provider's controller
  , Person = require('../models/person') // model of person
  , Image = require('../models/image') // model of image
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

/**
 * sync persons from providers
 */
exports.sync = function() { // sync persons
  var retrievedPersonsCount = 0;
  var syncStartDate = new Date(); // start of this sync date
  var resource;
  
  /**
   * get all providers
   *
   * providers are expected to publish a main page containing
   * a list with each person link, pointing to each person detail page
   */
  provider.getAll({ type: 'persons', mode: config.mode, key: /.*/ }, function(err, providers) {
    if (err) {
      return log.error('error getting providers:', err);
    }

    // loop to get list page from all providers
    async.each(
      providers, // 1st param in async.each() is the array of items
      function(provider, callbackOuter) { // 2nd param is the function that each item is passed to
        //log.info('provider:', provider.key);
        resource = {
          url: local.buildListUrl(provider, config),
          type: 'text',
          etag: null
        };
        log.info('list resource.url:', resource.url);
        network.requestRetryAnonymous(
          resource,
          function(err) { // error
            log.warn(
              'error syncing provider', provider.key, ':',
              err, ',', 'skipping'
            );
            return callbackOuter(); // skip this outer loop
          },
          function(contents) { // success
            //log.info('contents lenght is ', contents.length);
            if (!contents) {
              log.warn(
                'error syncing provider', provider.key, ':',
                'empty contents', ',', 'skipping'
              );
              return callbackOuter(); // skip this outer loop
            }
            $ = cheerio.load(contents);
            var list = local.getList(provider, $);
            //list = list.slice(0, 1); // to debug: limit lists to one element
            //log.info('list:', list);
            async.each(
              list, // 1st param is the array of items
              function(element, callbackInner) { // 3nd param is the function that each item is passed to
                var person = {}; // create person object
                //person.url = local.getUrl(element.url);
                person.url = local.buildDetailsUrl(provider, element.url, config);
                if (!person.url) {
                  log.warn(
                    'error syncing provider', provider.key, ',',
                    'person with no url', ', ', 'skipping'
                  );
                  return callbackInner(); // skip this inner loop
                }
                if (!element.key) {
                  log.warn(
                    'error syncing provider', provider.key, ',',
                    'person with no key', ',', 'skipping'
                  );
                  return callbackInner(); // skip this inner loop
                }
                person.key = provider.key + '/' + element.key; // set person key as the sum of provider key and element key
                resource = {
                  //url: local.buildDetailsUrl(provider, person.url, config),
                  url: person.url,
                  type: 'text'
                  //etag: null,
                };
                network.requestRetryAnonymous(
                  resource,
                  function(err) {
                    log.warn(
                      'syncing person', person.key, ':',
                      err, ',', 'skipping'
                    );
                    return callbackInner(); // skip this inner loop
                  },
                  function(contents) {
                    if (!contents) {
                      log.warn(
                        'syncing person', person.key, ':',
                        'empty contents', ',', 'skipping'
                      );
                      return callbackInner(); // skip this inner loop
                    }
                    $ = cheerio.load(contents);
                    person.name = local.getDetailsName($, provider);
                    if (!person.name) { // should not happen...
                      log.warn('person', person.key, 'name not found', ',', 'skipping');
                      //log.debug('THIS IS CONTENTS FOR EMPTY PERSON:', contents.toString('utf8'));
                      return callbackInner(); // skip this inner loop
                    }
                    person.zone = local.getDetailsZone($, provider);
                    person.description = local.getDetailsDescription($, provider);
                    person.phone = local.getDetailsPhone($, provider);
                    person.nationality = local.detectNationality(person, provider, config);
                    person.dateOfLastSync = new Date();
                    person._imageUrls = local.getDetailsImageUrls($, provider);
                    
                    // sync this person images
                    image.syncPersonImages(person, function(err, person) {
                      if (err) {
                        // ignore this person images error to continue with person save
                        log.warn(err);
                        // TODO: can't continue, person is null...
                      }

                      // save this person to database
                      local.upsert(person, function(err) {
                        if (err) {
                          // ignore this person error to continue with other persons
                        } else {
                          retrievedPersonsCount++;
                          //log.info('person ', person.key, ' sync\'d');
                        }

/*
                        // TO BE TESTED!
                        // re-build aliases after having inserted this person images
                        exports.buildAliases(person.key, function(err, result) {
                          if (err) {
                            log.warn(err);
                          }
                          callbackInner(); // this person is done
                        });
*/
                        callbackInner(); // this person is done
                      });
                    });
                  }
                );
              },
              function(err) { // 4th param is the function to call when everything's done (inner callback)
                if (err) {
                  log.warn(
                    'some error in the final inner async callback:', err,
                    'one of the iterations produced an error:', 'skipping this iteration'
                  );
                }
                callbackOuter(); // signal this inner loop is finished
                log.info('finished persons sync for provider', provider.key);
              }
            );
          }
        );
      },
      function(err) { // 3rd param is the function to call when everything's done (outer callback)
        if (err) {
          return log.error(
            'some error in the final outer async callback:', err,
            'one of the iterations produced an error:', 'all further processing will now stop'
          );
        }
        log.info('finished persons sync for all providers');

        // set activity status
        local.setActivityStatus(syncStartDate, function(err) {
          if (err) {
            return log.error('error setting activity status:', err);
          }
          log.info('persons sync finished:', retrievedPersonsCount.toString(), ' persons found');
        });

      }
    );
  });
};

exports.buildAliases = function(personKey, callback) {
  console.time('buildAliases');
  log.info('starting buildAliases()');
  var similar = {};
  similar.count = 0;

  // TODO: we do not need 'basename' property @production...
  Image.find({}, '_id personKey signature basename', function(err, images) {
    if (err) {
      return callback(err);
    }
    log.info('found #', images.length, 'images, for all persons');
    var personImages = {};
    for (var i = 0, len = images.length; i < len; i++) {
      if (personKey && (images[i].personKey !== personKey)) {
        continue; // if a personKey was specified, ignore all other person keys
      }
      var key = images[i].personKey;
      if (personImages[key] === undefined) {
        personImages[key] = []; // create hash for person if not yet present
      }
      personImages[key].push(i); // push this image index onto this person images array
    }
    log.info('found #', Object.keys(personImages).length, 'persons with at least one image');
    //log.info('images per person median count:', images.length / Object.keys(personImages).length);
    //log.info('personImages:', personImages);

     // loop through all person images
     Object.keys(personImages).forEach(function(personKey) {
      log.debug('personKey:', personKey);

      // loop through all images of this person
      for (var ii = 0, lenOwn = personImages[personKey].length; ii < lenOwn; ii++) {
        var i = personImages[personKey][ii]; // index of this image in images array

        /**/
        if (images[i] === null) { // TODO: this should never happen...
          log.error('IMAGE #', i, 'IS NULL, IT SHOULD NOT BE HAPPENING!');
          continue; // image was canceled because already processed
        }
        log.debug('evaluating image', images[i].basename);
        /**/

        // loop through all images of all persons
        for (var j = 0, lenAll = images.length; j < lenAll; j++) {
          if (j === i) {
            continue; // avoid comparing an image to itself
          }
          if (images[j] === null) {
            continue; // avoid comparing an image already processed
          }
          if (images[j].personKey === personKey) {
            //log.info('skipping comparison of images for this same person', personKey);
            continue; // avoid comparing an image to images of the same person
          }
          //log.debug('j:', j);
          //log.info('comparing image', i, 'and', j);
          if (areSimilar(images[i], images[j], config.images.thresholdDistance)) {
            log.info('found persons with similar images (i:', i, ', j:', j, '):', images[i].basename, images[j].basename);
            similar.count++;
            // set person i in the same alias group of person j
            updateAlias(images, i, j);
          }
        }
        // finished checking this image, cancel this image in images array
        //log.debug('canceling image #', i, '...');
        images[i] = null;
      }

    });
    //log.debug('here we are finish, forEach is blocking, that's good...');
    similar.median = (images.length > 0) ? (similar.count / images.length) : undefined;
    console.timeEnd('buildAliases');
    callback(null, similar);
  });

  // compare signatures inline, for improved speed... (TODO: evalulate if this is worth...)
  function areSimilar(image1, image2, thresholdDistance) {
    var bitsOn = 0;
    // assuming all images *do* have a signature...
    for (var k = 0, len = image1.signature.length; k < len; k++) {
      if (image1.signature[k] != image2.signature[k]) {
        bitsOn++;
      }
    }
    //log.warn('distance:', bitsOn / len);
    return ((bitsOn / len) <= thresholdDistance);
  }

  // update person isAliasFor property
  function updateAlias(images, i, j) {
    Person.update(
      { key: images[j].personKey },
      { $push: { isAliasFor: images[i].personKey } },
      { upsert: true },
      function(err) {
        if (err) {
          log.warn('can\'t update alias on person', + images[j].personKey, ':', err);
        }
      }
    );
  }
};

exports.checkImages = function(callback) {
  console.time('checkImages');
  log.info('starting checkImages()');

  // check all images in database have a matching file on disk
  Image.find({}, '_id personKey basename', function(err, images) {
    var stats;

    log.info('checking all image documents in database have a file on disk');
    for (var i = 0, len = images.length; i < len; i++) {
      var path = config.images.path + '/' + images[i].basename;
      try {
        stats = fs.statSync(path);
        //log.info('image file for image', images[i].basename, 'does exist');
      } catch (e) {
        log.error('image file for image', images[i].basename, 'does not exist');
      }
    }

    log.info('checking all images on disk have a matching database document');
    walk(config.images.path, list);
  });

  var walk = function(dir, done) {
    var results = [];
    fs.readdir(dir, function(err, list) {
      if (err) {
        return done(err);
      }
      var i = 0;
      (function next() {
        var file = list[i++];
        if (!file) {
          return done(null, results);
        }
        file = dir + '/' + file;
        fs.stat(file, function(err, stat) {
          if (stat && stat.isDirectory()) {
            walk(file, function(err, res) {
              results = results.concat(res);
              next();
            });
          } else {
            results.push(file);
            next();
          }
        });
      })();
    });
  };

  var list = function(err, files) {
    if (err) {
      log.error('error walking images tree:', err);
      return callback(null, false);
    }

    // loop through all file system image files
    async.each(
      files,
      function(file, callback) {
        //log.info('processing file', file);

        // check exactly one image document matches each image file
        var basename = file.replace(new RegExp(config.images.path + '/'), '');
        Image.find({ basename: basename }, 'basename', function(err, docs) {
          checkImage(err, docs, basename);
        });

        // check exactly one person document exists for each image file
        var personKey = path.dirname(file.replace(new RegExp(config.images.path + '/'), ''));
        Person.findOne({ key: personKey }, checkPerson);

        callback();
      },
      function(err) {
        if (err) {
          return log.error('a file failed to process asynchromously');
        } else {
          //log.info('all files in list have been processed successfully');
        }
      }
    );

    log.info('checkImages done');
    callback(null);

    function checkImage(err, docs, basename) {
      if (err) {
        return log.error('could not find image document for image file', basename, ':', err);
      }
      if (docs.length > 1) { // too many image documents
        return log.error('too many image documents for image file', basename, '(', docs.length,')');
      }
      if (docs.length === 0) { // no image document found
        return log.error('no image document for image file', basename);
      }
      //log.info('image document for image file', basename, 'found');
    }

    function checkPerson(err, doc) {
      if (err) {
        return log.warn('could not find person document:', err);
      }
      if (!doc) { // no person document found
        return log.warn('no person document');
      }
      //log.info('person document for image file', doc.key, 'found');
    } 
  };
};

exports.listImagesAliases = function(callback) {
  console.time('listImagesAliases');
  Person.find({ isAliasFor: { $not: { $size: 0 } } }, 'key name showcaseUrl isAliasFor', listAliases);

  function listAliases(err, persons) {
    if (err) {
      return log.warn('could not find persons with aliases:', err);
    }
    if (persons.length <= 0) { // no person documents found
      return log.warn('no person with aliases found');
    }
    log.info('found', persons.length, 'persons with aliases');
    console.log('<hr>');
    console.log(
      '<style>' +
      ' .row { font-family: fixed, height:150px; overflow hidden; }' +
      ' .row > .children { height:100px; float:left; }' +
      '</style>'
    );
    console.log('<div class="row">');
    for (var i = 0, len = persons.length; i < len; i++) {
      console.log(
        '  <img src="' + 'http://test.server.local' + '/data/images' + '/' + persons[i].showcaseUrl + '" ' +
        'width="128" ' +
        'title="name: ' + persons[i].name + ', key: ' + persons[i].key + '" ' +
        '/>'
      );
      console.log(
        '  <h4>name: ' + persons[i].name + ', key: ' + persons[i].key + '</h4>'
      );
      console.log(' = ');
      for (var a = 0, lenAliases = persons[i].isAliasFor.length; a < lenAliases; a++) {
        Person.findOne({ key: persons[i].isAliasFor[a] }, 'key name showcaseUrl', showAlias);
      }
      console.log('</div>');
    }

    function showAlias(err, person) { // TODO WHY _DOC ????????????????
      //log.info('showAlias() - person:', person._doc);
      if (err) {
        return log.warn('could not find alias person:', err);
      }
      //console.log('<img src="' + 'http://test.server.local' + '/data/images' + '/' + person._doc.showcaseUrl + '" width="128" />');
      console.log('<div class="row">');
      console.log(
        '  <img src="' + 'http://test.server.local' + '/data/images' + '/' + person._doc.showcaseUrl + '" ' +
        'width="128" ' +
        'title="name: ' + person._doc.name + ', key: ' + person._doc.key + '" ' +
        '/>'
      );
      console.log(
        '  <h4>name: ' + person._doc.name + ', key: ' + person._doc.key + '</h4>'
      );
      console.log('</div>');
      // log aliases...
    }
  }
  log.info('listImagesAliases done');
  callback(null);
};

local.upsert = function(person, callback) {
  Person.findOne(
    { key: person.key },
    function(err, doc) {
      if (err) {
        log.warn('could not find person', person.name, ':', err, ',', 'skipping');
        return callback(err);
      }
      var isNew;
      if (doc) { // person did already exist
        isNew = false;
        doc.dateOfLastSync = person.dateOfLastSync;
      } else { // person did not exist before
        isNew = true;
        doc = new Person();
      }
      _.merge(doc, person);
      doc.save(function(err) {
        if (err) {
          log.warn('could not save person', doc.key, ':', err, ',', 'skipping');
          return callback(err);
        }
        log.info('person', person.key, (isNew ? 'inserted' : 'updated'));
        callback(null); // success
      });
    }
  );
};

local.setActivityStatus = function(syncStartDate, callback) {
  local.presenceReset(function(err) {
    if (err) {
      return callback(err);
    }
    local.presenceSet(syncStartDate, callback);
  });
};

// set persons present flag to false
local.presenceReset = function(callback) {
  Person
    .update({}, { $set: { isPresent: false } }, { multi: true }, function(err, count) {
      if (err) {
        console.warn('Error resetting persons activity status:', err);
        return callback(err);
      }
      if (count.n <= 0) {
        console.warn('no person has been reset');
      } else {
        console.log(count.n + ' persons present flag reset');
      }
      callback(null);
    })
  ;
};

// set persons present flag according to date of last sync
local.presenceSet = function(syncStartDate, callback) {
  // set just sync'd persons as present
  //console.log('updating persons isPresent flag to true for persons with datOfLastSync $gte than', syncStartDate);
  Person
    .where('dateOfLastSync').gte(syncStartDate)
    .update({}, { $set: { isPresent: true } }, { multi: true }, function(err, count) {
      if (err) {
        console.warn('Error setting persons activity status:', err);
        return callback(err);
      }
      if (count.n <= 0) {
        console.warn('no person is present');
      } else {
        console.log(count.n + ' persons present flag asserted');
      }
      callback(null);
    })
  ;
};

local.getList = function(provider, $) {
  var val = [];
  if (provider.key === 'SGI') {
    $('a[OnClick="get_position();"]').each(function(index, element) {
      var url = $(element).attr('href');
      if (url.match(/annuncio\//)) {
        var key = url.replace(/annuncio\/(.*?)/, '$1');
        val.push({ key: key, url: url });
      }
    });
  }
  if (provider.key === 'TOE') {
    $('div[id="row-viewmode"]').find('div[class^="esclist-item"] > div > a').each(function(index, element) {
      var url = $(element).attr('href');
      if (url.match(/annuncio\?id=/)) {
        var key = url.replace(/\.\/annuncio\?id=(.*)/, '$1');
        val.push({ key: key, url: url });
      }
    });
  }
  if (provider.key === 'FORBES') {
    $('h2 > span[id="2015"]').parent().next('div').find('ol > li > a:not([class])').each(function(index, element) {
      var url = $(element).attr('href');
      var key = $(element).attr('title');
      val.push({ key: key, url: url });
    });
  }
  if (provider.key === 'TEST') {
    $('ol > li a').each(function(index, element) {
      var url = $(element).attr('href');
      var key = $(element).attr('title');
      val.push({ key: key, url: url });
    });
  }
  return val;
};

local.buildListUrl = function(provider, config) {
  var val;
  if (provider.key === 'SGI') {
    val = provider.url + provider.categories[config.category].pathList + '/' + config.city;
  }
  if (provider.key === 'TOE') {
    val = provider.url + provider.categories[config.category].pathList;
  }
  if (provider.key === 'FORBES') {
    val = provider.url + provider.categories[config.category].pathList;
  }
  if (provider.key === 'TEST') {
    val = provider.url + provider.categories[config.category].pathList;
  }
  return val;
};

local.buildDetailsUrl = function(provider, url, config) {
  var val;
  // TODO: added '?', below... test again @HOME!!!
  url = url.replace(/^\.?\//, ''); // remove local parts from url, if any
  val = provider.url + provider.categories[config.category].pathDetails + '/' + url;
  return val;
};

/*
local.getUrl = function(url) {
  return url.replace(/^\.\//, ''); // remove local parts from url, if any
};
*/

local.getDetailsName = function($, provider) {
  var val, element;
  if (provider.key === 'SGI') {
    element = $('td[id="ctl00_content_CellaNome"]');
    if (element) {
      val = $(element).text();
    }
  }
  if (provider.key === 'TOE') {
    //element = $('h1[class~="titolo"]');
    element = $('span[class~="lead-20"] > span');
    if (element) {
      val = $(element).attr('title');
      if (val) {
        val = val.replace(/^Telefono Escort (.*?):.*$/, '$1');
      }
    }
  }
  if (provider.key === 'FORBES') {
    /*
    element = $('h1[id="firstHeading"]').each(function(index, element) {
      val = $(element).text();
    });
    */
    element = $('h1[id="firstHeading"]');
    if (element) {
      val = $(element).text();
    }
  }
  if (provider.key === 'TEST') {
    val = 'TEST name';
  }
  if (val) {
    val = val
      .replace(/\s+/g, ' ') // squeeze duplicated spaces
      .replace(/^\s+/, '') // remove leading spaces
      .replace(/\s+$/, ''); // remove trailing spaces
  }
  return val;
};

local.getDetailsZone = function($, provider) {
  var val = '', element;
  if (provider.key === 'SGI') {
    element = $('td[id="ctl00_content_CellaZona"]');
    if (element) {
      val = $(element).text();
    }
  }
  if (provider.key === 'TOE') {
    element = $('a > span > i[class="icon-location"]');
    if (element) {
      val = $(element).text();
    }
  }
  if (provider.key === 'FORBES') {
    val = '';
  }
  if (provider.key === 'TEST') {
    val = '';
  }
  return val;
};

local.getDetailsDescription = function($, provider) {
  var val = '', element;
  if (provider.key === 'SGI') {
    element = $('td[id="ctl00_content_CellaDescrizione"]');
    if (element) {
      val = $(element).text();
      if (val) {
        val = val
          .replace(/<br>.*$/, '') // remove trailing fixed part
          .replace(/\r+/, '') // remove CRs
          .replace(/\n+/, '\n') // remove multiple LFs
        ;
      }
    }
  }
  if (provider.key === 'TOE') {
    element = $('p[class="annuncio"]');
    if (element) {
      val = $(element).text();
    }
  }
  if (provider.key === 'FORBES') {
    element = $('table[class="sinottico"]').next('p');
    val = $(element).text();
  }
  if (provider.key === 'TEST') {
    val = 'TEST description';
  }
  return val;
};

local.getDetailsPhone = function($, provider) {
  var val = null, element;
  if (provider.key === 'SGI') {
    element = $('td[id="ctl00_content_CellaTelefono"]');
    if (element) {
      val = $(element).text();
    }
    if (
      (val === 'In arrivo dopo le vacanze !!') ||
      (val === 'Telefono momentaneamente non disponibile')
    ) {
      //person.unavailable = true; // TODO: set person's 'unavailble' field to true...
      val = null;
    }
    if (val) {
      val = val.replace(/^\s*\+/, '00');
      val = val.replace(/[^\d]+/g, '');
    }
  }
  if (provider.key === 'TOE') {
    element = $('span[title^="Telefono"]');
    if (element) {
      val = $(element).text();
    }
    if (val === 'In arrivo dopo le vacanze !!') { // TODO: set it from TOE source...
      //person.unavailable = true; // TODO: set person's 'unavailble' field to true...
      val = null;
    }
    if (val) {
      val = val.replace(/^\s*\+/, '00');
      val = val.replace(/[^\d]+/g, '');
    }
  }
  if (provider.key === 'FORBES') {
    val = '333.33333333';
  }
  if (provider.key === 'TEST') {
    val = '444.44444444';
  }
  return val;
};

local.getDetailsImageUrls = function($, provider) {
  var val = [];
  if (provider.key === 'SGI') {
    $('a[rel="group"][class="fancybox"]').each(function(index, element) {
      var href = $(element).attr('href');
      if (href) {
        href = href
          .replace(/\.\.\//g, '')
          .replace(/\?t=.*/, '')
        ;
      }
      href = provider.url + '/' + href;
      val.push(href);
    });
  }
  if (provider.key === 'TOE') {
    $('div[id="links"]').find('a').each(function(index, element) {
      var href = $(element).attr('href');
      href = provider.url + '/' + href;
      val.push(href);
    });
  }
  if (provider.key === 'FORBES') {
    $('table[class="sinottico"]').find('tr').eq(1).find('a > img').each(function(index, element) {
      var href = 'http:' + $(element).attr('src'); // TODO: do not add 'http', make network.request work without schema...
      val.push(href);
    });
    $('div[class="thumbinner"]').find('a > img').each(function(index, element) {
      if ($(element).attr('src').match(/\.jpg$/i)) {
        var href = 'http:' + $(element).attr('src'); // TODO: do not add 'http', make network.request work without schema...
        val.push(href);
      }
    });
  }
  if (provider.key === 'TEST') {
    // no images for test
  }
  return val;
};

local.detectNationality = function(person, provider, config) {
  var fields = [
    person.name,
    person.description
  ];
  var nationalityPatterns = [
    {
      'it': [
        {
          'women': [
            { 'alban(ia|ese)': 'al' },
            { 'argentina': 'ar' },
            { 'australi(a|ana)': 'au' },
            { 'barbados': 'bb' },
            { 'belg(a|io)': 'be' },
            { 'bolivi(a|ana)': 'bo' },
            { 'bosni(a|aca)': 'ba' },
            { 'brasil(e|iana)': 'br' },
            { 'bulgar(a|ia)': 'bu' },
            { 'canad(a|ese)': 'ca' },
            { 'capo\s*verd(e|iana)': 'cv' },
            { 'ch?il(e|ena)': 'cl' },
            { 'ch?in(a|ese)': 'cn' },
            { 'orient(e|ale)': 'asia' },
            { 'colombi(a|ana)': 'co' },
            { 'costa\s*ric(a|he..)': 'cr' },
            { 'croa([tz]ia|ta)': 'hr' },
            { 'cub(a|ana)': 'cu' },
            { 'c(zech|eca)': 'cz' },
            { 'dan(imarca|ese)': 'dk' },
            { 'dominic(a|ana)': 'do' },
            { 'ecuador(e..)?': 'ec' },
            { 'eston(ia|e)': 'ee' },
            { 'finland(ia|ese)': 'fi' },
            { 'franc(ia|ese|esina)': 'fr' },
            { '(germania|tedesc(a|ina))': 'de' },
            { '(gran bretagna|ing(hilterra|les(e|ina)))': 'en' },
            { 'grec(a|ia)': 'gr' },
            { 'greanad(a|iana)': 'gd' },
            { 'guatemal(a|teca)': 'gt' },
            { 'hait(i|iana)': 'ht' },
            { 'h?ondur(as|e(...)?)': 'hn' },
            { 'ungher(ia|ese)': 'hu' },
            { 'island(a|ese)': 'is' },
            { 'indi(a|ana)': 'in' },
            { 'indonesi(a|ana)': 'id' },
            { 'irland(a|ese)': 'ie' },
            { 'israel(e|iana)': 'ie' },
            { 'italian(a|issima)': 'it' },
            { '(j|gi)amaic(a|ana)': 'jm' },
            { '(japan)|(giappon(e|ese))': 'jp' },
            { 'ken[iy](a|ana)': 'ke' },
            { 'core(a|ana)': 'kr' },
            { 'lituan(a|ia)': 'lt' },
            { 'liban(o|ese)': 'lb' },
            { 'letton(ia|e)': 'lv' },
            { 'lussemburg(o|hese)': 'lu' },
            { 'macedon(ia|e)': 'mk' },
            { 'malta': 'mt' },
            { 'me(x|ss)ic(o|ana)': 'mx' },
            { 'moldov(a|iana)': 'md' },
            { 'monaco': 'mc' },
            { 'mongol(ia|a)': 'mn' },
            { 'montenegr(o|ina)': 'me' },
            { 'm([ao]rocco)|(arocchina)': 'ma' },
            { 'oland(a|ese)': 'nl' },
            { '(neo|nuova)[\s-]?zeland(a|ese)': 'nz' },
            { 'nicaragu(a|e...)': 'ni' },
            { 'niger': 'ne' },
            { 'nigeri(a|ana)': 'ng' },
            { 'norveg(ia|ese)': 'no' },
            { 'pa(k|ch)istan(a)?': 'pk' },
            { 'panam(a|ense)': 'pa' },
            { 'paragua(y|iana)': 'py' },
            { 'peru(viana)?': 'pe' },
            { '(ph|f)ilippin(e|a)': 'ph' },
            { 'pol(onia|acca)': 'pl' },
            { 'portoric(o|ana)': 'pr' },
            { 'portog(allo|hese)': 'pt' },
            { 'r(omania|(o|u)mena)': 'ro' },
            { 'd[ae]ll[\s\']est': 'ro' },
            { 'russ(i)?a': 'ru' },
            { 'san[\s-]?marin(o|ese)': 'sm' },
            { 'arab(i)?a': 'sa' },
            { 'senegal(ese)?': 'sn' },
            { 'serb(i)?a': 'rs' },
            { 'se[yi]chelles': 'sc' },
            { 'sierra[\s-]?leone': 'sl' },
            { 'singapore': 'sg' },
            { 'slovacch(i)?a': 'sk' },
            { 'sloven(i)?a': 'si' },
            { 'somal(i)?a': 'so' },
            { 'spagn(a)': 'es' }, // "spagnola" ignored on purpose, since often it's not a nationality...
            { 'sve(zia|dese)': 'se' },
            { 'svizzera': 'ch' },
            { 's[yi]ria(na)?': 'sy' },
            { 'taiwan(ese)?': 'tw' },
            { 't(h)?ai(land(ia|ese)?)?': 'th' },
            { 'trinidad': 'tt' },
            { 'tunisi(a|ina)': 'tn' },
            { 'turc(hia|a)': 'tr' },
            { 'u[kc]raina': 'ua' },
            { 'urugua([yi])|(gia)|([yi]ana)': 'uy' },
            { '(america(na)?|statunitense)': 'us' },
            { 'venezuela(na)?': 've' },
            { 'vietnam(ita)?': 'vn' },
            { 'asia(tica)?': 'asia' },
            { 'africa(na)?': 'africa' },
            { 'america[\s-]?centrale': 'central-america' },
            { 'caraibi(ca)?': 'caribbean' },
            { 'nord[\s-]?america(na)?': 'north-america' },
            { 'europa[\s-]+orientale]': 'eastern-europe' },
            { 'europea': 'europe' },
            { 'orient[e|(ale)]': 'asia' },
            { 'medio[\s-]?orientale': 'middle-east' },
            { 'oceania': 'oceania' },
            { 'sud[\s-]?america(na)?': 'south-america' }
          ]
        }
      ]
    }
  ];

  var negativeLookbehinds = [
    {
      'it': [
        {
          'women': [
            'alla',
            'amica',
            'autostrada',
            'area',
            'belvedere',
            'borgata',
            'borgo',
            'calata',
            'campo',
            'carraia',
            'cascina',
            'circonvallazione',
            'circumvallazione',
            'contrada',
            'c\.so',
            'corso',
            'cso',
            'diramazione',
            'frazione',
            'isola',
            'largo',
            'lido',
            'litoranea',
            'loc\.',
            'località',
            'lungo',
            'masseria',
            'molo',
            'parallela',
            'parco',
            'passaggio',
            'passo',
            'p\.za',
            'p\.zza',
            'piazza',
            'piazzale',
            'piazzetta',
            'ponte',
            'quartiere',
            'regione',
            'rione',
            'rio',
            'riva',
            'riviera',
            'rondò',
            'rotonda',
            'salita',
            'scalinata',
            'sentiero',
            'sopraelevata',
            'sottopassaggio',
            'sottopasso',
            'spiazzo',
            'strada',
            'stradone',
            'stretto',
            'svincolo',
            'superstrada',
            'tangenziale',
            'traforo',
            'traversa',
            'v\.',
            'via',
            'viale',
            'vicolo',
            'viottolo',
            'zona'
          ]
        }
      ]
    }
  ];

  return parseNationalityPatterns();

  function parseNationalityPatterns() {
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (!field) { continue; }
      for (var j = 0; j < nationalityPatterns.length; j++) {
        var patternObj = nationalityPatterns[j];
        for (var lang in patternObj) {
          if (lang === provider.language) {
            var langPatterns = patternObj[lang];
            for (var k = 0; k < langPatterns.length; k++) {
              var langPatternObj = langPatterns[k];
              for (var cat in langPatternObj) {
                if (cat === config.category) {
                  var catPatterns = langPatternObj[cat];
                  for (var m = 0; m < catPatterns.length; m++) {
                    var catPatternObj = catPatterns[m];
                    for (var catPattern in catPatternObj) {
                      country = catPatternObj[catPattern];
                      var regexLangPattern = new RegExp('\\b' + catPattern + '\\b', 'gi');
                      if (field.match(regexLangPattern)) { // country pattern matched
                        // check for eventual negative look-behinds
                        if (parseNegativeLookbehinds(field, catPattern)) {
                          // negative lookbehind pattern found:
                          // break category patterns loop
                          // and go on with other patterns
                          break;
                        } else {
                          // negative lookbehind pattern not found:
                          // country really matched, result is found
                          return country;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return null;
  }

  function parseNegativeLookbehinds(field, catPattern) {
    for (var i = 0; i < negativeLookbehinds.length; i++) {
      var negativeLookbehindObj = negativeLookbehinds[i];
      for (var lang in negativeLookbehindObj) {
        if (lang === provider.language) {
          var negativeLookbehindPatterns = negativeLookbehindObj[lang];
          for (var j = 0; j < negativeLookbehindPatterns.length; j++) {
            var negativeLookbehindPatternObj = negativeLookbehindPatterns[j];
            for (var cat in negativeLookbehindPatternObj) {
              if (cat === config.category) {
                var catPatterns = negativeLookbehindPatternObj[cat];
                for (var k = 0; k < catPatterns.length; k++) {
                  var negativeLookbehind = catPatterns[k];
                  var regexNegativeLookbehind =
                    new RegExp('\\b' + negativeLookbehind + '\\s+' + catPattern + '\\b', 'gi');
                  if (field.match(regexNegativeLookbehind)) {
                    // negative lookbehind pattern matched
                    return true;
                  }
                }
              }
            }
          }
        }
      }
    }
    return false;
  }
};

exports.getAll = function(req, res) { // get all persons
  local.get(filter, function(err, persons) {
    if (err) {
      console.error('Error retrieving persons:', err);
      res.json({ error: err });
    } else {
      res.json(persons);
    }
  });
};

exports.getById = function(req, res) { // get person
  local.get({ _id: req._id }, function(err, persons) {
    if (err) {
      console.error('Error retrieving persons by id:', err);
      res.json({ error: err });
    } else {
      res.json(persons);
    }
  });
};

exports.getByPhone = function(req, res) { // get person
  local.get({ phone: req.phone }, function(err, persons) {
    if (err) {
      console.error('Error retrieving persons by phone:', err);
      res.json({ error: err });
    } else {
      res.json(persons);
    }
  });
};

local.get = function(filter, result) { // get person
  mongoose.model('Person').find(filter, function(err, persons) {
    result(err, persons);
  });
};

/**
 * when developing, expose also private functions,
 * prefixed with '_' character,
 * to be able to unit test them
 */
if (config.env === 'development') {
  exports.local = {};
  for (var method in local) {
    exports.local[method] = local[method];
  }
}

module.exports = exports;
