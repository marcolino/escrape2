var mongoose = require('mongoose') // mongo abstraction
  , cheerio = require('cheerio') // to parse fetched DOM data
  , async = require('async') // to call many async functions in a loop
  , fs = require('fs') // file-system handling
  , path = require('path') // paths handling
  //, _ = require('lodash') // lo-dash utilities
  , crypto = require('crypto') // random bytes
  , network = require('../controllers/network') // network handling
  , image = require('../controllers/image') // network handling
  , provider = require('./provider') // provider's controller
  , Person = require('../models/person') // model of person
  , Image = require('../models/image') // model of image
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

exports.getAll = function(filter, options, result) { // get all persons
  Person.find(filter, null, options, function(err, persons) {
    result(err, persons);
  });
};

/*
exports.get = function(req, res) { // get persons
  var filter = {};
  var options = {};
  Person.find(filter, null, options, function(err, persons) {
    result(err, persons);
  });
};
*/

exports.getById = function(id, result) { // get person by id
  var filter = { _id: id };
  Person.find(filter, function(err, persons) {
    result(err, persons);
  });
};

exports.getByPhone = function(phone, result) { // get person by phone
  var filter = { phone: req.phone };
  Person.find(filter, function(err, persons) {
    result(err, persons);
  });
};

/**
 * sync persons from providers
 */
exports.sync = function() { // sync persons
  var totalProvidersCount = 0, retrievedProvidersCount = 0;
  var totalPersonsCount = 0, retrievedPersonsCount = 0;
  var syncStartDate = new Date(); // start of this sync date
  var persons = [];
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
    totalProvidersCount = providers.length;

    // loop to get list page from all providers
    async.each(
      providers, // 1st param in async.each() is the array of items
      function(provider, callbackOuter) { // 2nd param is the function that each item is passed to
        resource = {
          url: local.buildListUrl(provider, config),
          type: 'text',
          etag: null
        };
        log.info('provider', provider.key, 'list resource getting from', resource.url);
        network.requestRetryAnonymous(
          resource,
          function(err) { // error
            log.warn(
              'error syncing provider', provider.key + ':',  err, ',', 'skipping'
            );
            return callbackOuter(); // skip this outer loop
          },
          function(contents) { // success
            log.info('provider', provider.key, 'list resource got');
            if (!contents) {
              log.warn(
                'error syncing provider', provider.key + ':',
                'empty contents', ',', 'skipping'
              );
              return callbackOuter(); // skip this outer loop
            }
            retrievedProvidersCount++;
            var now = new Date();
            provider.dateOfFirstSync = provider.dateOfFirstSync ? provider.dateOfFirstSync : now;
            provider.dateOfLastSync = now;
            $ = cheerio.load(contents);
            var list = local.getList(provider, $);
            totalPersonsCount += list.length;
            //list = list.slice(0, 3); log.info('list:', list); // to debug: limit list
            async.each(
              list, // 1st param is the array of items
              function(element, callbackInner) { // 2nd param is the function that each item is passed to
                var person = {}; // create person object
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
                person.key = provider.key + '/' + element.key; // person key is the sum of provider key and element key
                resource = {
                  url: person.url,
                  type: 'text'
                };
                network.requestRetryAnonymous(
                  resource,
                  function(err) {
                    log.warn(
                      'syncing person', person.key + ':',
                      err, ',', 'skipping'
                    );
                    return callbackInner(); // skip this inner loop
                  },
                  function(contents) {
                    if (!contents) {
                      log.warn(
                        'syncing person', person.key + ':',
                        'empty contents', ',', 'skipping'
                      );
                      return callbackInner(); // skip this inner loop
                    }
                    $ = cheerio.load(contents);
                    person.name = local.getDetailsName($, provider);
                    if (!person.name) { // should not happen, network.requestRetryAnonymous should catch it
                      log.warn('person', person.key, 'name not found,', 'skipping');
                      return callbackInner(); // skip this inner loop
                    }
                    person.zone = local.getDetailsZone($, provider);
                    person.description = local.getDetailsDescription($, provider);
                    var phone = local.getDetailsPhone($, provider);
                    if (phone) { // phone is found
                      person.phone = phone;
                      person.phoneIsAvailable = true;
                    } else { // phone not found (person unavailable)
                      // do not overwrite person phone
                      person.phoneIsAvailable = false;
                    }
                    person.nationality = local.detectNationality(person, provider, config);
                    var now = new Date();
                    person.dateOfLastSync = now;
                    person.imageUrls = local.getDetailsImageUrls($, provider);
                    
                    // save this person to database
                    exports.upsert(person, function(err, doc) {
                      if (err) {
                        log.warn(err);
                      } else {
                        //persons.push(person);
                        persons.push(doc);
                        retrievedPersonsCount++;
                      }
                      callbackInner(); // this person is done
                    });

                  }
                );
              },
              function(err) { // 3th param is the function to call when everything's done (inner callback)
                if (err) {
                  log.warn('some error in the final inner async callback:', err, 'skipping inner iteration');
                }
                log.info('finished persons sync for provider', provider.key);
                callbackOuter(); // signal outer loop that this inner loop is finished
              }
            );
          }
        );
      },
      function(err) { // 3rd param is the function to call when everything's done (outer callback)
        if (err) {
          return log.error('some error in the final outer async callback:', err, 'skipping outer iterations');
        }
        log.info('persons sync finished');

        // set activity status
        log.info('persons activity status setting started');
        local.setActivityStatus(providers, syncStartDate, function(err) {
          if (err) {
            return log.error('error setting activity status:', err);
          }
          log.info('persons activity status setting finished');
          log.info('' + retrievedProvidersCount, '/', totalProvidersCount, 'providers retrieved');
          log.info('' + retrievedPersonsCount, '/', totalPersonsCount, 'persons retrieved');

          // sync persons images
          log.info('persons images sync started');
          local.syncImages(persons, function(err, persons) {
            if (err) {
              return log.warn('can\'t sync persons images:', err);
            }
            // success
            log.info('persons images sync finished');
//return log.error('stopped before persons aliases');

            // sync persons aliases
            log.info('persons aliases sync started');
            local.syncAliases(persons, function(err) {
              if (err) {
                return log.warn('can\'t sync person aliases:', err);
              }
              log.info('persons aliases sync finished');
            });
          });
        });
        /*
        if (
          (retrievedProvidersCount === totalProvidersCount) &&
          (retrievedPersonsCount === totalPersonsCount)
        ) {
          local.setActivityStatus(syncStartDate, function(err) {
            if (err) {
              return log.error('error setting activity status:', err);
            }
            log.info('persons sync finished: all', retrievedPersonsCount, 'persons retrieved');
          });
        } else {
          log.warn(
            'persons sync finished:',
            retrievedProvidersCount, 'providers out of', totalProvidersCount, 'retrieved,',
            retrievedPersonsCount, 'persons out of', totalPersonsCount, 'retrieved,',
            'presence status not asserted'
          );
        }
        */
      }
    );
  });
};

