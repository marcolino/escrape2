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
    Image.find({}, 'personKey basename', function(err, images) {
      if (err) {
        return callback(err);
      }

      // add to each person its showcase image
      for (var i = 0, personsLen = persons.length; i < personsLen; i++) {
        var P = persons[i]._doc;
        persons[i]._doc.showcaseBasename = null;
        for (var j = 0, len = images.length; j < len; j++) {
          var I = images[j]._doc;
          if (I.personKey === P.key) {
            if (P.showcaseBasename === null) { // TODO: add a isShowcase function...
              P.showcaseBasename = I.basename;
              break;
            }
          }
        }
      }

      result(err, persons);
    });
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
  provider.getAll({ type: 'persons', /* key: /.*_/ */ }, function(err, providers) {
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
          etag: null,
          //lastModified: null
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
                var person = {}; // create person object (TODO new Person() ?)
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

            // sync persons aliases
            log.info('persons aliases sync started');
            // TODO: test syncAliasesBatch() to avoid alias groups with just one people...
            //exports.syncAliasesLive(persons, function(err) {
            exports.syncAliasesBatch(function(err) {
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

/* THIS IS DISABLED BECAUSE OF PERSONS WITHOUT IMAGES...
      // sync images only for new/changed persons
      // TODO: TO BE TESTED!!!
      if (!person.isChanged) {
log.silly('person', person.key, 'is NOT changed, NOT syncing images');
        return callbackInner();
      }
log.silly('person', person.key, 'is changed, syncing images');
*/
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

/**
 * Sync aliases in "batch" mode, i.e. on all existing persons, resetting all aliases on start
 */
exports.syncAliasesBatch = function(callback) {
  // TODO: to be tested (and used...)
  Person.find({}, function(err, persons) {
    if (err) {
      return callback(err);
    }
    local.syncAliases(persons, function() {
      callback();
    });
  });
};

/**
 * Sync aliases in "live" mode, i.e. with persons with 'isChanged' property set
 */
exports.syncAliasesLive = function(persons, callback) {
  local.syncAliases(persons, function() {
    callback();
  });
};

/**
 * reset all aliases - DEBUG ONLY
 */
local.resetAliases = function(persons) {
  for (var i = 0, personsLen = persons.length; i < personsLen; i++) {
    P = persons[i];
    //log.silly(' XXX persons[', i, '].alias =', P.alias);
    P.alias = null;
    local.savePerson(P);
  }
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

  /* RESET aliases - DEBUG ONLY */
  local.resetAliases(persons);
  log.silly('Aliases RESET');
//return callback(); // JUST CLEAN ALIASES

  /* */

  Image.find({}, 'personKey signature basename', function(err, images) {
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

      for (var l = 0/*k + 1*/; l < personsLen; l++) { // start from 0 inner loop, too, if we reset aliases on top
        var Q = persons[l]; // Q is the current person from all persons
        Q.aliasOld = Q.alias;
        if (P.key === Q.key) { // skip the same person
          continue;
        }
        if (local.areSimilar(P, Q)) {
          if (Q.alias) { // Q had already an alias
            if (P.alias && (Q.alias !== P.alias)) {
              // our person (P) was just assigned an alias, and we find anoter person (Q)
              // TODO: do not skip, wait creating a new alias at the end of this loop,
              //       and use the alias found, if any is found;
              //       bark only if different aliases are found...
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

exports.listAliasGroups = function(callback) {
  var people = [];
  Person.find({ alias: { $ne: null } }, 'key name alias', { sort: { alias: 1 } }, function(err, persons) {
    if (err) {
      return callback(err);
    }
    Image.find({}, 'personKey signature basename', function(err, images) {
      if (err) {
        return callback(err);
      }

      // add to each person its images, building people
      for (var i = 0, personsLen = persons.length; i < personsLen; i++) {
        people[i] = persons[i].toObject();
        people[i].images = [];
        for (var j = 0, len = images.length; j < len; j++) {
          var image = images[j].toObject();
          if (image.personKey === people[i].key) {
            people[i].images.push(image);
            continue;
          }
        }
      }

      // scan through all people
      var aliasLast = null;
      var groupLenMax = 0;
      var groups = [];
      var group = [];
      for (var k = 0; k < people.length; k++) { // loop through all people
        var alias = people[k].alias;
        //var key = people[k].key;
        if (aliasLast && aliasLast !== alias) { // alias changes, push this group to groups, and make new group
          group = findClosestImagesInAliasGroup(group);
          groups.push(group);
          group = [];
        }// else { // same alias, push this people to this group
        group.push(people[k]);
        groupLenMax = Math.max(groupLenMax, group.length);
        //}
        aliasLast = alias;
      }
      if (group.length > 0) { // push last group
        group = findClosestImagesInAliasGroup(group);
        groups.push(group);
        groupLenMax = Math.max(groupLenMax, group.length);
      }      
      log.info('groupLenMax:', groupLenMax);
      return callback(null, groups);

      // loop through all images of every people in this group, to find closest images
      function findClosestImagesInAliasGroup(group) {
        for (var l = 0; l < group.length; l++) {
          for (var m = l + 1; m < group.length; m++) {
            var closest = local.getClosestImages(group[l], group[m]);
            // set closest image for persons of this iteration
            // TODO: if there are more than two people similar in the group,
            //       one closest image is not strictly sufficient anymore...
            closest.image1.distance = closest.image2.distance = closest.distance;
            group[l].imagesClosest = closest.image1;
            group[m].imagesClosest = closest.image2;
          }
        }
        return group;
      }
    });
  });
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
  var distanceMin = 1; // the maximum distance
  var img1, img2 = null; // the closest images

  if (
    !(person1.images && person1.images.length > 0) ||
    !(person2.images && person2.images.length > 0)
  ) {
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
      //log.debug(' ***  ', i, ',', j, ':', distance);
      if (distance < distanceMin) { // temporarily found closest image
        distanceMin = distance;
        img1 = image1;
        img2 = image2;
        if (distanceMin === 0) { // can't go lower...
          break all;
        }
      }
    }
  }

  // TODO: debug only, this shouldn't happen...
  if (!img1) { log.error('img1 is undefined, person1:', person1.key, person1.images.length); }
  if (!img2) { log.error('img2 is undefined, person2:', person2.key, person2.images.length); }

  //log.debug(' *** closest distance:', distanceMin, img1.basename, img2.basename);
  return {
    distance: distanceMin,
    image1: img1,
    image2: img2
  };
};

local.aliasCreate = function() {
  return crypto.randomBytes(16).toString('hex');
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
          .replace(/Quando mi contatterai dimmi che mi hai visto su .*$/, '') // remove trailing text
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
