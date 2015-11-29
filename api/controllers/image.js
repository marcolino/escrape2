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

// get all images for person
exports.getByIdPerson = function(idPerson, callback) {
  Image.find({ idPerson: idPerson }, function(err, images) {
    return callback(err, images);
  });
};

// syncronize all images for person
exports.syncPersonImages = function(person, callback) {
  if (!person) {
    return callback('no person to sync images for');
  }

  if (!person.imageUrls) {
//log.silly('Image.syncPersonImages() FINISHED for person', person.key);
    return callback('no image urls for person ' + person.key);
  }
  if (person.imageUrls.length <= 0) {
//log.silly('Image.syncPersonImages() FINISHED for person', person.key);
    return callback('zero image urls for person ' + person.key);
  }

  async.each(
    person.imageUrls, // 1st param is the array of items
    function(url, callbackInner) { // 2nd param is the function that each item is passed to
//log.silly('syncPersonImages - url:', url);

      var image = {};
      image.url = url;
      if (!image.url) {
        log.warn('can\'t sync image for person', person.key, ', ', 'image with no url, ', 'skipping');
        return callbackInner(); // skip this inner loop
      }
      /* TODO: handle real showcase...
      // set first image flag based on indexOf this url in person imageUrls
      image.isFirst = (person.imageUrls.indexOf(url) === 0);
      */

      // find this url in images collection
      //Image.findOne({ idPerson: person._id, url: image.url }, function(err, img) {
      Image.findOne({ personKey: person.key, url: image.url }, function(err, img) {
        if (err) {
          log.warn('can\'t find image ', image.url);
          return callbackInner();
        }
        if (img) { // existing image url
          img.isNew = false;
        } else { // new image url
          img = new Image();
          img.isNew = true;
          img.url = image.url;
          img.personKey = person.key;
        }
//log.silly('img is new?', img.isNew);
//log.silly('img.url', img.url);
        /*
        img._isFirst = image.isFirst; // TODO: debug this: is image coupled with img???
        */
//log.silly(person.key, ' ########### img.isNew before download:', img.isNew);
        var res = {
          img: img,
          url: img.url,
          type: 'image'
        };
        var destination = config.images.path;
/*
        resource = {
          // TODO: use img object in resource !
          // isNew => img.isNew
          // etag => img.etag
          // lastModified => img.lastModified
          img: img,
          personKey: person.key,
          url: image.url,
          type: 'image',
        };
*/
        local.download(res, destination, function(err, res) {
          if (err)  {
            log.warn('can\'t download image', res.img.url + ',', err.toString());
            return callbackInner();
          }
          if (!res) {
            return callbackInner(); // res is null, image not modified, do not save it to disk
          }
//log.debug('syncPersonImages 1 - res.img.basename:', res.img.basename);

//log.silly(res.personKey, 'res.isNew after download:', img.isNew);
if (res.img.isNew) {
  log.silly('image', res.url, 'for', img.personKey, 'downloaded because of being NEW');
} else {
  log.silly('image', res.url, 'for', img.personKey, 'downloaded because of being CHANGED etag');
}
          /*
          img.personKey = res.personKey;
          img.etag = res.etag; // ETag, to handle caching
          img.lastModified = res.lastModified; // lastModified, to handle alternative caching
          img.basename = res.basename; // image base name
          // NOT USED ANYMORE //var imagePath = destination + '/' + img.basename;
          */

          // calculate image signature from contents
          local.signatureFromResourceContents(res, function(err, res) {
            if (err) {
              log.warn('can\'t calculate signature of image', res.img.basename + ':', err, ', skipping');
              return callbackInner(); // !!!
            }
//log.debug('syncPersonImages 2 - res.img.basename:', res.img.basename);
            // got signature
            res.img.signature = res.signature;

            //log.debug('found signature for image:', res.img.signature);
            // check image signature is not duplicated in person
            exports.findSimilarSignature(res, { personKey: res.img.personKey }, config.images.thresholdDistanceSamePerson, function(err, found, distance, personKey, res) {
              if (err) {
                log.warn('can\'t check signature of image', res.img.basename + ':', err);
                //res.img.signature = ''; // don't return, do save image with fake signature
              } else {
//log.debug('syncPersonImages 3 - res.img.basename:', res.img.basename);
                //log.debug('found similar signature for image:', signature, '?', found);
                if (found) {
                  // TODO: log local url src of similar images
                  log.info('image', res.img.basename, 'downloaded, but seems already present in person', res.img.personKey + ': not added');
                  fs.unlink(config.images.path + '/' + res.img.basename, function(err) {
                    if (err) {
                      log.warn('image file', res.img.basename, 'cannot not be removed from disk:', err);
                    }
                    callbackInner();
                  });
                  return; // don't save image
                }
                //res.img.signature = res.signature; // signature is not duplicated in person
              }
              // do save image
  /*
  _id: OK
  url: OK
  personKey: 
  etag: 
  //lastModified: 
  basename: 
  dateOfFirstSync: OK
  signature:
  */
//log.debug('syncPersonImages 4 - res.img.basename:', res.img.basename);
              res.img.save(function(err) {
                if (err) {
                  log.warn('can\'t save image', res.img, ':', err);
                } else {
                  log.info('image', res.img.basename, 'added');
                }
                return callbackInner();
              });
            });
          });
        });
      });
    },
    function(err) { // 3rd param is the function to call when everything's done
      if (err) {
        log.warn('some error in the final images async callback:', err);
        return callback(err, person);
      }
      //log.silly('Image.syncPersonImages() FINISHED for person', person.key);
      // all tasks are successfully done
      callback(null, person);
    }
  );
};

