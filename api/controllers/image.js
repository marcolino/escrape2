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

// syncronize all images for persons
exports.syncPersonsImages = function(persons, callback) {
  if (!persons) {
    return callback('no persons to sync images for');
  }

  // get all images present beforehand
  Image.find({}, function(err, images) {
    if (err) {
      return callback('can\'t find images');
    }
    log.debug('all images array length:', images.length);
    syncImages(persons, images, callback);
  });

  var syncImages = function(persons, images, callback) {
    async.each(
      persons,
      function(person, callbackPerson) {
        async.each(
          person.imageUrls,
          function(imageUrl, callbackImage) {
            download(imageUrl, function(err, image) {
              if (err) return err;
              downloadPost(callbackImage);
            });
          },
          function(err) {
            if (err) return err;
            callbackPerson();
          }
        );
      },
      function(err) {
        if (err) return err;
        callback(persons);
      }
    );
  });

  function downloadPost(image, callback) {
    async.waterfall(
      [
        getSignatureFromImage,
        findSimilarSignatureImage,
        saveImage,
      ],
      function (err, image) {
        callback(image);
      }
    );
  }

  function getSignatureFromImage(image, getSignatureFromImageCallback) {
    // ...
    getSignatureFromImageCallback(null);
  }

  function findSimilarSignatureImage(image, findSimilarSignatureImageCallback) {
    // ...
    findSimilarSignatureImageCallback(null);
  }

  function save(image, saveCallback) {
    // ...
    saveCallback(null);
  }

};

// syncronize all images for persons
exports.syncImagesSTANDBY = function(persons, callback) {
  if (!persons) {
    return callback('no persons to sync images for');
  }
  // get all images present beforehand
  var images = [];
  Image.find({}, function(err, imgs) {
    if (err) {
      return callback('can\'t find images');
    }
    images = imgs;
log.debug('all images array length:', images.length);
//var n = persons.length;

/*
    // loop through all persons
    async.each(
      persons, // 1st param in async.each() is the array of items
      function(person, callbackInner) { // 2nd param is the function that each item is passed to
//log.info('N:', n);
*/

    // loop through all persons
    for (var p = 0, len = persons.length; p < len; p++) {
log.warn('PERSON #', p);
      var person = persons[p];

      /*
      // TODO: TO BE TESTED!!!
      if (!person.isChanged) {
        return callbackInner();
      }
      */
  
      // sync this person images
      if (!person.imageUrls) {
        log.warn('no image urls for person ' + person.key);
        //n--; // TODO: remove this on production
        continue; //return callbackInner();
      }
      if (person.imageUrls.length <= 0) {
        log.warn('zero image urls for person ' + person.key);
        //n--; // TODO: remove this on production
        continue; //return callbackInner();
      }

      // TODO: wait for all downloads finished, use async.each() here... :-)
      for (var u = 0; u < person.imageUrls.length; u++) {
        var url = person.imageUrls[u];
        // find this person and this url image in images array
        var image = images.filter(filterimageByPersonAndUrl);
/*
        var image = images.filter(function(img) {
          return ((img.personKey === person.key) && (img.url === url));
        });
*/
/*
  function filterimageByPersonAndUrl(img) {
    return ((img.personKey === person.key) && (img.url === url));
  }
*/

        if (image.length > 1) {
          log.warn('found more than one (', image.length, ') images for person', person.key, ', url:', url, ', skipping');
          continue;
        }
        if (image.length === 1) { // image for this person and this url was found: it is old
          log.debug('found image for person', person.key, ', url:', url, '(it is old)');
          image = image['0'].toObject(); // flatten single item array to pure object
          image.isNew = false;
        } else { // image for this person and this url was not found: it is new
          log.debug('found no image for person', person.key, ', url:', url, '(it is new)');
          image = new Image();
          image.isNew = true;
          image.url = url;
          image.personKey = person.key;
        }
        image.type = 'image';
        image.destination = config.images.path;
        //log.info('downloading image:', image, '...');

        // TODO: remove this test on production
        if (url !== image.url) {
          log.error('BIG FAT ERROR HERE!');
        }

        if ((!person.isChanged) && (image.isNew)) {
          log.info('BIG FAT INFO HERE: PERSON WAS NOT CHANGED, AND AT LEAST ONE IMAGE IS NEW!');
        }

        // download image
        local.download(image, downloadDone);

      } // this person urls images loop finished

      callback(null, persons); // success

    } // this person loop finished
  function filterimageByPersonAndUrl(img) {
    return ((img.personKey === person.key) && (img.url === url));
  }

/*
      function(err) { // 3th param is the function to call when everything's done (inner callback)
        if (err) {
          return callback('some error in the final async callback:' + err.toString());
        }
        callback(null, persons); // success
      }
*/
/*
    );
*/
  });

  function downloadDone(err, img) {
    if (err)  {
      log.warn('can\'t download image', image.url + ',', err.toString());
      //n--; // TODO: remove this on production
      return; // callbackInner();
    }
    if (!img.isChanged) {
      log.info('image', img.url, 'for', img.personKey, 'was NOT downloaded because SAME ETAG');
      //n--; // TODO: remove this on production
      return; // callbackInner(); // res is null, image not modified, do not save it to disk
    }
  
    // TODO: we do not need this this following test, can remove on production
    if (img.isNew) {
      log.debug('image', img.url, 'for', img.personKey, 'was downloaded (NEW)');
    } else {
      log.warn('image', img.url, 'for', img.personKey, 'was downloaded (!NEW... ???)');
    }
  
    // calculate image signature from contents
    local.signatureFromResourceContents(img, signatureFromResourceContentsDone);
  }

  function signatureFromResourceContentsDone(err, img) {
    if (err) {
      log.warn('can\'t calculate signature of image', img.basename + ':', err, ', skipping');
      return callbackInner();
    }
  
    // check image signature is not duplicated in person
    exports.findSimilarSignature(
      img,
      { personKey: img.personKey },
      config.images.thresholdDistanceSamePerson,
      findSimilarSignatureDone
    );
  }

  function findSimilarSignatureDone(err, found, distance, personKey, img) {
    if (err) {
      log.warn('can\'t check signature of image', img.basename + ':', err);
    } else {
      if (found) {
        log.info('image', img.basename, 'downloaded, but seems already present in person', img.personKey + ': not added');
        fs.unlink(config.images.path + '/' + img.basename, function(err) {
          if (err) {
            log.warn('image file', img.basename, 'cannot not be removed from disk:', err);
          }
          //callbackInner();
        });
        return; // don't save image
      }
    }

    // save image
    img.save(function(err) {
      if (err) {
        log.warn('can\'t save image', img, ':', err);
      } else {
        log.info('image', img.basename, 'added');
      }
      //return callbackInner();
    }); // save image finished

  }
};

