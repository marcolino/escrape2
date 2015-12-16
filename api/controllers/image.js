//var fs = require('fs'); // file-system handling
var mkdirp = require('mkdirp') // to make directories with parents
  , path = require('path') // path handling
  , async = require('async') // to call many async functions in a loop
  , crypto = require('crypto') // to create hashes
  , jimp = require('jimp') // image manipulation
  , network = require('../controllers/network') // network handling
  , Image = require('../models/image') // images handling
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

exports.syncPersonsImages = function(persons, callback) {
  //log.error(persons);
  //return callback(null, persons);

  // get all images in db
  Image.find().lean().exec(function(err, images) { // lean gets plain objects
    if (err) {
      return callback(err);
    }
    log.debug('all images array length:', images.length);

    async.eachSeries( // TODO: should we better serialize persons? (YES)
      persons,
      function(person, callbackPerson) {
        async.each/*Series*/( // TODO: should we better serialize images? (NO)
          person.imageUrls,
          function(imageUrl, callbackImage) {
            download(imageUrl, person, images, function(err, image) {
              if (err) { // 50x or other issues
                return callbackImage(err);
              }
              if (!image || !image.isChanged) { // 40x or 304
                return callbackImage();
              }
              async.waterfall(
                [
                  function(callback) { getSignatureFromImage(image, images, callback); },
                  findSimilarSignatureImage,
                  createImageVersions,
                  saveImageToDb,
                ],
                function (err, image) {
                  callbackImage(err);
                }
              );
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

  function download(imageUrl, person, images, callback) {
    var personImages = local.grep(
      { personKey: person.key, url: imageUrl.href }
      , images
    );
    // assert for at most one result (TODO: only while developing)
    // TODO: commented this test since showcase image can have a cropped duplicate, which do not seem similar to Jimp.signature
    //if (personImages.length > 1) { throw new Error('more than one image found for person key ' + person.toObject().key, ' and url ' + imageUrl); }

    var image = {};
    image.custom = {};
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

    //fetch(image, callback); // fetch image resource
    //fetch(image, function(err, image) { // fetch image resource
var t; if (config.profile) t = process.hrtime(); // TODO: PROFILE ONLY
    network.fetch(image, function(err, img) { // fetch image resource

if (image.url !== img.url) log.error('!!!!!!!!!!!!!!!! SOURCE IMAGE URL AFTER FETCH CHANGES !!!!!!!!!!!');

      /*
      if (img && img.custom) {
        // copy custom fields to image
        Object.keys(img.custom).forEach(function(key) {
          img[key] = img.custom[key];
        });
      }
      */
      // copy fetched properties to image
      image.contents = img.contents;
      image.etag = img.etag;
      image.isChanged = img.isChanged;

if (config.profile) log.debug('PROFILE fetch', process.hrtime(t)[0] + '.' + process.hrtime(t)[1], 'seconds');
      callback(err, image);
    });
  }

  var getSignatureFromImage = function(image, images, callback) {
var t; if (config.profile) t = process.hrtime(); // TODO: PROFILE ONLY
    jimp.read(new Buffer(image.contents, "binary"), function(err, img) {
      if (err) {
        return callback('can\'t read image contents:', err);
      }
      exports.signature(img, function(err, signature) {
        if (err) {
          return callback(err);
        }
        image.signature = signature;
if (config.profile) log.debug('PROFILE getSignatureFromImage', process.hrtime(t)[0] + '.' + process.hrtime(t)[1], 'seconds');
        callback(null, image, images);
      });
    });
  };

  var findSimilarSignatureImage = function(image, images, callback) {
var t; if (config.profile) t = process.hrtime(); // TODO: PROFILE ONLY
    var minDistance = 1; // maximum distance possible
    var imageMostSimilar;
    var personImages = local.grep(
      { personKey: image.personKey },
      images
    );

    image.hasDuplicate = false;
    for (var i = 0, len = personImages.length; i < len; i++) {
      var img = personImages[i];

      // check image url, beforehand
      if (image.url === img.url) {
        image.hasDuplicate = true;
log.debug('findSimilarSignatureImage - IMAGE HAS DUPLICATE (SAME URL):', image.url, img.url);
        break; // same url, break loop here
      }

      if (!image.signature) {
        //log.warn('findSimilarSignatureImage - image with no signature:', img.url);
        break; // skip this image without signature
      }
      var distance = exports.distance(image.signature, img.signature);
      if (distance <= minDistance) {
        minDistance = distance;
        imageMostSimilar = img;
      }
    }
    if (minDistance <= config.images.thresholdDistanceSamePerson) {
      image.hasDuplicate = true;
log.debug('findSimilarSignatureImage - IMAGE HAS DUPLICATE:', image.url, imageMostSimilar.url);
    } //else { log.info('findSimilarSignatureImage - IMAGE IS UNIQUE:', image.url, ', distance:', minDistance); }

if (config.profile) log.debug('PROFILE findSimilarSignatureImage', process.hrtime(t)[0] + '.' + process.hrtime(t)[1], 'seconds');
    callback(null, image.hasDuplicate ? null : image, images);
  };

  /**
   * create image versions
   */
  var createImageVersions = function(image, images, callback) {
var t; if (config.profile) t = process.hrtime(); // TODO: PROFILE ONLY
    var versions = [
      {
        name: 'full',
        width: 0, // full width
        quality: 100, // full quality
        dir: 'full', // directory for this version
      },
      {
        name: 'showcase',
        width: config.images.showcaseWidth, // showcase width
        quality: 75, // 75% quality
        dir: 'showcase', // directory for this version
      }
    ];

    if (!image) { // this should not happen: TODO: remove on production
      //log.silly('createImageVersions: image is void: SKIPPING');
      return callback(null, null, null);
    }

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
      async.eachSeries(
        versions,
        function(version, callbackVersion) {
          //log.error('VERSION NAME:', version.name);
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
          if (version.name === 'full') { // full version, just save image with no resize
            //log.silly('full writing to', version.name);
            img
              .autocrop()
              .write(destination, function(err) {
                if (err) {
                  log.silly('can\'t write full size image version via jimp to', destination, ':', err);
                  return callbackVersion(err);
                }
                //log.info('written full to', destination);
                callbackVersion(); // success
              })
            ;
          } else { // not full version, resize image and save
            // to avoid enlarging showcase images
            var width = Math.min(version.width, img.bitmap.width);
            //log.silly('other writing to', version.name, 'width:', width);
            img
              .autocrop()
              .resize(width, jimp.AUTO)
              .quality(version.quality)
              .write(destination, function(err) {
                if (err) {
                  log.silly('can\'t write other size image version via jimp to', destination, ':', err);
                  return callbackVersion(err);
                }
                //log.info('written other to', destination);
                callbackVersion(); // success
              })
            ;
          }
        }, // async each versions iteration function done
        function(err) { // all directories and image versions created 
if (config.profile) log.debug('PROFILE createImageVersions', process.hrtime(t)[0] + '.' + process.hrtime(t)[1], 'seconds');
          callback(err, image, images); // finished
        }
      ); // async each versions done
    }); // jimp read / resize / write done
  };

  /**
   * save image to DB
   */
  var saveImageToDb = function(image, images, callback) {
    if (!image) {
      //log.silly('saveImageToDb: image is void (has duplicate): SKIPPING');
      return callback(null, null);
    }
var t; if (config.profile) t = process.hrtime(); // TODO: PROFILE ONLY
    Image.findOneAndUpdate(
      { basename: image.basename, personKey: image.personKey}, // query
      image, // object to save
      { upsert: true }, // options
      function(err, doc) { // result callback
        if (err) {
          log.warn('can\'t save image', image.basename, ':', err);
        } else {
          log.info('image', image.personKey + '/' + image.basename, 'added');
        }
if (config.profile) log.debug('PROFILE saveImageToDb', process.hrtime(t)[0] + '.' + process.hrtime(t)[1], 'seconds');
        callback(err, image); // finish
      }
    );
  };

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
    counter += popCount(signature1[k] ^ signature2[k]); // bitwise XOR
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
      if (personImages[i].datOfFirstSync > image.datOfFirstSync) {
        isShowcase = false; // there is a more recent showcase image
      }
    }
  }
  return isShowcase;
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
