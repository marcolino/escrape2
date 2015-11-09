var fs = require('fs') // file-system handling
  , mkdirp = require('mkdirp') // to make directories with parents
  , path = require('path') // path handling
  , async = require('async') // to call many async functions in a loop
  , crypto = require('crypto') // to create hashes
  //, pHash = require('phash-image') // perceptual hash
  //, hammingDistance = require('hamming-distance') // calculate hamming distance
  , Jimp = require('jimp') // image manipulation
  //, _ = require('lodash') // lo-dash utilities
  , network = require('../controllers/network') // network handling
  , Image = require('../models/image') // images handling
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

/// DEBUG ONLY /////////////////////////////////////
var db = require('../models/db'); // database wiring
////////////////////////////////////////////////////

// syncronize all images for person
exports.syncPersonImages = function(person, callback) {
  if (!person) {
    return callback('no person to sync images for');
  }

  //var forceImageSaveToDbEvenIfNotChanged = true; // TODO: set this from options...
  var destination = config.imagesPath;
  var resource;
  var keyFull = person.providerKey + '/' + person.key;

  if (!person._imageUrls) {
    return callback('empty image urls for person ' + keyFull, person);
  }
  if (person._imageUrls.length <= 0) {
    return callback('no image urls for person ' + keyFull, person);
  }

  async.each(
    person._imageUrls, // 1st param is the array of items
    function(element, callbackInner) { // 2nd param is the function that each item is passed to
      var image = {};
      image.url = element;
      if (!image.url) {
        log.warn('can\'t sync image for person', keyFull, ', ', 'image with no url, ', 'skipping');
        return callbackInner(); // skip this inner loop
      }
      // set first image flag based on indexOf this element in person imageUrls
      image.isFirst = (person._imageUrls.indexOf(element) === 0);

      // find this url in images collection
      Image.findOne({ idPerson: person._id, url: image.url }, function(err, img) {
        if (err) {
          log.warn('can\'t find image ', image.url);
          return callbackInner();
        }
        if (!img) { // new image url
          img = new Image();
          img.url = image.url;
        }
        img._isFirst = image.isFirst; // TODO: debug this: is image coupled with img???
//log.debug('keyFull:', keyFull);
        resource = {
          personKey: person.providerKey + '/' + person.key,
          //personProviderKey: person.providerKey,
          //personKey: person.key,
          url: image.url,
          type: 'image',
          etag: img.etag, // comment this to force download
          lastModified: img.lastModified // comment this to force download
        };
        local.download(resource, destination, function(err, res) {
          if (err)  {
            log.warn('can\'t download image ', image.url, ', ', 'download error:', err);
            console.log('err:', err);
            return callbackInner();
          }
          if (!res) { // res is null, image not modified, do not save to disk
            // we don't return callbackInner() here: if we don't save image to DB, we can't fix DB persons with no associated image, for whatever reason
            // no, if no change on image, no change on db... (DEBUG IT)
            //res = resource; // TODO: we will save image just to fix db persons with no associated image... Try to save only if really needed...
            //if (forceImageSaveToDbEvenIfNotChanged) {
            //  // force image save to DB even if not changed
                //log.warn('force image save to DB even if not changed');
            //} else {
            return callbackInner(); // image not changed, do not save to DB
            //}
          }
          img.etag = res.etag; // ETag, to handle caching
          img.lastModified = res.lastModified; // lastModified, to handle alternative caching
          //img.isShowcase = res.isShowcase; // flag to indicate if this is the showcase image
          img.basename = res.basename; // image base name
          var imagePath = destination + '/' + img.basename;
          //log.debug('calculating signature of', imagePath);
          exports.signature(imagePath, function(err, signature) {
            if (err) {
              log.warn('can\'t calculate signature of image', image.basename, ':', err);
            } else {
              img.signature = signature;
            }
            //log.debug('SAVING...');
            img.save(function(err) { // , path // TODO...
              if (err) {
                log.warn('can\'t save image', image.url, ':', err);
              } else {
                if (img._isFirst) { // if this image is the first set person's showcase url
                  person.showcaseUrl = img.basename;
                }
                log.info('image ', img.basename, ' inserted');
              }
              return callbackInner();
            });
          });
        });
      });
    },
    function(err) { // 3rd param is the function to call when everything's done (inner callback)
      if (err) {
        log.warn('some error in the final images async callback:', err);
        callback(err, person);
      }
      // all tasks are successfully done
      callback(null, person);
    }
  );
};

