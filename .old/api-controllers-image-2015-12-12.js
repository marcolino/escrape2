var fs = require('fs'); // file-system handling
var mkdirp = require('mkdirp') // to make directories with parents
  , path = require('path') // path handling
  , async = require('async') // to call many async functions in a loop
  , crypto = require('crypto') // to create hashes
  //, assert = require('assert') // to make assertions
  , jimp = require('jimp') // image manipulation
  , network = require('../controllers/network') // network handling

, request = require('request')

, requestretry = require('requestretry')
, randomUseragent = require('random-ua') // to use a random user-agent
, agent = require('socks5-http-client/lib/Agent')

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
      // get all images in db
      Image.find({}, function(err, images) {
        if (err) {
          return callback('can\'t find images');
        }
        // TODO: could we map here images to image.toObject()? If so, we could avoid grepObject and all that stuff...
        log.debug('all images array length:', images.length);

        async.eachSeries( // TODO: should we better serialize persons?
          persons,
          function(person, callbackPerson) {
            async.each/*Series*/( // TODO: should we better serialize images?
              person.imageUrls,
              function(imageUrl, callbackImage) {
                download(imageUrl, person, images, function(err, image) {
                  if (err) {
                    return callbackImage(err);
                  }
                  if (!image || !image.isChanged) { // 40x or 304
                    return callbackImage();
                  }
                  check(image, images, callbackImage);
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

      function grep(what, where) {
        return where.filter(function(item) {
          var match = true;
          Object.keys(what).map(function(property, index) {
            match = match && (item[property] === what[property]);
          });
          return match;
        });  
      }

      function grepObj(what, where) {
        return where.filter(function(item) {
          item = item.toObject();
          var match = true;
          Object.keys(what).map(function(property, index) {
            match = match && (item[property] === what[property]);
          });
          return match;
        });  
      }

      function download(imageUrl, person, images, callback) {
        //imageUrl.isShowcase; // TODO: handle imageUrl.isShowcase and imageUrl.dateOfLastSync...
        var grep = grepObj([
          { personKey: person.toObject().key },
          { url: imageUrl.href }
        ], images);
        // assert for at most one result (TODO: only while developing)
        if (grep.length > 1) { throw new Error('more than one image found for person key ' + person.toObject().key, ' and url ' + imageUrl); }
        var image = {};
        if (grep.length === 1) { // existing image url
          image.isNew = false;
          image.url = grep[0].url;
          image.etag = grep[0].etag;
          image.personKey = grep[0].personKey;
        } else { // new image url
          image.isNew = true;
          image.url = imageUrl.href;
          image.etag = null;
          image.personKey = person.key;
        }
        image.type = 'image';

        fetch(image, function(err, image) {
          if (err) {
            return callback(err, null);
          }
          return callback(null, image);
          // TODO: could just use `return callback(err, image);` ? Test it...
        });
      }

      function fetch(resource, callback) { // TODO: => to network.js ...
        request(
          {
            uri: resource.url,
            encoding: ((resource.type === 'text') ? null : (resource.type === 'image') ? 'binary' : null), 
          },
          function(err, response, contents) {
            if (err) {
              log.error('error fetching uri', resource.url);
              return callback(err, null);
            }
            response.isChanged = true;
            response.contents = contents;
            response.etag = response.headers.etag;
            response.personKey = response.request.personKey;
            response.isNew = response.request.isNew;
        
            log.info('fetched uri', response.url);
            return callback(null, response); // success
          }
        );
      }

      function fetchWITHRETRYANDALL(resource, callback) { // TODO: => to network.js ...
        var options = {
          url: resource.url, // url to download
          maxAttempts: config.networking.maxAttempts, // number of attempts to retry after the first one
          retryDelay: config.networking.retryDelay, // number of milliseconds to wait for before trying again
          retryStrategy: retryStrategyForbidden, // retry strategy: retry if forbidden status code returned
          timeout: config.networking.timeout, // number of milliseconds to wait for a server to send response headers before aborting the request
          encoding: ((resource.type === 'text') ? null : (resource.type === 'image') ? 'binary' : null), // encoding
          headers: {
            'User-Agent': randomUseragent.generate(), // user agent: pick a random one
            'If-None-Match': resource.etag ? resource.etag : null, // eTag field
          },
          agentClass: config.tor.available ? agent : null, // socks5-http-client/lib/Agent
          agentOptions: { // TOR socks host/port
            socksHost: config.tor.available ? config.tor.host : null, // TOR socks host
            socksPort: config.tor.available ? config.tor.port : null, // TOR socks port
          },
          personKey: resource.personKey, // person key
          isNew: resource.isNew,
        };

        requestretry(
          options,
          function(err, response, contents) {

            if (!err && (response.statusCode === 200 || response.statusCode === 304)) {
              var resource = {};
              resource.url = response.request.uri.href;
              resource.etag = response.request.headers['If-None-Match'];
              if (response.statusCode === 304) { // not changed
                resource.isChanged = false;

                if (resource.etag !== response.headers.etag) { // TODO: just to be safe, should not need this test on production
                  log.warn(
                    'resource', response.url, 'not downloaded, but etag does change, If-None-Match not honoured;',
                    'response status code:', response.statusCode, ';',
                    'eTags - resource:', resource.etag, ', response:', response.headers.etag, ';',
                    'contents length:', (contents ? contents.length : 'zero')
                  );
                  return callback(null, resource);
                }

              } else {

                if (resource.etag === response.headers.etag) { // TODO: just to be safe, should not need this test on production
                  log.warn(
                    'resource', response.url, 'downloaded, but etag does not change, If-None-Match not honoured;',
                    'response status code:', response.statusCode, ';',
                    'eTags - resource:', resource.etag, ', response:', response.headers.etag, ';',
                    'contents length:', (contents ? contents.length : 'zero')
                  );
                  return callback(null, resource);
                }
                resource.isChanged = true;
                resource.contents = contents;
                resource.etag = response.headers.etag;
                resource.personKey = response.request.personKey;
                resource.isNew = response.request.isNew;
              }
              callback(null, resource); // success
            } else {
              callback(err, null); // error
            }
          }
        );
      }

      function check(image, images, callback) {
        async.waterfall(
          [
            function(callback) { getSignatureFromImage(image, images, callback); },
            findSimilarSignatureImage,
            saveImage,
          ],
          function (err, image) {
            callback(err);
          }
        );
      }
    
      var getSignatureFromImage = function(image, images, callback) {
        jimp.read(new Buffer(image.contents, "binary"), function(err, img) {
          if (err) {
            return callback('can\'t read image contents:', err);
          }
          local.signature(img, function(err, signature) {
            if (err) {
              return callback(err);
            }
            image.signature = signature;
            callback(null, image, images);
          });
        });
      };
    
      var findSimilarSignatureImage = function(image, images, callback) {
        var minDistance = 1; // maximum distance possible
        var personKey = null;
        
        var personImages = grep([
          { personKey: image.personKey },
        ], images);

        personImages.forEach(function(img, i) {
          //log.info('image:', image.url);
          if (!image.signature) {
            log.warn('findSimilarSignatureImage - image with no signature:', img.url);
            return; // skip this image without signature
          }        
          image.personKey = img.personKey; // set personKey in image
          var distance = exports.distance(image.signature, img.signature);
          if (distance <= minDistance) {
            minDistance = distance;
          }
        });
        if (minDistance <= config.images.thresholdDistanceSamePerson) {
          //log.warn('found simimilar signature:', image.url);
          image.hasDuplicate = true;
          //log.info('findSimilarSignatureImage - IMAGE HAS DUPLICATE:', image.url);
        }
        //else log.info('findSimilarSignatureImage - IMAGE IS UNIQUE:', image.url, minDistance);
        return callback(null, image, images);
      };
    
      /**
       * save image to DB and FS, if it has not any duplicate
       */
      var saveImage = function(image, images, callback) {
return callback(null, null);
        var showcaseWidth = 320; // TODO: choose this in config(and pass to client...)

        if (image.hasDuplicate) {
          log.silly('image', image.url, 'DUPLICATED, NOT SAVED');
          return callback(null, null);
        }

        // save image to FS and DB
        var destinationDir = config.images.path + '/' + image.personKey;
        mkdirp(destinationDir, function(err, made) {
          if (err) {
            log.warn('can\'t make directory ', destinationDir);
            return callback(err, image);
          }
          // use a hash of response url + current timestamp as filename
          var hash = crypto.createHash('md5').update(image.url + Date.now()).digest('hex');
          // use response url extension as filename extension
          var ext = path.extname(image.url);
          ext = local.normalizeExtension(ext);
          var basename = hash + ext;
          image.basename = image.personKey + '/' + basename;
          // TODO: better handle different sizes...
          image.basename = image.personKey + '/' + showcaseWidth + 'x' + '-' + basename;
          //var destination = destinationDir + '/' + basename;
          var destinationFull = destinationDir + '/' + 'full-' + basename;
          var destinationShowcase = destinationDir + '/' + showcaseWidth + 'x' + '-' + basename;
    
/*
          // save image contents to filesystem
          fs.writeFile(
            destinationFull,
            image.contents,
            'binary',
            function(err) {
              if (err) {
                log.warn('can\'t write file to file system:', err);
                return callback(err, image);
              }
              log.info('image', image.url, 'saved to', destinationFull);
              callback(null, image); // success
            }
          );
*/

/**/
          // save image contents to FS
          // let use jimp to save full-sized and showcase-sized images
          var buf = new Buffer(image.contents, 'binary');
          jimp.read(buf, function(err, img) {
            if (err) {
              log.warn(err);
              return callback(err, image);
            }

            img
              // write full size image
              .write(destinationFull, function(err) {
                if (err) {
                  log.warn(err);
                  return callback(err, image);
                }
              })
              // write showcase-resized image
              .resize(Math.min(showcaseWidth, img.bitmap.width), jimp.AUTO) // to avoid enlarging small showcase images
              .quality(75)
              .write(destinationShowcase, function(err) {
                if (err) {
                  log.warn(err);
                  return callback(err, image);
                }
              })
            ;

          });
          buf = null; // delete Buffer object
/**/

          // save image to DB
          /*
          var imageObjects = images.filter(function(img) {
            return ((img.personKey === image.personKey) && (img.url === image.url));
          });
          if (imageObjects.length > 1) { // should not happen
            log.error('found more than one (', imageObjects.length, ') images for person', image.personKey, ', url:', image.url, ', skipping');
            return callback('>1', image); // TODO: ...
          }
          if (imageObjects.length < 1) { // should not happen
            log.error('found more than one (', imageObjects.length, ') images for person', image.personKey, ', url:', image.url, ', skipping');
            return callback('<1', image); // TODO: ...
          }
          var imageObject = imageObjects['0'];
          //image = imageObjects[0]; // TODO: why not a number?
          */

          var imageObj;
          if (image.isNew) {
            imageObj = new Image();
            for (var p in image) {
              imageObj[p] = image[p]; // clone image properties to imageObj
            }
          } else {
// TODO: use grep() !!!
            var imageFilter = images.filter(function(img) {
              return ((img._doc.personKey === image.personKey) && (img._doc.url === image.url));
            });
            imageObj = imageFilter[0];
          }

          imageObj.save(function(err) {
            if (err) {
              log.warn('can\'t save image', imageObj.basename, ':', err);
            } else {
              log.info('image', imageObj.basename, 'added');
            }
            callback(null, image); // success
          });

        });
      };

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
    
    exports.signature = function(contents, callback) {
      var signature = contents.hash(2);
      if (signature.length !== 64) { // ( 11 = ceil(64 / log₂(64)) )
        return callback('wrong signature length:', signature.length, signature);
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
    function popCountSLOW(n) {
      n >>>= 0; /* force uint32 */
      for (var popcnt = 0; n; n &= n - 1) {
        popcnt++;
      }
      return popcnt;
    }



  /**
   * request-retry strategies
   */

  /**
   * @param  {Null | Object} err
   * @param  {Object} response
   * @return {Boolean} true if the request should be retried
   */
  function retryStrategyForbidden(err, response) { // TODO: use a more generic name than '...Forbidden'...
    // TODO: debug only
    if (response &&
        response.statusCode !== 200 &&
        response.statusCode !== 304 &&
        //response.statusCode !== 400 &&
        response.statusCode !== 403 &&
        response.statusCode !== 404 &&
        response.statusCode !== 502 &&
        response.statusCode !== 503 &&
        response.statusCode !== 524
      ) {
      log.warn('retry strategy forbidden ignored response status code ', response.statusCode);
    }

    /*
     * retry the request if the response was a 403 one (forbidden),
     * or if response was 200 (success), but content contain a forbidden message
     */
    //console.log('response.body:', response.body.toString());
    var forbidden = (
      response && (
        //(response.statusCode === 400) || // 400 status code (bad request) (???)
        (response.statusCode === 403) || // 403 status code (forbidden)
        (response.statusCode === 404) || // 404 status code (not found)
        (response.statusCode === 502) || // 502 status code (bad gateway, tor proxy problem?)
        (response.statusCode === 503) || // 503 status code (service unavailable, tor proxy problem?)
        (response.statusCode === 524) || // 524 status code (cloudfare timeout)
          (
            (response.statusCode === 200) &&
            (response.body && (
              response.body.toString().match(
                /<title>404 - .*?<\/title>/ // TOE page not found
              ) ||
              response.body.toString().match(
                /<title>.*?A timeout occurred.*?<\/title>/ // SGI timeout signature
              ) ||
              response.body.toString().match(
                /<title>Attention Required!\s*\|\s*CloudFlare<\/title>/ // SGI CloudFlare warning
              ) ||
              response.body.toString().match(
                /<title>.*?\| 522: Connection timed out<\/title>/ // SGI connection timed out
              )
            )
          )
        )
      )
    );

    if (forbidden) {
      log.warn('request was forbidden for uri', response.request.uri.href, '(', (response ? response.statusCode : '?'), ')');
    } else {
      if (response && response.statusCode >= 400) {
        log.warn('retry strategy - unhandled condition for uri', response.request.uri.href, '(status code is:', response.statusCode + '), giving up');
      }
    }

    return forbidden;
  }



// syncronize all images for persons
exports.syncPersonsImagesLAST = function(persons, callback) {
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
  };

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

local.signatureOLD = function(image, callback) {
  var signature = image.hash(2);
  if (signature.length !== 64) { // ( 11 = ceil(64 / log₂(64)) )
    return callback('wrong signature length: ' + signature.length, signature);
  }
  //log.info('signature:', signature);
  callback(null, signature); // success
};

exports.distanceOLD = function(signature1, signature2) {
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
  jimp.read(new Buffer(img.contents, "ascii"), function(err, image) {
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