// syncronize all images for person
exports.OLDsyncPersonImages = function(person, callback) {
  if (!person) {
    return callback('no person to sync images for');
  }

  if (!person.imageUrls) {
    return callback('no image urls for person ' + person.key);
  }
  if (person.imageUrls.length <= 0) {
    return callback('zero image urls for person ' + person.key);
  }

// TODO: get all images beforehand to DEBUG ////////////////
  var images = [];
  Image.find({}, function(err, imgs) {
    if (err) {
      return callback('can\'t find images');
    }
    images = imgs;
log.warn('all images array length:', images.length);
  });
////////////////////////////////////////////////////////////

  async.each( // TODO: use a parallel async method... !!!
    person.imageUrls, // 1st param is the array of items
    function(url, callbackInner) { // 2nd param is the function that each item is passed to
      //log.silly('syncPersonImages - url:', url);
/*
      var image = {};
      image.url = url;
      if (!image.url) {
        log.warn('can\'t sync image for person', person.key, ', ', 'image with no url, ', 'skipping');
        return callbackInner(); // skip this inner loop
      }
*/
      if (!url) { // should not happen
        log.warn('can\'t sync image for person', person.key, ', ', 'image with no url, ', 'skipping');
        return callbackInner(); // skip this inner loop
      }

// TODO: try using images array instead of colelction //////
      // find this person and this url image in images array
      var image = images.filter(function(img) {
        return ((img.personKey === person.key) && (img.url === url));
      });
      if (!image) {
        // no image for this person and this url in images array
        return callbackInner(); // skip this inner loop
      }
log.error('image:', image['0']);
///return callbackInner(); // skip this inner loop
////////////////////////////////////////////////////////////

      if (image) { // existing image url
        image.isNew = false;
      } else { // new image url
        image = new Image();
        image.isNew = true;
        image.url = url;
        image.personKey = person.key;
      }
      image.type = 'image';
      image.destination = config.images.path;
      local.download(image, function(err, img) {
        if (err)  {
          log.warn('can\'t download image', image.url + ',', err.toString());
          return callbackInner();
        }
        if (!img.isChanged) {
          //log.info('image', img.url, 'for', img.personKey, 'was NOT downloaded because NOT MOD');
          return callbackInner(); // res is null, image not modified, do not save it to disk
        }

        // TODO: we do not need this this following test, can remove on production
        if (img.isNew) {
          log.debug('image', img.url, 'for', img.personKey, 'was downloaded (NEW)');
        } else {
          log.warn('image', img.url, 'for', img.personKey, 'was downloaded (!NEW... ???)');
        }

        // calculate image signature from contents
        local.signatureFromResourceContents(img, function(err, img) {
          if (err) {
            log.warn('can\'t calculate signature of image', img.basename + ':', err, ', skipping');
            return callbackInner();
          }

          //log.info('found signature for image:', img.signature);
          // check image signature is not duplicated in person
          exports.findSimilarSignature(img, { personKey: img.personKey }, config.images.thresholdDistanceSamePerson, function(err, found, distance, personKey, img) {
            if (err) {
              log.warn('can\'t check signature of image', img.basename + ':', err);
              //img.signature = ''; // don't return, do save image with fake signature
            } else {
              //log.debug('found similar signature for image:', signature, '?', found);
              if (found) {
                log.info('image', img.basename, 'downloaded, but seems already present in person', img.personKey + ': not added');
                fs.unlink(config.images.path + '/' + img.basename, function(err) {
                  if (err) {
                    log.warn('image file', img.basename, 'cannot not be removed from disk:', err);
                  }
                  callbackInner();
                });
                return; // don't save image
              }
              //res.img.signature = res.signature; // signature is not duplicated in person
            }
            // do save image
            img.save(function(err) {
              if (err) {
                log.warn('can\'t save image', img, ':', err);
              } else {
                log.info('image', img.basename, 'added');
              }
              return callbackInner();
            });
          });
        });
      });
/*
      // find this url in images collection
      Image.findOne({ personKey: person.key, url: image.url }, function(err, img) {
        if (err) {
          log.warn('can\'t find image ', image.url);
          return callbackInner();
        }

        if (img.url !== image.url) {
          log.error('DISCREPANCY FOUND!!!');
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
        img.type = 'image';
        img.destination = config.images.path;
        local.download(img, function(err, img) {
          if (err)  {
            log.warn('can\'t download image', img.url + ',', err.toString());
            return callbackInner();
          }
          if (!img.isChanged) {
            //log.info('image', img.url, 'for', img.personKey, 'was NOT downloaded because NOT MOD');
            return callbackInner(); // res is null, image not modified, do not save it to disk
          }

          // TODO: we do not need this this following test, can remove on production
          if (img.isNew) {
            log.debug('image', img.url, 'for', img.personKey, 'was downloaded (NEW)');
          } else {
            log.warn('image', img.url, 'for', img.personKey, 'was downloaded (!NEW... ???)');
          }

          // calculate image signature from contents
          local.signatureFromResourceContents(img, function(err, img) {
            if (err) {
              log.warn('can\'t calculate signature of image', img.basename + ':', err, ', skipping');
              return callbackInner();
            }

            //log.info('found signature for image:', img.signature);
            // check image signature is not duplicated in person
            exports.findSimilarSignature(img, { personKey: img.personKey }, config.images.thresholdDistanceSamePerson, function(err, found, distance, personKey, img) {
              if (err) {
                log.warn('can\'t check signature of image', img.basename + ':', err);
                //img.signature = ''; // don't return, do save image with fake signature
              } else {
                //log.debug('found similar signature for image:', signature, '?', found);
                if (found) {
                  log.info('image', img.basename, 'downloaded, but seems already present in person', img.personKey + ': not added');
                  fs.unlink(config.images.path + '/' + img.basename, function(err) {
                    if (err) {
                      log.warn('image file', img.basename, 'cannot not be removed from disk:', err);
                    }
                    callbackInner();
                  });
                  return; // don't save image
                }
                //res.img.signature = res.signature; // signature is not duplicated in person
              }
              // do save image
              img.save(function(err) {
                if (err) {
                  log.warn('can\'t save image', img, ':', err);
                } else {
                  log.info('image', img.basename, 'added');
                }
                return callbackInner();
              });
            });
          });
        });
      });
*/
    },
    function(err) { // 3rd param is the function to call when everything's done
      if (err) {
        log.warn('some error in the final images async callback:', err);
        return callback(err, person);
      }
      // all tasks are successfully done
      callback(null, person);
    }
  );
};