exports.upsert = function(person, callback) {
  Person.findOne(
    { key: person.key },
    function(err, doc) {
      if (err) {
        return callback('could not verify presence of person ' + person.name + ': ' + err.toString());
      }
      var isNew, isModified = false;
      if (!doc) { // person did not exist before
        isNew = true;
        doc = new Person();
        doc.dateOfFirstSync = new Date();
      }

      // merge sync'd person data to database person object
      for (var prop in person) {
        // record if any intrinsic property was modified
        if (!isNew) {
          if (prop in doc && prop !== 'dateOfLastSync' && doc[prop] !== person[prop]) {
            log.debug('updating', person.key, ': prop', prop, doc[prop], '=>', person[prop]);
            isModified = true;
          }
        }
        doc[prop] = person[prop];
      }

      //_.merge(doc, person); // merge sync'd person data to database person object

      doc.save(function(err) {
      //log.warn('doc.dateOfFirstSync when saving:', doc.dateOfFirstSync);

        if (err) {
          return callback('could not save person ' + doc.key + ': ' + err.toString());
        }
/*
        log.info('person', person.key, (isNew ? 'inserted' : isModified ? 'modified' : 'not changed'));
        person.isChanged = isNew || isModified;
        callback(null, person); // success
*/
        log.info('person', doc.key, (isNew ? 'inserted' : isModified ? 'modified' : 'not changed'));
        doc.isChanged = isNew || isModified;
        callback(null, doc); // success
      });
    }
  );
};

