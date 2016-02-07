'use strict';

//var fs = require('fs'); // file-system handling
var mkdirp = require('mkdirp') // to make directories with parents
  , path = require('path') // path handling
  , async = require('async') // to call many async functions in a loop
  , crypto = require('crypto') // to create hashes
  , jimp = require('jimp') // image manipulation
  , network = require('../controllers/network') // network handling
  , Image = require('../models/image') // images handling
  , Person = require('../models/person') // persons handling
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

// get all images for person
exports.getByIdPerson = function(idPerson, callback) {
  Image.find({ idPerson: idPerson }, function(err, images) {
    return callback(err, images);
  });
};

exports.syncPersonsImagesCheck = function(persons, callback) {
  Image.find().lean().exec(function(err, images) { // lean gets plain objects
    if (err) {
      return callback(err);
    }
    log.debug('all images array length:', images.length);
    async.eachSeries(
      persons,
      function(person, callbackPerson) {
        async.eachSeries( // TODO: we have to serialize images sync, otherwise findSimilarSignatureImage will not find same person images (RIGHT?)
          person.imageUrls,
          function(imageUrl, callbackImage) {
            var personImages = local.grep(
              { personKey: person.key, url: imageUrl.href }
              , images
            );
            var image = {};
            if (personImages.length >= 1) { // existing image url
              var personImage = personImages[0];
              image.url = personImage.url;
              image.isNew = false;
              image.isShowcase = personImage.isShowcase;
              image.dateOfFirstSync = personImage.dateOfFirstSync;
              image.etag = personImage.etag;
              image.personKey = personImage.personKey;
            } else { // new image url
              log.info('image of person', person.key, imageUrl.href, 'is new, skipping for this check');
            }
            image.type = 'image';

            var t; if (config.profile) t = process.hrtime(); // TODO: PROFILE ONLY
            network.fetch(image, function(err, img) { // fetch image resource
              if (err) {
                log.warn('network fetch error:', err);
                return callback(err, image);
              }
              if (config.profile) log.debug('fetch image for person key', person.key + ':', process.hrtime(t)[0] + (process.hrtime(t)[1] / 1000000000), 'seconds');
              callbackImage(err);
            });
          },
          function(err) {
            callbackPerson(err);
          }
        );
      },
      function(err) {
        if (err) {
          return callback(err);
        }
        callback(null, persons);
      }
    );
  });
};

