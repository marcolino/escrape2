'use strict';

var mongoose = require('mongoose') // mongo abstraction
  , cheerio = require('cheerio') // to parse fetched DOM data
  , async = require('async') // to call many async functions in a loop
  , fs = require('fs') // file-system handling
  , path = require('path') // paths handling
  , crypto = require('crypto') // random bytes, md5
  , colors = require('colors') // colors
  , network = require('../controllers/network') // network handling
  , image = require('../controllers/image') // network handling
  , provider = require('../controllers/provider') // provider's controller
  , review = require('../controllers/review') // reviews controller
  , tracesImage = require('../controllers/tracesImage') // trace images controller
  , tracesPhone = require('../controllers/tracesPhone') // trace phones controller
  , Person = require('../models/person') // model of person
  , UserToPerson = require('../models/userToPerson') // model of user-to-person
  , Image = require('../models/image') // model of image
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

exports.getAll = function(filter, options, callback) { // get all persons
  //log.debug('filter:', filter.name);
config.time = process.hrtime(); // TODO: development only
  var match = {};
  var matches = [];
  matches.push({ isPresent: true }); // do not show persons who are not present
  matches.push({ showcaseBasename: { '$exists': true }}); // do not show persons with no showcase basename (yet)
  matches.push({ category: { '$ne': 'centro-massaggi' }}); // exclude specific categories
  matches.push(filter);
  match = { $and: matches };

  Person.find(match).lean().exec(function(err, persons) {

function unique(array, property) {
  var o = {}, i, l = array.length, r = [];
  for (i = 0; i < l; i += 1) {
    //o[typeof this[i][property] !== 'undefined' ? this[i][property] : (Math.floor(Math.random() * 9999999999))] = this[i];
    o[typeof array[i][property] !== 'undefined' ? array[i][property] : i] = array[i];
  }
  for (i in o) r.push(o[i]);
  return r;
}
//console.error(persons.length);
    persons = unique(persons, 'alias');

//console.error(persons.length);
function compare(a, b) {
  if (a.dateOfFirstSync < b.dateOfFirstSync)
    return 1;
  else if (a.dateOfFirstSync > b.dateOfFirstSync)
    return -1;
  else 
    return 0;
}
persons.sort(compare);

    if (err) {
      return callback(err);
    }
    log.debug('' + persons.length, 'persons loaded in', process.hrtime(config.time)[0] + (process.hrtime(config.time)[1] / 1000000000), 'seconds');

    /* THIS IS GOOD!!! */
    var currentUserId = 'marco'; // TODO: use _id...
log.debug('currentUserId:', currentUserId);
    UserToPerson.find({ username: currentUserId }, function(err, userToPerson) {
      if (err) {
        log.error('UserToPerson.find() error:', err);
        return callback(err);
      }
//log.debug(' *** userToPerson:', userToPerson);
      //var userToPerson = [
      //  { userId: 'marco', personKey: 'FORBES/Shakira', hide: false },
      //  { userId: 'marco', personKey: 'FORBES/Ursula Burns', hide: true },
      //];
      var userToPersonObjects = userToPerson.map(function (e) { return e.toObject(); });
//log.debug(' *** userToPersonObjects:', userToPersonObjects);
      return callback(null, getPersonsForUser(persons, userToPersonObjects, currentUserId));
    });

    function getPersonsForUser(persons, userToPerson, username) {
      var visiblePersons = persons.filter(function(elementP, indexP, arrayP) {
//log.debug('# elementP.key:', elementP.key);
        var isThisPersonVisible = !userToPerson.filter(function(elementU, indexU, arrayU) {
          return (!elementU.username || (elementU.personKey === elementP.key && elementU.hide && elementU.username === username));
        }).length;
        return isThisPersonVisible;
      });
      return visiblePersons;
    }

/*
function getVisible(selUserId){
  var visiblePersons = persons.filter(function(v,i,a){
    var isThisPersonVisible = !usersToPersons.filter(function(vv,ii,aa){
      return (vv.personId === v.id && !vv.hide && vv.userId === selUserId || !vv.userId);
    }).length;

    return isThisPersonVisible;
  });

  return visiblePersons;
}
*/
/*
    var username = 'marco'; // TODO: get username from client
    for (var i = 0; i < persons.length; i++) {
      var person = persons[i];
      console.log('person', i, ':', person.name);
      for (var u = 0; u < person.users.length; u++) {
        if (person.users[u].username === username) {
          console.log('*** found person with users data:', person.name);
          console.log('*** person.users.username:', person.users[u].username);
          console.log('*** person.users.hide:', person.users[u].hide);
          if (person.users[u].hide) {
            // remove this person from result
            persons.splice(i, 1);
          }
        }
      }
    }
*/
    //return callback(null, persons);
  });
};