local.setActivityStatus = function(providers, syncStartDate, callback) {
  var syncdProvidersRegExp = null;
  for (var i = 0, len = providers.length; i < len; i++) {
    if (providers[i].dateOfLastSync >= syncStartDate) {
      // provider was sync'd correctly
      syncdProvidersRegExp = (!syncdProvidersRegExp ? '' : '|');
      syncdProvidersRegExp += '(' + providers[i].key + ')';
    }
  }

  if (!syncdProvidersRegExp) {
    return callback(); // success: no provider sync'd, no activity status set
  }
  //log.silly('syncdProvidersRegExp:', syncdProvidersRegExp);

  async.series(
    [
      function(callbackInner) {
        local.presenceReset(syncdProvidersRegExp, syncStartDate, function(err) {
          if (err) {
            return callbackInner('can\'t reset presence:', err);
          }
          callbackInner(null, 'reset');
        });
      },
      function(callbackInner) {
        local.presenceSet(syncdProvidersRegExp, syncStartDate, function(err) {
          if (err) {
            return callbackInner('can\'t set presence:', err);
          }
          callbackInner(null, 'set');
        });
      }
    ],
    function(err, results) {
      // results should be now equal to [ 'reset', 'set' ]
      if (err) {
        return callback('could not set activity status for persons:', err);
      }
      callback(); // success
    }
  );
};

local.presenceReset = function(syncdProvidersRegExp, syncStartDate, callback) {
  // set persons not sync'd or with a not available phone as not present
  Person
    .where({
      $and: [
        { 'key': new RegExp('^' + syncdProvidersRegExp + '/') }, // person key is ^providerKey/personKey$
        {
          $or: [
            { 'dateOfLastSync': { $lt: syncStartDate } },
            { 'phoneIsAvailable': false },
          ]
        }
      ]
    })
    .update({}, { $set: { isPresent: false } }, { multi: true }, function(err, count) {
      if (err) {
        console.warn('can\'t reset persons activity status:', err);
        return callback(err);
      }
      log.info(count.n + ' persons are absent');
      callback(null);
    })
  ;
};

local.presenceSet = function(syncdProvidersRegExp, syncStartDate, callback) {
  // set persons sync'd and with an available phone as present
  Person
    .where({
      $and: [
        { 'key': new RegExp('^' + syncdProvidersRegExp + '/') }, // person key is ^providerKey/personKey$
        { 'dateOfLastSync': { $gte: syncStartDate } },
        { 'phoneIsAvailable': true },
      ]
    })
    .update({}, { $set: { isPresent: true } }, { multi: true }, function(err, count) {
      if (err) {
        console.warn('can\'t set persons activity status:', err);
        return callback(err);
      }
      log.info(count.n + ' persons are present');
      callback(null);
    })
  ;
};

local.syncImages = function(persons, callback) {
  //var personsSyncd = [];

  async.each(
    persons, // 1st param in async.each() is the array of items
    function(person, callbackInner) { // 2nd param is the function that each item is passed to
//log.silly('=== person', person.key, 'sync images start ===');

      // sync images only for new/changed persons
      // TODO: TO BE TESTED!!!
      if (!person.isChanged) {
log.silly('person', person.key, 'is NOT changed, NOT syncing images');
        return callbackInner();
      }
log.silly('person', person.key, 'is changed, syncing images');

      // sync this person images
      image.syncPersonImages(person, function(err, person) {
        if (err) {
          log.warn('can\'t sync person images:', err);
        //} else { // person sync'd
        //  personsSyncd.push(person);
        }
//else log.silly('=== person', person.key, 'sync images done ===');
        // person images sync'd: sync aliases (in each person we have 'isChanged' property...)
        callbackInner();
      });
    },
    function(err) { // 3th param is the function to call when everything's done (inner callback)
      if (err) {
        return callback('some error in the final async callback:' + err.toString());
      }
//log.silly('ALL IMAGES SYNC\'D !!!!!!!!!!!!!!!!!!!!!!!!!');
      // success
      callback(null, persons); // all loops finished
      //callback(null, personsSyncd); // all loops finished
    }
  );
};