exports.syncPersonsImages = function(persons, callback) {
  //log.error(persons);
  //return callback(null, persons);

  // get all images in db
  Image.find().lean().exec(function(err, images) { // lean gets plain objects
    if (err) {
      return callback(err);
    }
    log.debug('all images array length:', images.length);
    async.eachSeries( // TODO: should we better serialize person images sync? (YES, otherwise too many ECONNRESET or EAI_AGAIN in request()...)
      persons,
      function(person, callbackPerson) {

        if (person.isChanged) {
          log.debug('images for person', person.key, person.name, 'did possibly change'.yellow);
        } else {
          //log.debug('images for person', person.key, person.name, 'did not change'.white);
        }

        // TODO: try this!
        // do not download images if a person did not change and whenImageChangesUrlChangesToo
        if (!person.isChanged && person.whenImageChangesUrlChangesToo) {
          log.debug('person', person.key, person.name, 'did not change and whenImageChangesUrlChangesToo, skipping this person images sync');
          return callbackPerson();
        }

      async.eachSeries( // TODO: we have to serialize images sync, otherwise findSimilarSignatureImage will not find same person images
          person.imageUrls,
          function(imageUrl, callbackImage) {
            download(imageUrl, person, images, function(err, image) {
              if (err) { // 50x or other issues
//log.error('syncPersonsImages - download error:', err);
                //return callbackImage(err); // go on with other images...
              }
              // TODO: decouple following check... : if (!image) {...}   if (!image.isChanged) { ... }
              if (!image || !image.isChanged) { // 40x or 304
//log.error('syncPersonsImages - image', image.url, 'not changed');
                return callbackImage();
              }
              async.waterfall(
                [
                 function(callback) {
                  local.getSignatureFromImage(image, images, callback);
                 },
                  local.findSimilarSignatureImage,
                  local.saveImageToFS,
                  local.saveImageToDB,
                ],
                function (err, image) {
//if (err) { log.error('syncPersonsImages - waterfall error:', err); }
                  callbackImage(err);
                }
              );
            });
          },
          function(err) {
//if (err) { log.error('syncPersonsImages - final image urls error:', err); }
            callbackPerson(err);
          }
        );
      },
      function(err) {
        if (err) {
//if (err) { log.error('syncPersonsImages - final persons error:', err); }
          return callback(err);
        }
        callback(null, persons);
      }
    );

  });

  function download(imageUrl, person, images, callback) {
    var personImages = local.grep(
      { personKey: person.key, url: imageUrl.href }
      , images
    );

    // assert for at most one result (TODO: only while developing)
    // TODO: commented this test since showcase image can have a cropped duplicate, which do not seem similar to Jimp.signature
    //if (personImages.length > 1) { throw new Error('more than one image found for person key ' + person.toObject().key, ' and url ' + imageUrl); }

    var image = {};
    //image.custom = {};
    //if (personImages.length === 1) { // existing image url
    if (personImages.length >= 1) { // existing image url
      var personImage = personImages[0];
      image.url = personImage.url;
      image.isNew = false;
      image.isShowcase = personImage.isShowcase;
      image.dateOfFirstSync = personImage.dateOfFirstSync;
      image.etag = personImage.etag;
      image.personKey = personImage.personKey;
    } else { // new image url
      var now = new Date();
      image.url = imageUrl.href;
      image.isNew = true;
      image.isShowcase = imageUrl.isShowcase;
      image.dateOfFirstSync = now;
      image.etag = null;
      image.personKey = person.key;
    }
    image.type = 'image';

//var t; if (config.profile) t = process.hrtime(); // TODO: PROFILE ONLY
    network.fetch(image, function(err, img) { // fetch image resource
    if (err) {
      log.warn('network fetch error:', err);
      return callback(err, image);
    }

/*
// img.url could have been redirected to https...
if (image.url !== img.url) log.error('SOURCE IMAGE URL AFTER FETCH CHANGES! image.url, img.url:', image.url, img.url);
*/

    // copy fetched properties to image
    //image.url = img.url; // TODO: this could be changed, i.e.: for a sche change from http to https...
    image.contents = img.contents;
    image.size = img.contents ? img.contents.length : null;
    image.etag = img.etag;
    image.isChanged = img.isChanged;

/*
// TODO: DEBUG ONLY!
if (img.contents && img.contents.length > 0) log.debug('img.contents.length:', img.contents.length);
*/

/*
// TODO: DEBUG ONLY !!!
image.isChanged = true;
log.error('download - img.basename:', personImage.basename);
image.basename = personImage.basename;
image.url += crypto.randomBytes(3).toString('ascii');
*/

//if (config.profile) log.debug('download image for person key', person.key + ':', process.hrtime(t)[0] + (process.hrtime(t)[1] / 1000000000), 'seconds');

      callback(err, image);
    });
  }

  /**
   * create image versions and save to filesystem
   */
local.saveImageToFS = function(image, images, callback) {
//var t; if (config.profile) t = process.hrtime(); // TODO: PROFILE ONLY
    if (image.hasDuplicate) {
      return callback(null, image, images);
    }
/*
    if (image.hasTwin) {
      return callback(null, image, images);
    }
*/

    // use a hash of response url + current timestamp as filename to make it unique
    var hash = crypto.createHash('md5').update(image.url + Date.now()).digest('hex');
    var ext = path.extname(image.url); // use url extension as filename extension
    ext = local.normalizeExtension(ext);
    var basename = hash + ext;
    image.basename = basename;

    // let use jimp to save any version image
    var buf = new Buffer(image.contents, 'binary');
    jimp.read(buf, function(err, img) { // THIS IS FAST
      buf = null; // delete Buffer object (TODO: is this really useful?)
      if (err) {
        log.warn(err);
        return callback(err);
      }
      //log.debug('read', image.url);

      // loop through all versions to resize and save image
      async.forEach(
        Object.keys(config.images.versions),
        function(key, callbackVersion) {
          var version = config.images.versions[key];

          // create directory, if not present
          var destinationPath = config.images.path + '/' + image.personKey + '/' + version.dir;
          var destination = destinationPath + '/' + basename;
          try {
            mkdirp.sync(destinationPath);
          } catch(err) {
            if (err.code !== 'EEXIST') {
              log.silly('can\'t make path', destinationPath); // TODO: remove me on production
              return callbackVersion(err);
            }
          }
  
          // directory created, build image version
          if (key === 'full') { // full version, just save image with no resize
            //log.silly('full writing to', key);
            img
              .autocrop(false)
              .quality(version.quality)
              .write(destination, function(err) {
                if (err) {
//log.error('saveImageToFS full error:', err);
                  //log.silly('can\'t write full size image version via jimp to', destination, ':', err);
                  return callbackVersion(err);
                }
                //log.info('written full to', destination);
                callbackVersion(); // success
              })
            ;
          } else { // not full version, resize image and save
            // to avoid enlarging showcase images
            var width = Math.min(version.width, img.bitmap.width);
            //log.silly('other writing to', key, 'width:', width);
            img
              .autocrop(false)
              .resize(width, jimp.AUTO)
              .quality(version.quality)
              .write(destination, function(err) {
                if (err) {
//log.error('saveImageToFS showcase error:', err);
                  //log.silly('can\'t write other size image version via jimp to', destination, ':', err);
                  return callbackVersion(err);
                }
                //log.info('written other to', destination);
                callbackVersion(); // success
              })
            ;
          }
        }, // async each versions iteration function done
        function(err) { // all directories and image versions created 
//if (err) { log.error('saveImageToFS final error:', err); }
//if (config.profile) log.debug('saveImageToFS:', process.hrtime(t)[0] + (process.hrtime(t)[1] / 1000000000), 'seconds');
          callback(err, image, images); // finished
        }
      ); // async each versions done
    }); // jimp read / resize / write done
  };

};