exports.getById = function(id, callback) { // get person by id
  var filter = { _id: id };
  Person.findOne(filter).lean().exec(function(err, person) {
    if (err) {
      return callback(err);
    }
//log.warn('/api/controllers/person/getById()', 'person:', person);
    Image.find({ personKey: person.key }).lean().exec(function(err, images) {
      if (err) {
        return callback(err);
      }
//log.warn('/api/controllers/person/getById()', 'images:', images);
      person.images = images;
      callback(null, person);
    });
  });
};

exports.getByKey = function(key, callback) { // get person by key
  var filter = { key: key };
  Person.find(filter, function(err, persons) {
    callback(err, persons);
  });
};

exports.getByPhone = function(phone, callback) { // get person by phone
  var filter = { phone: phone };
  Person.find(filter, function(err, persons) {
    callback(err, persons);
  });
};

/**
 * sync persons from providers
 */
exports.sync = function() { // sync persons
  log.info('persons sync started');
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
//providers = providers.slice(0, 1); // to debug: limit list to first element (SGI)
//providers = providers.slice(1, 2); // to debug: limit list to second element (TOE)
    totalProvidersCount = providers.length;

    // loop to get list page from all providers
    async.each(
      providers, // 1st param in async.each() is the array of items
      function(provider, callbackOuter) { // 2nd param is the function that each item is passed to
        resource = {
          url: local.buildListUrl(provider, config),
          type: 'text',
          etag: null,
        };
        log.info('provider', provider.key, 'list resource getting from', resource.url);
        network.fetch(
          resource,
          function(err, result) {
            if (err) {
              log.warn('can\'t sync provider', provider.key + ':',  err, ', skipping');
              return callbackOuter(); // skip this outer loop
            }
            log.info('provider', provider.key, 'list resource got');
            if (!result.contents) {
              log.warn(
                'error syncing provider', provider.key + ':',
                'empty contents, skipping'
              );
              return callbackOuter(); // skip this outer loop
            }
            retrievedProvidersCount++;
            var now = new Date();
            provider.dateOfFirstSync = provider.dateOfFirstSync ? provider.dateOfFirstSync : now;
            provider.dateOfLastSync = now;
            var $ = cheerio.load(result.contents);
            var list = local.getList(provider, $);
            totalPersonsCount += list.length;
//list = list.slice(0, 1); log.info('list:', list); // to debug: limit list
            async.each(
              list, // 1st param is the array of items
              function(element, callbackInner) { // 2nd param is the function that each item is passed to
                var person = {}; // create person object
                person.url = local.buildDetailsUrl(provider, element.url, config);
                if (!person.url) {
                  log.warn(
                    'error syncing provider', provider.key, ',',
                    'person with no url, skipping'
                  );
                  return callbackInner(); // skip this inner loop
                }
                if (!element.key) {
                  log.warn(
                    'error syncing provider', provider.key, ',',
                    'person with no key, skipping'
                  );
                  return callbackInner(); // skip this inner loop
                }
                person.key = provider.key + '/' + element.key; // person key is the sum of provider key and element key
                person.whenImageChangesUrlChangesToo = provider.whenImageChangesUrlChangesToo; // to spped-up images sync, when possible
//log.debug('SET PERSON whenImageChangesUrlChangesToo');
// ALIZEE
//if (person.key !== 'SGI/adv108n') return callbackInner(); // TODO: DEBUG ONLY - sync only one person

                resource = {
                  url: person.url,
                  type: 'text',
                  etag: null, // TODO: should we handle etag for persons too? Perhaps we should...
                };
                //network.requestRetryAnonymous(
                network.fetch(
                  resource,
                  function(err, result) {
                    if (err) {
                      log.warn('can\'t sync person', person.key + ':', err, ', skipping');
                      return callbackInner(); // skip this inner loop
                    }
                    if (!result) {
                      log.warn(
                        'syncing person', person.key + ':',
                        'empty result, skipping'
                      );
                      return callbackInner(); // skip this inner loop
                    }
                    /*
                    if (!result.isChanged) { // not changed
                      // TODO: TO USE THIS WE SHOULD ADD ETAG HANDLING TO PERSONS PAGES
                      log.info('person', person.key, 'is not changed, skipping');
                      return callbackInner(); // skip this inner loop
                    }
                    */
                    if (!result.contents) {
                      log.warn(
                        'syncing person', person.key + ':',
                        'empty contents, skipping'
                      );
                      return callbackInner(); // skip this inner loop
                    }

                    $ = cheerio.load(result.contents);

                    // TODO: TEST THIS!
                    if (result.etag) {
                      person.etag = result.etag; // get person page etag
                    } else { // use contents md5 sum if no etag available
                      var imagesSectionsContent = local.getImagesSections($, provider);
                      if (!imagesSectionsContent) {
                        log.warn('person', person.key, 'images sections content not found, skipping md5 handling');
                      } else {
                        person.md5 = crypto.createHash('md5').update(imagesSectionsContent).digest('hex');
                      }
                    }
//log.debug('person.etag:', person.etag);
//log.debug('person.md5:', person.md5);

                    person.name = local.getDetailsName($, provider);
                    if (!person.name) { // should not happen, network.requestRetryAnonymous should catch it
                      log.warn('person', person.key, 'name not found,', 'contents length:', result.contents.length, ', skipping');
                      // log.error('@contents@:', result.contents);
                      return callbackInner(); // skip this inner loop
                    }
                    person.address = local.getDetailsAddress($, provider);
                    person.description = local.getDetailsDescription($, provider);
/*
// DEBUG ONLY: FORCE ONE PERSON DESCRIPTION CHANGE! ///////////
if (person.key === 'FORBES/Shakira') {
  person.description += '\nA small forced change, here...: ' + crypto.randomBytes(3).toString('hex');
}
///////////////////////////////////////////////////////////////
*/
                    person.category = local.getDetailsCategory($, provider);
//log.debug('person category:', person.category);
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
                    person.isPresent = true; // set person as present, waiting for setActivityStatus()
                    //person.alias = null; // person.alias will be set in batch mode at the end of the loop

                    // save this person to database
                    exports.upsert(person, function(err, doc) {
                      if (err) {
                        log.warn(err);
                      } else {
                        //persons.push(person);
                        persons.push(doc); // push this person document to persons array
                        retrievedPersonsCount++;
                      }
                      callbackInner(); // this person is done
                    });

                  }
                );
              },
              function(err) { // 3th param is the function to call when everything's done (inner callback)
                if (err) {
                  log.warn('some error in the final inner async callback:', err, ', skipping inner iteration');
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
          return log.error('some error in the final outer async callback:', err, ', skipping outer iterations');
        }
//return log.debug('TERMINATING');
        log.info('' + retrievedProvidersCount, '/', totalProvidersCount, 'providers retrieved');
        log.info('' + retrievedPersonsCount, '/', totalPersonsCount, 'persons retrieved');

        if (
          (retrievedProvidersCount < totalProvidersCount) ||
          (retrievedPersonsCount < totalPersonsCount)
        ) {
          //return log.warn('not all providers/persons sync\'d: skipping images, footprints and aliases sync');
        }

        // sync phone reviews for this person (aynchronously)
        log.info('persons phone reviews sync started (async)');
        local.syncReviews(persons);

/*
        // sync image traces for all persons (aynchronously)
        log.info('persons image traces sync started (async)');
        local.syncTracesImage(persons);
*/
        // sync phone trcaces for all persons (aynchronously)
        log.info('persons phone traces sync started (async)');
        local.syncTracesPhone(persons);

        // set activity status
        log.info('persons activity status setting started');
        local.setActivityStatus(providers, syncStartDate, function(err) {
          if (err) {
            return log.error('error setting activity status:', err);
          }
          log.info('persons activity status setting finished');

          // sync persons images
          log.info('persons images sync started');
          config.timeStart = process.hrtime(); // TODO: development only
          image.syncPersonsImages(persons, function(err, persons) {
//image.syncPersonsImagesCheck(persons, function(err, persons) {
            if (err) {
              return log.warn('can\'t sync persons images:', err);
            }
            // success
            log.info(
              'persons images sync finished',
              '- elapsed time:', process.hrtime(config.timeStart)[0], 'seconds'
            );
//return log.debug('image.syncPersonsImagesCheck finished');

            // sync persons aliases
            log.info('persons aliases sync started');
            //exports.syncAliasesLive(persons, function(err) {
            exports.syncAliasesBatch(function(err) {
              if (err) {
                return log.warn('can\'t sync person aliases:', err);
              }
              log.info('persons aliases sync finished');
            });

          });

        });
      }
    );
  });
};

local.syncReviews = function(persons) {
  // build personsAvailable array (with all active persons phones)
  var personsAvailable = persons.filter(function(person) { // filter out persons with not available phone
    return person.phoneIsAvailable && person.phone;
  }).map(function(person) { // build personsAvailable array with person key, phone, and trace date of last sync
    var personPhone = {};
    personPhone.key = person.key;
    personPhone.phone = person.phone;
    return personPhone;
  });
  //log.debug('syncReviews() - personsAvailable l (ength:', personsAvailable.length);

var len = personsAvailable.length;
var n = 0;
  async.eachSeries(
    personsAvailable,
    function(person, callback) {
      review.sync(person.phone, function(err, results) {
        if (err) {
          return callback(err);
        }
        //log.info('sync\'d person', person.key, 'phone', person.phone, 'reviews:', results.inserted, 'inserted,', results.updated, 'updated');
n++; log.debug('sync\'d review', n + '/' + len);
        callback();
      });
    },
    function(err) {
      if (err) {
        log.warn('can\'t sync reviews:', err);
      }
      log.info('all reviews sync finished');
    }
  );
};

local.syncTracesImage = function(persons) {
  image.getAll(function(err, images) { // get all images
    if (err) {
log.error('syncTracesImage() - error in image.getAll:', err, 'CHECK WE ARE REALLY BAILING OUT...');
      return; // TODO: test if return really stops this function execution...
    }
    tracesImage.getAll(function(err, traces) { // get all images traces
      if (err) {
log.error('syncTracesImage() - error in tracesImage.getAll:', err, 'CHECK WE ARE REALLY BAILING OUT...');
        return; // TODO: test if return really stops this function execution...
      }
//log.debug('syncTracesImage() - persons length:', persons.length);
      var personsAvailable = {}; // persons available object
      persons.forEach(function(person) {
        if (person.phoneIsAvailable && person.phone) { // use only images from available persons
          personsAvailable[person.key] = true;
        }
      });
//log.debug('syncTracesImage() - personsAvailable length:', Object.keys(personsAvailable).length);

      /*
      var tracesObj = {}; // traces images object
      traces.forEach(function(trace) {
        tracesObj[trace.url] = { imageUrl: trace.imageUrl, dateOfLastSync: trace.dateOfLastSync, };
      });
      */

      var imagesToSync = images.filter(function(image) { // available images array (images to sync)
        if (image.personKey in personsAvailable) { // check image belongs to an available person
          var tracesPerImage = traces.filter(function(trace) { // get all traces for this image
            return image.url === trace.imageUrl;
          });
          if (tracesPerImage.length === 0) { 
            return true; // no image trace yet for this image, adding image to imagesToSync array
          }
        }
        return false;
      });

      /*
      .map(function(person) { // build imagesAvailable array with person key, image, and trace date of last sync
        var imageAvailable = {};
        imageAvailable.key = person.key;
        imageAvailable.imageUrl = images.filter(function(image) {
          if (image.personKey === person.key) {

          }
          return image;
        });
        imageAvailable.dateOfLastSync = person.dateOfLastSync;
        return imageAvailable;
      });
  
      imagesAvailable.sort(function(a, b) { // sort imagesAvailable array to have traces never sync'd on top
        return b.dateOfLastSync - a.dateOfLastSync;
      });
      */
//log.debug('syncTracesImage() - imagesToSync length:', imagesToSync.length);
  
var len = imagesToSync.length;
var n = 0;
      async.eachSeries(
        imagesToSync,
        function(image, callback) {
//log.debug('syncTracesImage() - sync\'ing image url:', image.url);
          tracesImage.sync(image.url, function(err, results) {
            if (err === 'unavailable') {
log.error('syncTracesImage() - UNAVAILABLE in tracesImage.getAll ~ CHECK WE ARE REALLY BAILING OUT...');
              image.setAvailability(image.url, false, function(err, result) {
                log.error('can\'t set availability on image syncTracesImage()');
              });
              return callback();
            }
            if (err) {
              log.error('can\'t sync image traces:', err);
              return callback(err);
            }
            //log.info('sync\'d image traces for person', image.personKey, 'image url', image.url, 'traces:', results.inserted, 'inserted,', results.updated, 'updated');
n++; log.debug('sync\'d image trace', n + '/' + len);
            callback();
          });
        },
        function(err) {
          if (err) {
            log.warn('can\'t sync image traces:', err);
          }
          log.info('all image traces sync finished');
        }
      );
    });
  });
};

local.syncTracesPhone = function(persons) {
  tracesPhone.getAllPhonesDateOfLastSync(function(err, traces) {
    // build personsAvailable array (with all active persons phones)
    var personsAvailable = persons.filter(function(person) { // filter out persons with not available phone
      return person.phoneIsAvailable && person.phone;
    }).map(function(person) { // build personsAvailable array with person key, phone, and trace date of last sync
      var personPhone = {};
      personPhone.key = person.key;
      personPhone.phone = person.phone;
      personPhone.dateOfLastSync = person.dateOfLastSync;
      personPhone.tracesDateOfLastSync = traces[person.phone];
      return personPhone;
    });

    personsAvailable.sort(function(a, b) { // sort personsAvailable array to have traces never sync'd on top
      return (typeof a.tracesDateOfLastSync === 'undefined' && typeof b.tracesDateOfLastSync === 'undefined') ? b.dateOfLastSync - a.dateOfLastSync :
             (typeof a.tracesDateOfLastSync !== 'undefined') ?  1 :
             (typeof b.tracesDateOfLastSync !== 'undefined') ? -1 :
             a.tracesDateOfLastSync - b.tracesDateOfLastSync
      ;
    });
    //log.debug('personsAvailable after sort:', personsAvailable);

var len = personsAvailable.length;
var n = 0;
    async.eachSeries(
      personsAvailable,
      function(person, callback) {
        tracesPhone.sync(person.phone, function(err, results) {
          if (err) {
            return callback(err);
          }
          //log.info('sync\'d phone traces for person', person.key, 'phone', person.phone, 'traces:', results.inserted, 'inserted,', results.updated, 'updated');
n++; log.debug('sync\'d phone trace', n + '/' + len);
          callback();
        });
      },
      function(err) {
        if (err) {
          log.warn('can\'t sync phone traces:', err);
        }
        log.info('all phone traces sync finished');
      }
    );
  });
};

exports.upsert = function(person, callback) {
  Person.findOne(
    { key: person.key },
    function(err, doc) {
      if (err) {
        return callback('could not verify presence of person ' + person.key + ': ' + err.toString());
      }
      var isNew = false;
      var isSomeFieldChanged = false;
      var isUrlPageChanged = false;

      if (!doc) { // person did not exist before
        isNew = true;
        doc = new Person();
        //doc.dateOfFirstSync = new Date();
        doc.dateOfFirstSync = person.dateOfLastSync; // person is new, since last sync is the first one
      }

      // TODO: should choose which tests to do to assert a person did change...
      // merge sync'd person data to database person object
      for (var prop in person) {
        // record if any intrinsic property was modified
        if (!isNew) {
          // check if change control fields contents did change
          if ((prop === 'etag') && (doc.etag && person.etag) && (doc.etag != person.etag)) {
            //log.debug('person', doc.key, doc.name, 'url page ETAG did change');
            isUrlPageChanged = true;
          }
          if ((prop === 'md5') && (doc.md5 && person.md5) && (doc.md5 != person.md5)) {
            //log.debug('person', doc.key, doc.name, 'url page MD5 did change');
            isUrlPageChanged = true;
          }

          // etag and md5 are second level; dateOfLastSync is always modified; isPresent is modified later
          if (prop in doc && prop === 'etag' && prop === 'md5' && prop !== 'dateOfLastSync' && prop !== 'isPresent' && prop !== 'alias' && doc._doc[prop] !== person[prop]) {
            if (config.env === 'development') {
              log.info('person', person.key, person.name + ':', 'changed'.red + ' "' + prop + '" property:', local.diffColor(doc[prop], person[prop]));
            }
            isSomeFieldChanged = true;
          }
        }
      }

      // merge sync'd person data to database person object
      for (/*var */prop in person) {
        doc[prop] = person[prop]; // TODO: if some sort of historical recording is needed, do it here...
      }

      doc.save(function(err) {
        if (err) {
          return callback('could not save person ' + doc.key + ': ' + err.toString());
        }
        log.info('person', doc.key, doc.name, (isNew ? 'inserted'.yellow : isUrlPageChanged ? 'page sum changed'.cyan : isSomeFieldChanged ? 'page field changed'.cyan : 'unchanged'.grey));
        doc.isChanged = isNew || isUrlPageChanged || isSomeFieldChanged;
        callback(null, doc); // success
      });
    }
  );
};

exports.updatePersonUserData = function(personKey, user, data, callback) {
log.debug('updatePersonUserData - ', 'personKey:', personKey, 'user:', user, 'data:', data);
  if (!user) { // user is not valid
    return callback('user cannot be empty');
  }
  if (!user.username) { // user is not valid
    return callback('user name cannot be empty');
  }
/* TODO:
  if (userId !=== logged in user id) { // user is not logged in user
    return callback('user is not valid');
  }
*/
  var query = { username: user.username, personKey: personKey};
  //data.username = user.username;
  UserToPerson.findOneAndUpdate(query, data, { upsert: true }, function(err, doc) {
    if (err) {
      return callback('could not update data of user ' + user.username + ' for person ' + personKey + ': ' + err.toString());
    }
    callback(null, doc); // success
  });
};

exports.updatePersonUserDataARRAY = function(personKey, user, data, callback) {
  Person.findOne(
    { key: personKey },
    function(err, doc) {
      if (err) {
        return callback('could not verify presence of person ' + personKey + ': ' + err.toString());
      }
      if (!doc) { // person does not exist
        return callback('person ' + personKey + ' does not exist');
      }
      if (!user) { // user is not valid
        return callback('user cannot be empty');
      }
      if (!user.username) { // user is not valid
        return callback('user name cannot be empty');
      }
log.info('api controllers persons updatePersonUserData - user:', user, data);
/* TODO:
      if (userId !=== logged in user id) { // user is not logged in user
        return callback('user is not valid');
      }
*/
      doc.update(
        {
          //$set: {
          //  'users.username': user.username,
          //  'users.hide': data.hide
          //}
          $push: {
            'users': {
              'username': user.username,
              'hide': data.hide
            }
          }
        },
        {
           upsert: true
        },
        function(err) {
          if (err) {
            return callback('could not update person ' + doc.key + ' for user ' + user.username + ': ' + err);
          }
          log.info('person', doc.key, 'updated with user', user.username, 'data');
          callback(null, doc); // success
        }
      );
    }
  );
};

exports.getAll_WITHUSERFILTER = function(filter, options, callback) {
  // TODO: { results: { $elemMatch: { product: "xyz", score: { $gte: 8 } } } }
};

if (config.env === 'development') {
  // TODO: remember to remove dependencies from packages.json on production (should be done automatically)
  local.diffColor = function(string1, string2) {
    var jsdiff = require('diff');
  
    string1 = string1 ? string1.toString().replace(/\n+/, ' ') : '';
    string2 = string2 ? string2.toString().replace(/\n+/, ' ') : '';
  
    var differences = jsdiff.diffSentences(string1, string2);
    var differencesColored = '';
    differences.forEach(function(part) {
      // green for additions, red for deletions, grey for common parts
      var color =
        (part.added) ? 'green' : // added
        (part.removed) ? 'red' : // removed
        'grey' // unchanged
      ;
      differencesColored += (differencesColored ? ' ' : '') + part.value[color];
    });
    return differencesColored;
  };
}

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
    var P = persons[i];
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

/*
// TODO: remove reset (use only when changing config.images.thresholdDistance)
local.resetAliases(persons);
*/

  // TODO: avoid alias groups with just one people

  Image.find({}, 'personKey signature', function(err, images) {
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

    // check if person (P) belongs to an alias group, or if it constitutes a new alias group
    var aliasesCount = 0;
    for (var p = 0; p < personsLen; p++) {
      var P = persons[p]; // P is the person we arge going to check for aliases

      // inner loop, to check every person (P) to every other person (Q)
      for (var q = 0; q < personsLen; q++) {
        var Q = persons[q]; // Q is the current person from all persons
        if (P.key === Q.key) { // skip the same person
          continue;
        }
        if (local.areSimilar(P, Q)) { // P and Q are similar
          if (!P.alias) { // no alias yet, create a new one
            P.alias = local.aliasCreate();
            local.savePerson(P); // save group alias to P
          }
          if (Q.alias !== P.alias) { // Q (similar to P) has an alias different from alias group, should not happen
            if (Q.alias) { // Q had already an alias
              //log.warn('syncAliases - Q', Q.key, '(similar to P', P.key, ') had an alias (', Q.alias, ') different from alias group!');
              // this should not be a big problem, the different alias group could come
              // from a person who changed his key (completely new page but some photos kept)
            }
            Q.alias = P.alias;
            local.savePerson(Q); // save group alias to Q
          }
          aliasesCount++;
          //log.silly('syncAliases - person:', 1 + p, '/', personsLen, 'key:', Q.key, 'is similar to person:', P.key);
        }
      }
    }
    log.info('' + aliasesCount, 'aliases found');
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
      // TODO: do we need basename?
      if (err) {
        return callback(err);
      }

      // add to each person its images, building people
      for (var i = 0, personsLen = persons.length; i < personsLen; i++) {
        people[i] = persons[i].toObject();
        people[i].images = [];
        for (var j = 0, len = images.length; j < len; j++) {
          var img = images[j].toObject();
          if (img.personKey === people[i].key) {
            people[i].images.push(img);
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
  if ((person1.isPresent && person2.isPresent) && (person1.phone >= 0 && person2.phone >= 0) && (person1.phone === person2.phone)) {
    return true;
  }
//log.debug('areSimilar - closest images distance * 64:', local.getClosestImages(person1, person2).distance * 64);
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
  for (var i = 0, len1 = person1.images.length; i < len1; i++) {
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
              //var basename = file.replace(new RegExp(config.images.path + '/'), '');
              //var basename = file.replace(config.images.path + '/', '');
              var basename = file.replace(new RegExp(config.images.path + '/.*?/.*?/'), '');
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
        //var key = url.replace(/\.\.\/escort\/annuncio\/(.*?)/, '$1');
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

local.getDetailsAddress = function($, provider) {
  var val = '', element;
  if (provider.key === 'SGI') {
    element = $('td[id="ctl00_content_CellaZona"]');
    if (element) {
      val = $(element).text();
    }
  }
  if (provider.key === 'TOE') {
    var match = $.html().match(/.*data-map-address="\s*(.*?)\s*".*/);
    if (match && match.length === 2) {
      val = match[1];
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
      val = $(element).html();
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
      val = $(element).html();
    }
  }
  if (provider.key === 'FORBES') {
    element = $('table[class="sinottico"]').next('p');
    val = $(element).html();
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
    val = '-1';
  }
  return val;
};

local.getDetailsCategory = function($, provider) {
  var val = null; // TODO: avoid using 'element' in all these functions...
  if (provider.key === 'SGI') {
    // no category provided
  }
  if (provider.key === 'TOE') {
    val = $('span:contains("Categoria:")').next().text().trim().toLowerCase();
  }
  if (provider.key === 'FORBES') {
    val = 'Powerful';
  }
  return val;
};

local.getImagesSections = function($, provider) {
  var val = null; // TODO: avoid using 'element' in all these functions...
//var v1, v2;
  if (provider.key === 'SGI') {
    val += $('tr[id="ctl00_content_TableRow0"]').html();
//v1 = $('tr[id="ctl00_content_TableRow0"]').html();
//log.warn('getImagesSections SGI cover length:', v1);
    val += $('table[id="ctl00_content_tableFoto"]').html();
//v2 = $('table[id="ctl00_content_tableFoto"]').html();
//log.warn('getImagesSections SGI icons length:', v2);
    val = val.replace(/\?t=\d+/g, ''); // remove timestamp part from image urls
//log.warn('getImagesSections SGI images:', val);
  }
  if (provider.key === 'TOE') {
    //val += $('div[class~="pi-img-shadow"]').html(); // do not get site showcase image (it is repeated in links, below)
//v1 = $('div[class~="pi-img-shadow"]').html();
//log.warn('getImagesSections TOE cover length:', v1.length);
    val += $('div[id="links"]').html();
//v2 = $('div[id="links"]').html();
//log.warn('getImagesSections TOE icons length:', v2.length);
  }
  if (provider.key === 'FORBES') {
    val += $('table[class="sinottico"]').html();
  }
  return val;
};

local.getDetailsImageUrls = function($, provider) {
  var val = [], href;
  if (provider.key === 'SGI') {
    href = provider.url + '/' + $('img[id="ctl00_content_FotoAnteprima"]').attr('src'); // showcase image
    href = href
      .replace(/\.\.?\//g, '')
      .replace(/\?t=.*/, '')
    ;
    val.push({ href: href, isShowcase: true });
    $('a[rel="group"][class="fancybox"]').each(function(index, element) { //other images
      var href = provider.url + '/' + $(element).attr('href');
      href = href
        .replace(/\.\.?\//g, '')
        .replace(/\?t=.*/, '')
      ;
      val.push({ href: href, isShowcase: false });
    });
  }
  if (provider.key === 'TOE') {
    href = provider.url + '/' + $('img[id="mainImgRef"]').attr('src'); // showcase image
    href = href
      .replace(/\.\.?\//g, '')
    ;
    val.push({ href: href, isShowcase: true });
    $('div[id="links"]').find('a').each(function(index, element) { // other images
      href = provider.url + '/' + $(element).attr('href');
      href = href
        .replace(/\.\.?\//g, '')
      ;
      val.push({ href: href, isShowcase: false });
    });
  }
  if (provider.key === 'FORBES') {
    $('table[class="sinottico"]').find('tr').eq(1).find('a > img').each(function(index, element) { // showcase image
      href = 'https:' + $(element).attr('src');
      val.push({ href: href, isShowcase: true });
    });
    $('div[class="thumbinner"]').find('a > img').each(function(index, element) {
      if ($(element).attr('src').match(/\.jpg$/i)) { // other images
        href = 'https:' + $(element).attr('src');
        val.push({ href: href, isShowcase: !!!val.length });
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
                      var country = catPatternObj[catPattern];
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

/*
// TODO: DEBUG ONLY ///////////////////////////////////////////////////////////
var db = require('../models/db'); // database wiring
exports.getAll_TEST_AGGREGATE({}, {}, function(err, result) {
  if (err) {
    return log.error('getAll_TEST_AGGREGATE:', err);
  }
  log.info('getAll_TEST_AGGREGATE:', result);
});
///////////////////////////////////////////////////////////////////////////////
*/

/*
// TODO: DEBUG ONLY ///////////////////////////////////////////////////////////
var db = require('../models/db'); // database wiring
var person = {};
person.key = 'FORBES/Angela Merkel';
var user = {};
user._id = '56901e32af7eeb223833e360'; // marco ObjectId
var data = { hide: true };
exports.updatePersonUserData(person, user, data, function(err, result) {
  if (err) {
    return log.error('updatePersonUserData error:', err);
  }
  //log.info('updatePersonUserData result:', result);

  log.debug('show results:');
  Person.findOne(
    { key: person.key },
    function(err, doc) {
      if (err) {
        return console.error('could not verify presence of person', person.key + ':', err);
      }
      if (!doc) { // person does not exist
        return console.error('person ' + person.key + 'does not exist');
      }
      //log.info('person', person.key, doc.toObject().users[0].hide ? 'should be' : 'should\'t', 'be hidden to it\'s first user');
      log.info('person', person.key, doc.toObject());
    }
  );
});
///////////////////////////////////////////////////////////////////////////////
*/