// download an image from url to destination on filesystem
local.download = function(img, callback) {
  //network.requestRetryAnonymous(
  network.requestSmart(
    img,
    function(err) {
      callback(err, img);
    },
    function(contents, res) {
      if (res.statusCode === 304) { // not changed
        img.isChanged = false;
        // status code is 304, not modified, do not save to disk
        //log.silly('DOWNLOAD - status code is', res.statusCode, ', contents length is', contents.length);
        return callback(null, img);
      }
      // TODO: we should not need this this following test, can remove on production
      if (img.etag === res.etagNew) {
        // contents downloaded but etag does not change, If-None-Match not honoured?
        log.warn(
          'image', img.url, '(person:', img.personKey, ') downloaded, but etag does not change, If-None-Match not honoured;',
          'res status code:', res.statusCode, ';',
          'eTags - img:', img.etag, ', res:', res.etag, ';',
          'contents length:', (contents ? contents.length : 'zero')
        );
        return callback(null, img);
      }
      img.etag = res.etagNew;
      img.isChanged = true;
      var destinationDir = img.destination + '/' + img.personKey;
      mkdirp(destinationDir, function(err, made) {
        if (err) {
          log.warn('can\'t make directory ', destinationDir);
          return callback(err, img);
        }
        /*
        res.img = req.img;
        */
        // use a hash of response url + current timestamp as filename
        var hash = crypto.createHash('md5').update(res.url + Date.now()).digest('hex');
        // use response url extension as filename extension
        var ext = path.extname(img.url);
        ext = local.normalizeExtension(ext);
        var basename = hash + ext;
        destinationDir += '/' + basename;
        img.contents = contents;
        img.basename = img.personKey + '/' + basename;

        // save image contents to filesystem
        //log.info('download() saving to: ', destinationDir);
        fs.writeFile(
          destinationDir,
          contents,
          'binary',
          function(err) {
            if (err) {
              log.warn('can\'t write file to file system:', err);
              return callback(err, img);
            }
            //log.debug('res.basename:', res.basename);
            callback(null, img); // success
          }
        );
      });
    }
  );
};