/**
 * save image to database
 */
local.saveImageToDB = function(image, images, callback) {
  // TODO: we should save image to DB even if it is a duplicate, since old version url could be unavailable, now
  /*
    if (image.hasDuplicate) {
      //log.silly('saveImageToDB: image is void (has duplicate): SKIPPING');
      return callback(null, null);
    }
  */

  // save image and person in series
  async.series(
    {
      image: function(callbackInternal) {
        Image.findOneAndUpdate(
          { basename: image.basename, personKey: image.personKey}, // query
          image, // object to save
          { // options
            new: true, // return the modified document rather than the original
            upsert: true, // creates the object if it doesn't exist
            passRawResult: true // pass back mongo row result
          },
          function(err, doc, raw) { // result callback
            if (err) {
              log.warn('can\'t save image', doc.basename, ':', err);
            } else {
              if (raw.lastErrorObject.updatedExisting) {
                //log.info('image', doc.personKey, doc.basename, 'updated'.cyan);
              } else {
                log.info(' ' + 'image', doc.personKey, doc.basename, 'added'.magenta);
              }
              images.push(doc); // push added image
            }
            callbackInternal(err, doc); // finish image save
          }
        );
      },
      person: function(callbackInternal) {
        var showcase = exports.getShowcase(image.personKey, images);
        if (!showcase) {
          return callbackInternal(null, null);
        }
        if (!showcase.basename) {
          return callbackInternal(null, null);
        }

        // save person showcase basename
        Person.findOneAndUpdate(
          { key: image.personKey }, // query
          { showcaseBasename: showcase.basename }, // object to save
          { // options
            new: true, // return the modified document rather than the original
            upsert: true, // creates the object if it doesn't exist
            passRawResult: true // pass back mongo row result
          },
          function(err, doc, raw) { // result callback
            if (err) {
              log.warn('can\'t save showcase for person', doc.key, ':', err);
            } else {
              //log.info('person', doc.key, raw.updatedExisting ? 'updated' : 'added', 'showcase basename for image of person', doc.key + ':', doc.showcaseBasename);
            }
            callbackInternal(err, doc); // finish image save
          }
        );
      }
    },
    function(err, results) { // final callback
      callback(err, results);
    }
  );
};

local.getSignatureFromImage = function(image, images, callback) {
  jimp.read(new Buffer(image.contents, "binary"), function(err, img) {
    if (err) {
      return callback('can\'t read image contents:', err);
    }
    exports.signature(img, function(err, signature) {
      if (err) {
        return callback(err);
      }
      image.signature = signature;
      callback(null, image, images);
    });
  });
};