// download an image from url to destination on filesystem
local.download = function(req, destination, callback) {
//log.error('req:', req);
  network.requestRetryAnonymous(
    req,
    function(err) {
//log.error(err);
      callback(err, req);
    },
    function(contents, res) {
      if (contents.length === 0) {
        // contents length is zero, possibly not modified, do not save to disk
        return callback(null, req);
      }
      // TODO: we should not need this this following test, If-None-Match should be honoured and 
      if (req.img.etag === res.etag) {
        // contents downloaded but etag does not change, If-None-Match not honoured?
        log.warn('image', req.url, 'downloaded (200) but etag does not change, If-None-Match not honoured, skipping');
        //log.warn('res status code:', res.statusCode);
        return callback(null, null);
      }
      var destinationDir = destination + '/' + req.img.personKey;
      mkdirp(destinationDir, function(err, made) {
        if (err) {
          log.warn('can\'t make directory ', destinationDir);
          return callback(err, req);
        }
        res.img = req.img;
        // as filename extension use res extension
        var ext = path.extname(res.url); // TODO: normalize extension (.Jpg, .jpeg, .JPG => .jpg)
        // as filename use a hash of res url + current timestamp
        var hash = crypto.createHash('md5').update(res.url + Date.now()).digest('hex');
        var basename = hash + ext;
        destinationDir += '/' + basename;
        res.contents = contents;
        res.img.basename = req.img.personKey + '/' + basename;
//log.debug('download - res.img.basename:', res.img.basename);
        res.img.etag = res.etag;

        //log.info('download() saving to: ', destinationDir);
        fs.writeFile(
          destinationDir,
          contents,
          'binary',
          function(err) {
            if (err) {
              log.warn('can\'t write file to file system:', err);
              return callback(err, req);
            }
            //log.debug('res.basename:', res.basename);
            callback(null, res); // success
          }
        );
      });
    }
  );
};

exports.findSimilarSignature = function(res, filter, thresholdDistance, callback) {
  Image.find(filter, '_id personKey signature url', function(err, images) {
    if (err) {
      return callback('can\'t find images');
    }
    var minDistance = 1; // maximum distance possible
    var personKey = null;
    images.forEach(function(image, i) {
      //log.info('image:', image.url);
      if (!image.signature) {
        return; // skip this image without signature
      }        
      var distance = exports.distance(image.signature, res.img.signature);
      if (distance <= minDistance) {
        minDistance = distance;
        personKey = image.personKey;
      }
      //log.info(i, images[i].personKey, 'distance is', distance);        
    });
    if (minDistance <= thresholdDistance) {
      return callback(null, true, minDistance, personKey, res);
    } else {
      return callback(null, false, minDistance, null, res);
    }
  });
};

local.signature = function(image, callback) {
  var signature = image.hash(2);
  if (signature.length !== 64) { // ( 11 = ceil(64 / log₂(64)) )
    return callback('wrong signature length: ' + signature.length, signature);
  }
  //log.info('signature:', signature);
  callback(null, signature); // success
};

exports.distance = function(signature1, signature2) {
  if (!signature1 || !signature2) {
    return 1; // maximum possible distance
  }
  var counter = 0;
  for (var k = 0; k < signature1.length; k++) {
    if (signature1[k] != signature2[k]) {
      counter++;
    }
  }
  return (counter / signature1.length);
};

local.signatureFromResourceContents = function(res, callback) {
  Jimp.read(new Buffer(res.contents, "ascii"), function(err, image) {
    if (err) {
      callback('can\'t read image contents:', err);
    }
    local.signature(image, function(err, signature) {
      if (err) {
        callback(err);
      } else {
        res.signature = signature;
        callback(null, res);
      }
    });
  });
};

module.exports = exports;