// download an image from url to destination on filesystem
local.download = function(resource, destination, callback) {
  network.requestRetryAnonymous(
    resource,
    function(err) {
      callback(err);
    },
    function(contents, resource) {
      if (contents.length === 0) {
        // contents length is zero, possibly not modified, do not save to disk
        return callback(null, null);
      }
      var destinationDir = destination + '/' + resource.personKey;
      mkdirp(destinationDir, function(err, made) {
        if (err) {
          log.warn('can\'t make directory ', destinationDir);
          return callback(err);
        }
        // as filename extension use resource extension
        var ext = path.extname(resource.url); // TODO: normalize extension (.Jpg, .jpeg, .JPG => .jpg)
        // as filename use a hash of resource url + current timestamp
        var hash = crypto.createHash('md5').update(resource.url + Date.now()).digest('hex');
        var basename = hash + ext;
        destinationDir += '/' + basename;
        resource.basename = resource.personKey + '/' + basename;

        //console.log('download() saving to: ', destinationDir);
        fs.writeFile(
          destinationDir,
          contents,
          'binary',
          function(err) {
            if (err) {
              log.warn('can\'t write file to file system:', err);
              return callback(err);
            }
            //log.debug('resource.basename:', resource.basename);
            callback(null, resource); // success
          }
        );
      });
    }
  );
};

exports.findSimilar = function(signature, thresholdDistance, callback) {
  Image.find({}, '_id signature url', function(err, images) {
    if (err) {
log.warn('can\'t find images');
      return callback('can\'t find images');
    }
log.info('#images:', images.length);
    var minDistance = 1;
    var id = null;
    images.forEach(function(image, i) {
      log.info('i:', i);
      //log.info('image:', image.url);
      if (!image.signature) {
        return; // skip this image without signature
      }        
      var distance = local.distance(image.signature, signature);
      log.info('distance for hash', image.signature, 'is', distance);
      if (distance <= minDistance) {
        minDistance = distance;
        id = image._id.toString(); // TODO: toString ???
      }
    });
    if (minDistance <= thresholdDistance) {
      return callback(null, true, minDistance, id);
    } else {
      return callback(null, false, minDistance, null);
    }
  });
};

exports.signature = function(imageName, callback) {
return callback(null, '1111111111111111111111111111111111111111111111111111111111111111'); // simulate success
  //log.debug('image name:', imageName);
  Jimp.read(imageName, function(err, image) {
    if (err) {
      return callback(err, null);
    }
    var hash = image.hash(2);
    if (hash.length !== 64) {
      return callback('wrong hash length: ' + hash.length, null);
    }
    //log.info('hash:', hash);
    callback(null, hash); // success
  });
};

/*
local.hammingDistance = function(hash1, hash2) {
  return hammingDistance(hash1, hash2) / 80; // phash lenght is 20 bytes, each byte is 4 bits long
};
*/

local.distance = function (hash1, hash2) {
  var counter = 0;
  for (var k = 0; k < hash1.length; k++) {
    if (hash1[k] != hash2[k]) {
      counter++;
    }
  }
  return (counter / hash1.length);
};

module.exports = exports;

/*
/// DEBUG ONLY /////////////////////////////////////
var imageName = __dirname + '/../../' + 'img-SGI-ads1dl-1.jpg';
var thresholdDistance = 0.10;
exports.signature(imageName, function(err, signature) {
  log.debug(imageName, 'signature is', signature);
  exports.findSimilar(signature, thresholdDistance, function(err, found, distance, id) {
    if (err) {
      return log.warn('can\'t find similar images:', err);
    }
    if (found) {
      log.info('most similar image found (distance is', distance + ') has id', id);
    } else {
      log.info('no similar images found');
    }
  });
});
////////////////////////////////////////////////////
*/