local.findSimilarSignatureImage = function(image, images, callback) {
  var minDistance = 1; // maximum distance possible
  var imageMostSimilar;
  var personImages = local.grep(
    { personKey: image.personKey },
    images
  );

  image.hasDuplicate = false;
  for (var i = 0, len = personImages.length; i < len; i++) {
    var personImage = personImages[i];
    if (!image.signature) { // should not happen
      log.warn('findSimilarSignatureImage - image with no signature:', personImage.url);
      break; // skip this image without signature
    }
    var distance = exports.distance(image.signature, personImage.signature);
    if (distance <= minDistance) {
      minDistance = distance;
      imageMostSimilar = personImage;
    }
  }

  if (minDistance <= config.images.thresholdDistanceSamePerson) {
    image.hasDuplicate = true;
    //console.info('image for person', image.personKey, 'with url <img src="'+image.url+'"> has duplicate in <img src="'+imageMostSimilar.url+'">'.white);
  } else {
    //console.info('image for person', image.personKey, 'with url <img src="'+image.url+'"> is new'.cyan);
  }

  if (image.hasDuplicate) { // copy properties (which should be set afterwards for new images) from imageMostSimilar
    image.basename = imageMostSimilar.basename;
  }

  callback(null, image, images);
};

local.findSimilarSignatureImageOOOOOOOOOOOOOOLLLLLLLLLLLLLLLLLLDDDDDDDDDDDDDDDDDD = function(image, images, callback) {
var t; if (config.profile) t = process.hrtime(); // TODO: PROFILE ONLY
/*
// TODO: DEBUG ONLY
image.hasDuplicate = true;
return callback(null, image, images);
*/
//log.debug('findSimilarSignatureImage - images length:', images.length);

  // TODO: SIMILAR IMAGE COULD BE NOT ONLINE ANYMORE, SO SHOULD SAVE NEW VERSION (WITH NEW URL) NONETHELESS...
//var t; if (config.profile) t = process.hrtime(); // TODO: PROFILE ONLY
  var minDistance = 1; // maximum distance possible
  var imageMostSimilar;
  var personImages = local.grep(
    { personKey: image.personKey },
    images
  );

  image.hasTwin = false;
  image.hasDuplicate = false;
  for (var i = 0, len = personImages.length; i < len; i++) {
//log.debug(i, '-------------------');
    var personImage = personImages[i];
if (personImage.personKey !== image.personKey) {
  log.error('findSimilarSignatureImage - personImage.personKey !== image.personKey:', personImage.personKey, '!==', image.personKey);
}
//log.info('image', 'x', 'sig:', image.signature);
//log.info('image', i, 'sig:', personImage.signature);
//if (image.signature === '1000100101010010101100001100000010000000000010000101011001010010') {
//  log.warn('findSimilarSignatureImage - signature to be checked here');
//}
    // check image url, beforehand
log.warn('TWIN URL CHECK:', image.url, '===', personImage.url);
    if (image.url === personImage.url) {
      image.hasDuplicate = true;
      image.basename = personImage.basename; // copy old properties since image will be saved without saveImageToFS
//log.debug('findSimilarSignatureImage - IMAGE HAS DUPLICATE (SAME URL):', image.personKey, image.url, personImage.url);
      break; // same url, break loop here
    }

    if (!image.signature) {
//log.warn('findSimilarSignatureImage - image with no signature:', personImage.url);
      break; // skip this image without signature
    }
    var distance = exports.distance(image.signature, personImage.signature);
//log.debug('findSimilarSignatureImage - distance:', distance);
    if (distance <= minDistance) {
      minDistance = distance;
      imageMostSimilar = personImage;
    }
  }
  if (minDistance <= 0) { // the image found is identical
    image.hasTwin = true;
console.warn('image.hasTwin');
  } else {
    if (minDistance <= config.images.thresholdDistanceSamePerson) {
      image.hasDuplicate = true;
console.warn('image.hasDuplicate');
//log.debug('findSimilarSignatureImage - IMAGE HAS DUPLICATE:', image.personKey, image.url, imageMostSimilar.url);
    } //else { log.info('findSimilarSignatureImage - IMAGE IS UNIQUE:', image.url, ', distance:', minDistance); }
else { log.warn('image.new'); }
  }

//if (config.profile) log.debug('PROFILE findSimilarSignatureImage', process.hrtime(t)[0] + '.' + process.hrtime(t)[1], 'seconds');
  // TODO: we should save image to DB even if it is a duplicate, since old version url could be unavailable, now

// TODO: CHECK HEREEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE
  if (image.hasDuplicate && imageMostSimilar) { // copy properties (which should be set afterwards) from imageMostSimilar to image
//log.debug('findSimilarSignatureImage - IMAGE HAS DUPLICATE AND IMAGEMOSTSIMILAR EXISTS, setting image.basename from:', image.basename, 'to', imageMostSimilar.basename);
    image.basename = imageMostSimilar.basename;
  }

if (config.profile) log.debug('findSimilarSignatureImage:', process.hrtime(t)[0] + (process.hrtime(t)[1] / 1000000000), 'seconds');
  callback(null, image, images);
};