exports.findSimilarSignature = function(img, filter, thresholdDistance, callback) {
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
      var distance = exports.distance(image.signature, img.signature);
      if (distance <= minDistance) {
        minDistance = distance;
        personKey = image.personKey;
      }
      //log.info(i, images[i].personKey, 'distance is', distance);        
    });
    if (minDistance <= thresholdDistance) {
      return callback(null, true, minDistance, personKey, img);
    } else {
      return callback(null, false, minDistance, null, img);
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

local.signatureFromResourceContents = function(img, callback) {
  Jimp.read(new Buffer(img.contents, "ascii"), function(err, image) {
    if (err) {
      callback('can\'t read image contents:', err);
    }
    local.signature(image, function(err, signature) {
      if (err) {
        callback(err);
      } else {
        img.signature = signature;
        callback(null, img);
      }
    });
  });
};

// normalize extension (i.e.: .Jpg, .jpeg, .JPG => .jpg, .GIF => .gif, .PNG => .png)
local.normalizeExtension = function(ext) {
  var retval = ext;
  retval = retval.replace(/^\.jpe?g$/i, '.jpg');
  retval = retval.replace(/^\.gif$/i, '.gif');
  retval = retval.replace(/^\.png$/i, '.png');
  return retval;
};

module.exports = exports;
