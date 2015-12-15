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
  //log.error(persons);
  //return callback(null, persons);

  // get all images in db
  Image.find().lean().exec(function(err, images) { // lean gets plain objects
    if (err) {
      return callback('can\'t find images');
    }
    log.debug('all images array length:', images.length);
//log.debug(' @@@ IMAGES[0]:', images[0]);

    //log.error(images);
    //return callback(null, persons);

    async.eachSeries( // TODO: should we better serialize persons? (YES?)
      persons,
      function(person, callbackPerson) {
//log.info(' *** person:', person);
        async.each( // TODO: should we better serialize images? (NO)
          person.imageUrls,
          function(imageUrl, callbackImage) {
//log.info(' *** imageUrl:', imageUrl);
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

/*
  function grepObj(what, where) {
log.debug('grepObj - what:', what);
    return where.filter(function(item) {
      item = item.toObject();
log.debug('grepObj - item:', item);
      var match = true;
      Object.keys(what).map(function(property, index) {
log.debug('grepObj - index:', index);
log.debug('grepObj - property:', property);
log.debug('grepObj -', item[property], '=?=', what[property]);
        match = (match && (item[property] === what[property]));
      });
      return match;
    });  
  }
*/

  function download(imageUrl, person, images, callback) {
    var personImages = local.grep(
      { personKey: person.key, url: imageUrl.href }
      , images
    );
    // assert for at most one result (TODO: only while developing)
    if (personImages.length > 1) { throw new Error('more than one image found for person key ' + person.toObject().key, ' and url ' + imageUrl); }
    var image = {};
    if (personImages.length === 1) { // existing image url
      var personImage = personImages[0];
      image.isNew = false;
      image.url = personImage.url;
      image.isShowcase = personImage.isShowcase;
      image.dateOfFirstSync = personImage.dateOfFirstSync;
      image.etag = personImage.etag;
      image.personKey = personImage.personKey;
    } else { // new image url
      var now = new Date();
      image.isNew = true;
      image.url = imageUrl.href;
      image.isShowcase = imageUrl.isShowcase;
      image.dateOfFirstSync = now;
      image.etag = null;
      image.personKey = person.key;
    }
    image.type = 'image';

    fetch(image, function(err, image) {
/*
      if (err) {
        return callback(err, null);
      }
      return callback(null, image);
      // TODO: could just use `return callback(err, image);` ? Test it...
*/
      callback(err, image);
    });
  }

  function fetchREQUEST_REMOVEME(resource, callback) { // TODO: => to network.js ...
    request(
      {
        uri: resource.url,
        encoding: ((resource.type === 'text') ? null : (resource.type === 'image') ? 'binary' : null), 
      },
      function(err, response, contents) {
        if (err) {
          log.error('error fetching uri', resource.url, ':', err);
          return callback(err, null);
        }
        response.isChanged = true;
        response.contents = contents;
        response.etag = response.headers.etag;
        response.personKey = response.request.personKey;
        response.isNew = response.request.isNew;
        response.dateOfFirstSync = response.request.dateOfFirstSync;
    
        log.info('fetched uri', response.request.uri.href);
        return callback(null, response); // success
      }
    );
  }

  function fetch(resource, callback) { // TODO: => to network.js ...
    var options = {
      url: resource.url, // url to download
      maxAttempts: config.networking.maxAttempts, // number of attempts to retry after the first one
      retryDelay: config.networking.retryDelay, // number of milliseconds to wait for before trying again
      retryStrategy: retryStrategyForbidden, // retry strategy: retry if forbidden status code returned
      timeout: config.networking.timeout, // number of milliseconds to wait for a server to send response headers before aborting the request
      encoding: ((resource.type === 'text') ? null : (resource.type === 'image') ? 'binary' : null), // encoding
      headers: {
        'User-Agent': randomUseragent.generate(), // user agent: pick a random one
      },
      agentClass: config.tor.available ? agent : null, // socks5-http-client/lib/Agent
      agentOptions: { // TOR socks host/port
        socksHost: config.tor.available ? config.tor.host : null, // TOR socks host
        socksPort: config.tor.available ? config.tor.port : null, // TOR socks port
      },
      personKey: resource.personKey, // person key
      isNew: resource.isNew, // is new flag
      isShowcase: resource.isShowcase, // is showcase flag
    };
    if (resource.etag) { // must check etag is not null, can't set a null If-None-Match header
      options.headers['If-None-Match'] = resource.etag; // eTag field
    }

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
            //log.info('fetched uri', response.request.uri.href);
            resource.isChanged = true;
            resource.contents = contents;
            resource.etag = response.headers.etag;
            resource.personKey = response.request.personKey;
            resource.isNew = response.request.isNew;
            resource.isShowcase = response.request.isShowcase;
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
        //saveImage,
        ///createImagePaths,
        createImageVersions,
        //saveImageToFs,
        saveImageToDb,
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
      exports.signature(img, function(err, signature) {
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
    var imageMostSimilar;
    var personImages = local.grep(
      { personKey: image.personKey },
      images
    );

    //log.silly('### personImages:', personImages.length);
    image.hasDuplicate = false;
    personImages.forEach(function(img, i) {

      // check image url, beforehand
      if (image.url === img.url) {
        image.hasDuplicate = true;
        //log.debug('findSimilarSignatureImage - IMAGE HAS DUPLICATE (SAME URL):', image.url, imageMostSimilar.url);
        return false; // same url, break loop here
      }

      if (!image.signature) {
        //log.warn('findSimilarSignatureImage - image with no signature:', img.url);
        return; // skip this image without signature
      }        
      ///image.personKey = img.personKey; // set personKey in image (TODO: WHY??? it should be set already...)
      var distance = exports.distance(image.signature, img.signature);
      if (distance <= minDistance) {
        minDistance = distance;
        imageMostSimilar = img;
      }
    });
    if (minDistance <= config.images.thresholdDistanceSamePerson) {
      //log.warn('found simimilar signature:', image.url);
      image.hasDuplicate = true;
      //log.debug('findSimilarSignatureImage - IMAGE HAS DUPLICATE:', image.url, imageMostSimilar.url);
    }
//else log.info('findSimilarSignatureImage - IMAGE IS UNIQUE:', image.url, ', distance:', minDistance);

    callback(null, image.hasDuplicate ? null : image, images);
  };

  /**
   * create image versions
   */
  var createImageVersions = function(image, images, callback) {
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

/*
   TODO: using true as first parameter to preceding callback, we shuldn't even get here if 
   image has duplicate. THIS DOES NOT SEEM TO WORK, BUT FREEZES WATERFALL!
 */
    if (!image) {
      log.silly('createImageVersions: image is void (has duplicate): SKIPPING');
      return callback(null, null, null);
    }
//////////////////////////////////////////////////////////////////////////////////////

    // use a hash of response url + current timestamp as filename to make it uniq
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
        return callbackVersion(err);
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
          // TODO: CHECK THIS!!! (remove on production)
          //log.silly('createImageVersions() - LAST callback - images.length:', images.length, ', err:', err);
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
      log.silly('saveImageToDb: image is void (has duplicate): SKIPPING');
      return callback(null, null);
    }
    Image.findOneAndUpdate(
      { basename: image.basename, personKey: image.personKey}, // query
      image, // object to save
      { upsert: true }, // options
      function(err, doc) { // result callback
        if (err) {
          log.warn('can\'t save image', imageObj.basename, ':', err);
        } else {
          log.info('image', image.personKey + '/' + image.basename, 'added');
        }
        callback(err, image); // finish
      }
    );
  };

  /**
   * save image to DB and FS, if it has not any duplicate
   */
  var saveImageMOLOLITHIC = function(image, images, callback) {
//return callback(null, null);
    var showcaseWidth = 320; // TODO: choose this in config(and pass to client...)

    if (image.hasDuplicate) {
      log.silly('saveImageMOLOLITHIC: image is void (has duplicate): SKIPPING');
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

/**/
      // save image contents to FS
      // let use jimp to save full-sized and showcase-sized images
//log.debug('buffering');
      var buf = new Buffer(image.contents, 'binary');
//log.debug('reading');
      jimp.read(buf, function(err, img) { // THIS IS FAST
        if (err) {
          log.warn(err);
          return callback(err, image);
        }
log.debug('read', image.url);

/*
        img
          // write full size image
          .write(destinationFull, function(err) {
            if (err) {
              log.warn(err);
              return callback(err, image);
            }
log.debug('written', destinationFull);
          })
*/
/*
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
*/
      });
      buf = null; // delete Buffer object

      // save image to DB
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
  // if image is not showcase, and no showcase found in this person images,
  // elect first image as showcase
  if (!isShowcase) {
    if (!anyShowcaseFound) {
      isShowcase = true; // TODO: only the first one !!!!!!!!!!!!!1
    }
  }

  //log.debug('isShowcase() - image.basename', image.basename, 'is showcase ?', isShowcase);
/*
        if (!P.showcaseBasename) { // no image marked as showcase found: elect the first one
          if (images.length > 0) {
            I = images[0];
            P.showcaseBasename = I.basename;
            console.log('person', P.key, 'has image', I.basename, 'as ELECTED showcase');
          }
        }
*/
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

module.exports = exports;