exports.rebuildAllSignatures = function(callback) { // TODO: do we need this function? Probably more useful a check of duplicates on disk...
  Image.find({}, function(err, images) {
    if (err) {
      return callback(err);
    }
    log.debug('images size:', images.length);
    var fs = require('fs');
    async.eachSeries(
      images,
      function(image, cb) {
        var data = fs.readFileSync('/home/marco/apps/escrape2/data/images/' + image.personKey + '/full/' + image.basename, 'binary');
        image.contents = data;
        data = null;
        var signature = image.signature;
        local.getSignatureFromImage(image, images, function(err, result) {
          if (err) {
            return cb(err);
          }
          if (signature !== image.signature) {
            var distance = exports.distance(signature, image.signature);
            image.signature = signature; // reset;
            log.warn('image for person', image.personKey, image.basename, 'has different signature (distance is ' + distance + '):', '\n', signature, '\n', image.signature);
            local.saveImageToDB(image, images, function() {
              if (err) { 
                return cb(err);
              }
              cb();
            });
          } else {
            //log.info('image for person', image.personKey, image.basename, 'has the same signature');
            cb();
          }
        });
      },
      function(err) {
        if (err) {
          return callback(err);
        }
        log.debug('done');
      }
    );
  });
};

exports.signature = function(contents, callback) {
//var t; if (config.profile) t = process.hrtime(); // TODO: PROFILE ONLY
  var signature = contents.hash(2);
  if (signature.length !== 64) { // ( 11 = ceil(64 / log₂(64)) )
    return callback('wrong signature length:', signature.length, signature);
  }
  //log.info('signature:', signature);
//if (config.profile) log.debug('PROFILE signature', process.hrtime(t)[0] + '.' + process.hrtime(t)[1], 'seconds');
  callback(null, signature); // success
};

exports.distance = function(signature1, signature2) {
//var t; if (config.profile) t = process.hrtime(); // TODO: PROFILE ONLY
  if (!signature1 || !signature2) {
    return 1; // maximum possible distance
  }
  var counter = 0;
  for (var k = 0; k < signature1.length; k++) {
    if (signature1[k] != signature2[k]) {
      counter++;
    }
  }
//if (config.profile) log.debug('PROFILE distance', process.hrtime(t)[0] + '.' + process.hrtime(t)[1], 'seconds');
  return (counter / signature1.length);
};

// TODO: test this (rebuild ALL images signatures, before...)
exports.signatureBASE16 = function(image, callback) {
  var signature = image.hash(16);
  if (signature.length !== 11) { // ( 11 = ceil(64 / log₂(64)) )
    return callback('wrong signature length:', signature.length, signature);
  }
  //log.info('signature:', signature);
  callback(null, signature); // success
};

// TODO: test this
exports.distanceBASE16 = function(signature1, signature2) {
  if (!signature1 || !signature2) {
    return 1; // maximum possible distance
  }
  var counter = 0;
  for (var k = 0; k < signature1.length; k++) {
    counter += exports.popCount(signature1[k] ^ signature2[k]); // bitwise XOR
  }
  return (counter / signature1.length);
};

/**
 * counts number of bits set in integer value
 */
