var fs = require('fs') // file-system handling
  , mkdirp = require('mkdirp') // to make directories with parents
  , path = require('path') // path handling
  , async = require('async') // to call many async functions in a loop
  , crypto = require('crypto') // to create hashes
  , pHash = require('phash-image') // perceptual hash
  , hammingDistance = require('hamming-distance') // calculate hamming distance
  , _ = require('lodash') // lo-dash utilities
  , network = require('../controllers/network') // network handling
  , Image = require('../models/image') // images handling
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

/// DEBUG ONLY ///////////////////////////////////
var db = require('../models/db'); // database wiring
//////////////////////////////////////////////////

// syncronize all images for person
exports.syncPersonImages = function(person, callback) {
  if (!person) {
    return callback('no person to sync images for');
  }
  //var destination = config.images.path + '/' + person.providerKey + '/' + person.key;
  var destination = config.images.path;
  var resource;

  if (!person._imageUrls) {
    log.warn('empty image urls for person ', person.keyFull);
    return callback(true);
  }
  if (person._imageUrls.length <= 0) {
    log.warn('no image urls for person ', person.keyFull);
    return callback(true);
  }

  async.each(
    person._imageUrls, // 1st param is the array of items
    function(element, callbackInner) { // 2nd param is the function that each item is passed to
      var image = {};
      image.url = element;
      if (!image.url) {
        log.warn('can\'t sync image for person', person.keyFull, ', ', 'image with no url, ', 'skipping');
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
        img.isFirst = image.isFirst; // TODO: debug this: is image coupled with img???
//log.debug('person.keyFull:', person.providerKey + '/' + person.key);
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
            // no, if no chane on image, no change on db... (DEBUG IT)
            //res = resource; // TODO: we will save image just to fix db persons with no associated image... Try to save only if really needed...
            return callbackInner();
          }
          img.etag = res.etag; // ETag, to handle caching
          img.lastModified = res.lastModified; // lastModified, to handle alternative caching
          //img.isShowcase = res.isShowcase; // flag to indicate if this is the showcase image
          img.basename = res.basename; // image base name
          var imagePath = destination + '/' + img.basename;
log.debug('calculating perceptual hash of', imagePath);
          exports.perceptualHash(imagePath, function(perceptualHash) {
            img.perceptualHash = perceptualHash;
log.debug('SAVING...');
            img.save(function(err) { // , path // TODO...
              if (err) {
                log.warn('can\'t save image', image.url, ':', err);
              } else {
                if (img.isFirst) { // if this image is the first set person's showcase url
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
//log.debug('destinationDir:', destinationDir);
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
            resource.basename = resource.personKey + '/' + basename;
//log.debug('resource.basename:', resource.basename);
/*
            resource.isShowcase = (made !== null); // an image will be a showcase
                                                   // if it is the first one,
                                                   // i.e.: a new directory was crated
*/
            callback(null, resource); // success
          }
        );
      });
    }
  );
};

/*
exports.buildPerceptualHashes = function(callback) {
log.debug('buildPerceptualHashes()');
  Image.find({ _id: '563cdc17087c58a40ef833c1' }, function(err, images) {
    if (err) {
      return callback('can\'t find images');
    }
log.info('#images:', images.length);
    for (var i = 0, len = images.length; i < len; i++) {
log.debug('for');
      var image = images[i];
log.debug('image:', image);
      var imageName = __dirname + '/../..' + '/data' + '/images' + '/' + image.providerKey + '/' + image.key + '/' + image.basename;
log.debug('image name:', imageName);
      exports.perceptualHash(imageName, function(hash) {
log.debug('pHash is ', hash);
        image.save(function(err) { // , path // TODO...
          if (err) {
            callback('can\'t save image', image.url, ':', err);
          } else {
log.debug('pHash saved for image', image.basename, '(person ', person.providerKey, ' ', person.key, ')');
            callback(null); // success
          }
        }); 
      });
    }
  });
};
*/

exports.findNearest = function(perceptualHash, thresholdDistance, callback) {
log.info('findNearest():', perceptualHash);
  Image.find({}, 'idPerson perceptualHash url', function(err, images) {
log.info('findNearest():', 'find');
    if (err) {
log.warn('can\'t find images');
      return callback('can\'t find images');
    }
log.info('#images:', images.length);
    var minDistance = 1;
    var id = null;
    for (var i = 0, len = images.length; i < images; i++) {
      var image = images[i];
      log.info('image:', image.url);
      var distance = local.hammingDistance(image.perceptualHash, perceptualHash);
      log.info('Hamming distance is ', hamming);
      if (distance <= minDistance) {
        minDistance = distance;
        id = image._id;
      }
    }
    if (minDistance <= thresholdDistance) {
      return callback(null, true, id);
    } else {
      return callback(null, false, null);
    }
  });
};

exports.perceptualHash = function(imageName, callback) {
  pHash(imageName, true).then(function(hash) {
console.debug('image ' + imageName + ' hash:', hash, ', length is', hash.length);
    hash = _.padRight(hash, 20, '0');
    callback(hash);
  });
};

local.hammingDistance = function(hash1, hash2) {
  return hammingDistance(hash1, hash2) / 80; // phash lenght is 20 bytes, each byte is 4 bits long
};

module.exports = exports;



/*
exports.perceptualHash('api/PHASH-TEST/jlo-1.jpg', function(hash) {
  log.info(hash);
  exports.findNearest(hash, 0.28, function(err, result, imageId) {
    if (!err) {
      if (result) {      
        log.info('image jlo-1.jpg is similar to image by id:', imageId);
      } else {
        log.info('image jlo-1.jpg has no similar images in db');  
      }
    }
  });
});
*/