local.syncAliases = function(persons, callback) {
  /**
   * person   images                                  alias   reason
   *     P1   i1.P1   i2.P1   i3.P1                   aa      Δ(P1, P3) < threshold
   *     P2   i1.P2   i2.P2   i3.P2   i4.P2
   *     P3   i1.P3   i2.P3                           aa      Δ(P1, P3) < threshold
   *
   *     P9   i1.P9   i2.P9   i3.P9   i4.P9   i5.p9
   */
  //log.silly('persons.length:', persons.length);
  //log.silly('persons:', persons); return callback();

/* RESET aliases
for (var i = 0, personsLen = persons.length; i < personsLen; i++) {
  P = persons[i];
  log.silly(' XXX persons[', i, '].alias =', P.alias);
  P.alias = null;
  local.savePerson(P);
}
return callback();
*/

  Image.find({}, '_id personKey signature basename', function(err, images) {
    if (err) {
      return callback(err);
    }

    // add to each person its images
//log.silly(' *** loading persons with their images started ***');
    for (var i = 0, personsLen = persons.length; i < personsLen; i++) {
      persons[i].images = [];
      for (var j = 0, len = images.length; j < len; j++) {
        if (images[j].personKey === persons[i].key) {
          persons[i].images.push(images[j]);
          continue;
        }
      }
    }
//log.silly(' *** loading persons with their images finished ***');

    // check if person (P) belongs to an alias group, or if it constitutes a new alias group
    for (var k = 0; k < personsLen; k++) {
      var P = persons[k]; // P is the person we arge going to check for aliases
      //log.silly('syncALiases - person:', 1 + k, '/', personsLen);
/* TODO: COMMENTED OUT JUST FOR DEBUGGING PURPOSES - RE-ENABLE IT!
      if (!P.isChanged) {
        log.silly('person:', 1 + k, '/', personsLen, 'is NOT changed, NOT syncing aliases');
        continue;
      }
*/
      P.aliasOld = P.alias;
//log.silly('========= P.aliasOld reset to', P.aliasOld);

      for (var l = 0/*k + 1*/; l < personsLen; l++) {
        var Q = persons[l]; // Q is the current person from all persons
        Q.aliasOld = Q.alias;
        if (P.key === Q.key) { // skip the same person
          continue;
        }
        if (local.areSimilar(P, Q)) {
          if (Q.alias) { // Q had already an alias
            if (P.alias && (Q.alias !== P.alias)) {
              // our person (P) was just assigned an alias, and we find anoter person (Q)
              log.warn('found one more person (with a different alias) similar to person', P.key + ':', Q.key, 'P alias is', P.alias, 'and', 'Q alias is', Q.alias, ', ignored');
              continue;
            }
//log.silly('syncAliases - alias already present:', Q.alias);
          } else { // Q had not any alias
            Q.alias = local.aliasCreate();
//log.silly('syncAliases - alias created:', Q.alias);
//log.silly('*** Q.alias:', Q.alias);
            local.savePerson(Q);
            //log.silly('updated alias for Q person', Q.key);
          }
          log.silly('syncAliases - person:', 1 + k, '/', personsLen, 'key:', Q.key, 'is similar to person:', P.key);
          P.alias = Q.alias;
//log.silly('* P.alias:', P.alias);
//log.silly('ooo P.aliasOld:', P.aliasOld);
          //break; // DEBUG: do not break, to check we do not have duplicated Persons with different aliases
        } else {
          //log.silly('syncAliases - person:', 1 + k, '/', personsLen, 'key:', Q.key, 'is NOT similar to person:', P.key);
        }
      }
      // finished check for this person P, save alias if changed
//log.silly('** P.aliasOld:', P.aliasOld);
//log.silly('** P.alias:', P.alias);
      if (P.aliasOld !== P.alias) {
//log.silly('*** P.alias:', P.alias);
        local.savePerson(P);
        //log.silly('updated alias for P person', P.key);
      }
//else log.silly('--------- not saved alias for person', P.key, '(unchanged)');
    }
    callback(); // success    
  });
};

exports.listImagesAliases = function(callback) {
  Person.find({ alias: { $ne: null } }, 'key alias', { 'group': 'alias' }, function(err, persons) { 
    if (err) {
      return callback(err);
    }
    var docs = [];
    for (var i = 0; i < persons.length; i++) {
      docs.push(persons[i]._doc);
    }
    callback(null, docs);
  });
/*
  Person.find({}, function(err, persons) {
    if (err) {
      return callback(err);
    }
    Image.find({}, 'personKey signature basename', function(err, images) {
      if (err) {
        return callback(err);
      }
      // add to each person its images
      for (var i = 0, personsLen = persons.length; i < personsLen; i++) {
        persons[i].images = [];
        for (var j = 0, len = images.length; j < len; j++) {
          if (images[j].personKey === persons[i].key) {
            persons[i].images.push(images[j]);
            continue;
          }
        }
      }
      // scan through all persons
      for (var k = 0; k < personsLen; k++) {
        var P = persons[k]; // P is the person we arge going to check for aliases
        for (var l = 0; l < personsLen; l++) {
          var Q = persons[l]; // Q is the current person from all persons
          if (P.key === Q.key) { // skip the same person
            continue;
          }
          var closest = local.getClosestImages(P, Q);
          if (closest.distance <= config.images.thresholdDistance) {
            // these two images are really colose, and the closest for these two persons
            list.push({
              key1: P.key,
              key2: Q.key,
              imageUrl1: 'images/' + closest.image1.basename,
              imageUrl2: 'images/' + closest.image2.basename
            });
          }
        }
      }
      // finished
      //log.silly(list);
      callback(null, list);
    });
  });
*/
};