// TODO: test this
exports.popCount = function(v) {
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return ((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
};

/*
 popCountSLOW(n)
 Returns the bit population count of n (that is: how many bits in n are set to 1)
 n must be an unsigned integer in the range [0..(2^32)-1]
 This lookup-table-free method is from Kernighan & Ritchie's "The C Programming Language"
 Exercise 2.9 (on page 62 of my copy). Not sure whether they (K&R) are the inventors.
*/
// TODO: test this
exports.popCountSLOW = function(n) {
  n >>>= 0; /* force uint32 */
  for (var popcnt = 0; n; n &= n - 1) {
    popcnt++;
  }
  return popcnt;
};

// normalize extension (i.e.: .Jpg, .jpeg, .JPG => .jpg, .GIF => .gif, .PNG => .png)
local.normalizeExtension = function(ext) {
  var retval = ext;
  retval = retval.replace(/^\.jpe?g$/i, '.jpg');
  retval = retval.replace(/^\.gif$/i, '.gif');
  retval = retval.replace(/^\.png$/i, '.png');
  return retval;
};

exports.isShowcase = function(image, images) {
  //log.info('***** isShowcase() - image:', image);
  var personImages = local.grep(
    { personKey: image.personKey }
    , images
  );

  /*
  if (personImages.length === 0) { // should not happen
    log.warn('no image for person', image.personKey, 'in images');
  }
  */
  //log.info('***** isShowcase() - personImages.length:', personImages.length);
  //log.info('***** isShowcase() - personImages:', personImages);

  // to say this image is showcase for this person,
  // it should have 'isShowcase' flag set, *and*
  // - if more than one image for this person has it set -
  // be the one with most recent dateOfFirstSync
  var isShowcase = image.isShowcase;
  var anyShowcaseFound = false;
  for (var i = 0, len = personImages.length; i < len; i++) {
    if (personImages[i].isShowcase) {
      anyShowcaseFound = true;
      if (personImages[i].dateOfFirstSync > image.dateOfFirstSync) {
        isShowcase = false; // there is a more recent showcase image
      }
    }
  }
  return isShowcase;
};

exports.getShowcase = function(personKey, images) {
//log.debug('images.length:', images.length);
  var personImages = local.grep(
    { personKey: personKey }
    , images
  );
//log.debug('getShowcase() - personKey:', personKey);
//log.debug('getShowcase() - personImages.length:', personImages.length);
  var isShowcase = false;
  var showcase;
  for (var i = 0, len = personImages.length; i < len; i++) {
//log.debug('getShowcase() - i:', i);
    if (personImages[i].isShowcase) {
//log.debug('getShowcase() - i:', i, 'isShowcase');
//log.debug('getShowcase() - i:', i, 'showcase:', showcase);
//log.debug('getShowcase() - i:', i, 'personImages[i].dateOfFirstSync:', personImages[i].dateOfFirstSync);
//if (showcase)
//log.debug('getShowcase() - i:', i, 'showcase.dateOfFirstSync:', showcase.dateOfFirstSync);
      if (!showcase || (personImages[i].dateOfFirstSync > showcase.dateOfFirstSync)) {
        showcase = personImages[i]; // no showcase yet, or this person image date of first sync
                                    // is more recent than previous showcase's: this person image is showcase
      }
    }
  }
  return showcase; // no showcase (should not happen)
};

local.grep = function(what, where) {
  return where.filter(function(item) {
    var match = true;
    Object.keys(what).map(function(property, index) {
      match = (match && (item[property] === what[property]));
    });
    return match;
  });
};

module.exports = exports;

// TODO: DEBUG ONLY ///////////////////////////////////////////////////////////
var db = require('../models/db'); // database wiring

/*
Image.find({ $or: [ {basename:'b332ce4783bae8f37ad7d19f8eadd6ed.jpg'}, {basename: '28a799820ecc0e863c4de6f7a095cae7.jpg'} ] }, function(err, images) {
  if (err) {
    return log.error('Image.find:', err);
  }
  log.info('selected images size:', images.length);
  var fs = require('fs');
  fs.readFile('/home/marco/apps/escrape2/data/images/SGI/adv4302/full/b332ce4783bae8f37ad7d19f8eadd6ed.jpg', 'binary', function(err, data) {
    if (err) throw err;
    images[0].contents = data;
    log.info('getSignatureFromImage - images[1].signature:', images[1].basename, images[1].signature);
    local.getSignatureFromImage(images[0], images.slice(1, 2), function(err, result) {
      if (err) {
        return log.error('getSignatureFromImage:', err);
      }
      log.info('getSignatureFromImage - images[0].signature:', result.basename, result.signature);
    });
  });
});
*/

/*
Image.find({ $or: [ {basename:'b332ce4783bae8f37ad7d19f8eadd6ed.jpg'}, {basename: '28a799820ecc0e863c4de6f7a095cae7.jpg'} ] }, function(err, images) {
  if (err) {
    return log.error('Image.find:', err);
  }
  log.info('selected images size:', images.length);
  local.findSimilarSignatureImage(images[0], images.slice(1, 2), function(err, result) {
    if (err) {
      return log.error('findSimilarSignatureImage:', err);
    }
    log.info('findSimilarSignatureImage:', result.hasDuplicate);
  });
});
*/

/*
exports.rebuildAllSignatures();
*/
///////////////////////////////////////////////////////////////////////////////
