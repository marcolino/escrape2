var fs = require('fs') // file-system handling
  , mkdirp = require('mkdirp') // to make directories with parents
  , path = require('path') // path handling
  , async = require('async') // to call many async functions in a loop
  , crypto = require('crypto') // to create hashes
  , Jimp = require('jimp') // image manipulation
  , network = require('../controllers/network') // network handling
  , Image = require('../models/image') // images handling
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

// syncronize all images for person
exports.syncPersonImages = function(person, callback) {
  if (!person) {
    return callback('no person to sync images for');
  }

  var destination = config.images.path;
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
        resource = {
          personKey: person.providerKey + '/' + person.key,
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
          if (!res) {
            return callbackInner(); // res is null, image not modified, do not save to disk
          }
          img.personKey = res.personKey;
          img.etag = res.etag; // ETag, to handle caching
          img.lastModified = res.lastModified; // lastModified, to handle alternative caching
          img.basename = res.basename; // image base name
          var imagePath = destination + '/' + img.basename;

          // calculate image signature from contents and save it
          local.signatureFromContents(res._contents, function(err, signature) {
            if (err) {
              log.warn('can\'t calculate signature of image', img.basename, ':', err);
            } else {
              img.signature = signature;
              //log.debug('got signature of', imagePath, ';', signature);
            }
            img.save(function(err) {
              if (err) {
                log.warn('can\'t save image', image.url, ':', err);
              } else {
                if (img._isFirst) { // if this image is the first set person's showcase url
                  person.showcaseUrl = img.basename;
                }
                log.info('image', img.basename, 'added');
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

exports.findSimilar = function(image, thresholdDistance, callback) {
  // try with image signature as-is
  local.findSimilarSimple(image, thresholdDistance, function(err, found, distance, personKey) {
    if (err) {
      return callback(err);
    }
    if (found) {
      return callback(err, found, distance, personKey);
    }
  
    // image not found; try with mirrored signature
    image.mirror(true, false, function(err, image) {
      if (err) {
        return callback(err);
      }
      local.findSimilarSimple(image, thresholdDistance, function(err, found, distance, personKey) {
        if (err) {
          return callback(err);
        }
        return callback(err, found, distance, personKey);
      });
    });
  });
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
        resource._contents = contents;

        //log.info('download() saving to: ', destinationDir);
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

local.signature = function(image, callback) {
  var signature = image.hash(2);
  if (signature.length !== 64) { // ( 11 = ceil(64 / log₂(64)) )
    return callback('wrong signature length: ' + signature.length, signature);
  }
  //log.info('signature:', signature);
  callback(null, signature); // success
};

local.findSimilarSimple = function(image, thresholdDistance, callback) {
  local.signature(image, function(err, signature) {
    if (err) {
      return callback(err);
    }
    local.findSimilarSignature(signature, thresholdDistance, function(err, found, distance, personKey) {
      if (err) {
        return callback(err);
      }
      return callback(err, found, distance, personKey);
    });
  });
};

local.findSimilarSignature = function(signature, thresholdDistance, callback) {
  Image.find({}, '_id personKey signature url', function(err, images) {
    if (err) {
      return callback('can\'t find images');
    }
    var minDistance = 1;
    var personKey = null;
    images.forEach(function(image, i) {
      //log.info('image:', image.url);
      if (!image.signature) {
        return; // skip this image without signature
      }        
      var distance = local.distance(image.signature, signature);
      if (distance <= minDistance) {
        minDistance = distance;
        personKey = image.personKey;
      }
      //log.info(i, images[i].personKey, 'distance is', distance);        
    });
    if (minDistance <= thresholdDistance) {
      return callback(null, true, minDistance, personKey);
    } else {
      return callback(null, false, minDistance, null);
    }
  });
};

local.distance = function(signature1, signature2) {
  var counter = 0;
  for (var k = 0; k < signature1.length; k++) {
    if (signature1[k] != signature2[k]) {
      counter++;
    }
  }
  return (counter / signature1.length);
};

local.signatureFromContents = function(contents, callback) {
  Jimp.read(new Buffer(contents, "ascii"), function(err, image) {
    if (err) {
      callback('can\'t read image contents:', err);
    }
    local.signature(image, function(err, signature) {
      if (err) {
        log.warn('can\'t calculate signature of image', img.basename, ':', err);
      } else {
        callback(null, signature);
      }
    });
  });
};

module.exports = exports;

/*
/// DEBUG ONLY /////////////////////////////////////
var db = require('../models/db'); // database wiring
var imageName = __dirname + '/../../.old/images.test/' + 'img2.jpg';
var thresholdDistance = 0.12;
Jimp.read(imageName, function(err, image) {
  if (err) {
    return log.error('Jimp can\'t read image', imageName, ':', err);
  }
  exports.findSimilar(image, thresholdDistance, function(err, found, distance, personKey) {
    if (err) {
      return log.warn('can\'t find similar images:', err);
    }
    if (found) {
      log.info('most similar image found (distance is', distance + ') has person key', personKey);
    } else {
      log.info('no similar images found');
    }
  });
});
////////////////////////////////////////////////////
*/

/*
/// DEBUG ONLY /////////////////////////////////////
var db = require('../models/db'); // database wiring
var thresholdDistance = 0.12;
log.info('start');
Image.find({}, '_id personKey signature basename', check);
function check(err, images) {
  if (err) {
    return log.error('can\'t find images');
  }
  log.debug('#images:', images.length);
  var minDistance = 1;
  var personKey = null;
  var found = false;
  for (var i = 0, len = images.length; i < len; i++) {
    for (var j = i + 1; j < len; j++) {
      var distance = local.distance(images[i].signature, images[j].signature);
      if (distance <= thresholdDistance) {
        found = true;
        log.info('similar images found (distance is', distance + ') :', images[i].personKey, '<=>', images[j].personKey);
      }
    }
  }
  if (!found) {
    log.info('no similar images found');
  }
  log.info('finish');
}
////////////////////////////////////////////////////
*/