local.savePerson = function(person) {
//log.silly('SAVING person:', person);
  person.save(function(err) {
    if (err) {
      return log.warn('can\'t save person alias:', err);
    }
    return null; // success
  });
};

local.areSimilar = function(person1, person2) {
  return (local.getClosestImages(person1, person2).distance <= config.images.thresholdDistance);
};

local.getClosestImages = function(person1, person2) {
//log.debug('areSimilar - start');
  var distanceMin = 1; // the maximum distance
  var img1, img2 = null; // the closest images

  if (!person1.images || !person2.images) {
//log.debug('areSimilar - FALSE 1');
    return distanceMin; // first or second person has no images, distance is the maximum
  }

  // compare each image from person 1 to each image from person 2
  all:
  for (i = 0, len1 = person1.images.length; i < len1; i++) {
    var image1 = person1.images[i];
    if (!image1.signature) { log.error('image 1 has no signature'); }
    for (var j = 0, len2 = person2.images.length; j < len2; j++) {
      var image2 = person2.images[j];
      if (!image2.signature) { log.error('image 2 has no signature'); }
      var distance = image.distance(image1.signature, image2.signature);
      distanceMin = Math.min(distanceMin, distance);
      img1 = image1;
      img2 = image2;
      if (distanceMin === 0) { // can't go lower...
        break all;
      }
/*
      var distance = bitsOn / lenS;
      if (distance <= config.images.thresholdDistance) { // these two images are similar
//log.silly('areSimilar - TRUE - distance is', distance);
//log.silly(image1.basename, image2.basename);
        return true;
      }
*/
    }
  }
  return {
    distance: distanceMin,
    image1: img1,
    image2: img2
  };
/*
  //log.debug('areSimilar - FALSE 2');
  return false; // these two images are not similar
*/
};

local.aliasCreate = function() {
  return crypto.randomBytes(16).toString('hex');
};

/*
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

        if (images[i] === null) { // TODO: this should never happen...
          log.error('IMAGE #', i, 'IS NULL, IT SHOULD NOT BE HAPPENING!');
          continue; // image was canceled because already processed
        }
        log.debug('evaluating image', images[i].basename);

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
          log.warn('can\'t update alias on person', + images[j].personKey + ':', err);
        }
      }
    );
  }
};
*/

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
      function(file, callbackEach) {
        //log.info('processing file', file);

        async.parallel(
          [
            function(callbackParallel) {
              // check exactly one image document matches each image file
              var basename = file.replace(new RegExp(config.images.path + '/'), '');
              Image.find({ basename: basename }, 'basename', function(err, docs) {
                checkImage(err, docs, basename);
                callbackParallel();
              });
            },
            function(callbackParallel) {
              // check exactly one person document exists for each image file
              var personKey = path.dirname(file.replace(new RegExp(config.images.path + '/'), ''));
              Person.findOne({ key: personKey }, function(err, doc) {
                checkPerson(err, doc);
                callbackParallel();
              });
            }
          ],
          function(err, results) {
            if (err) {
              return log.error('a file failed to process parallely asynchromously');
            }
            callbackEach();
          }
        );
      },
      function(err) {
        if (err) {
          log.error('a file failed to process asynchromously');
        }
        log.info('checkImages done');
        callback(null);
      }
    );

    function checkImage(err, docs, basename) {
      if (err) {
        return log.error('could not find image document for image file', basename + ':', err);
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

/*
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
        ' DUP: <img src="' + 'http://test.server.local' + '/data/images' + '/' + person._doc.showcaseUrl + '" ' +
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
*/

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
  return val;
};

local.buildDetailsUrl = function(provider, url, config) {
  var val;
  url = url.replace(/^\.?\//, ''); // remove local parts from url, if any
  val = provider.url + provider.categories[config.category].pathDetails + '/' + url;
  return val;
};

local.getDetailsName = function($, provider) {
  var val, element;
  if (provider.key === 'SGI') {
    element = $('td[id="ctl00_content_CellaNome"]');
    if (element) {
      val = $(element).text();
    }
  }
  if (provider.key === 'TOE') {
    element = $('span[class~="lead-20"] > span');
    if (element) {
      val = $(element).attr('title');
      if (val) {
        val = val.replace(/^Telefono Escort (.*?):.*$/, '$1');
      }
    }
  }
  if (provider.key === 'FORBES') {
    element = $('h1[id="firstHeading"]');
    if (element) {
      val = $(element).text();
    }
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
