var fs = require('fs') // file-system handling
  , mkdirp = require('mkdirp') // to make directories with parents
  , path = require('path') // path handling
  , async = require('async') // to call many async functions in a loop
  , network = require('./network') // network handling
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
  var personTag = person.providerKey + ' ' + person.key;
  var destination = config.imagesPath + '/' + person.providerKey + '/' + person.key;
  var resource;

  if (!person.imageUrls) {
    log.warn('empty image urls for person ', personTag);
    return callback(true);
  }
  if (person.imageUrls.length <= 0) {
    log.warn('no image urls for person ', personTag);
    return callback(true);
  }

  async.each(
    person.imageUrls, // 1st param is the array of items
    function(element, callbackInner) { // 2nd param is the function that each item is passed to
      var image = {};
      image.url = element;
      if (!image.url) {
        log.warn('can\'t sync image for person', personTag, ', ', 'image with no url, ', 'skipping');
        return callbackInner(); // skip this inner loop
      }

      // find this url in images collection
      Image.findOne({ url: image.url }, function(err, img) {
        if (err) {
          log.warn('can\'t find image ', image.url);
          return callbackInner();
        }
        if (!img) { // new image url
          img = new Image();
          img.url = image.url;
        }
        resource = {
          url: image.url,
          type: 'image',
          etag: img.etag,
          lastModified: img.lastModified
        };
        local.download(resource, destination, function(err, resource) {
          if (err)  {
            log.warn('can\'t download image ', image.url, ', ', 'download error:', err);
            return callbackInner();
          }
          if (!resource) { // resurce is null, image not modified, do not save to disk
            //log.debug('image did not change :-)');
            return callbackInner();
          }
          //log.info('image resource from download():', resource);
          img.etag = resource.etag; // ETag, to handle caching
          img.lastModified = resource.lastModified; // lastModified, to handle alternative caching
          img.save(function(err) { // , path // TODO...
            if (err) {
              log.warn('can\'t save image', image.url, ':', err);
            } else {
              log.info('image ', image.url, ' saved');
              //person.images.push(path); // TODO...
            }
            return callbackInner();
          });
        });
      });
    },
    function(err) { // 3rd param is the function to call when everything's done (inner callback)
      if (err) {
        log.warn(
          'some error in the final images async callback:', err,
          'one of the iterations produced an error: ', 'skipping this iteration'
        );
        return callbackInner();
      }
      // all tasks are successfully done
      callback(null);
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
      //console.error('NETWORK REQUEST SUCCESS: resource is long', contents.length);
      if (contents.length === 0) {
        // contents length is zero, possibly not modified, do not save to disk
        return callback(null, null);
      }
      var urlBasename = path.basename(resource.url);
      mkdirp(destination, function(err) {
        if (err) {
          log.warn('can\'t make directory ', destination)
          return callback(err);
        }
        destination += (destination.match('\/$') ? '' : '/') + urlBasename;
        fs.writeFile(
          destination,
          contents,
          'binary',
          function(err) {
            if (err) {
              log.warn('can\'t write file to file system:', err);
              return callback(err);
            }
            //log.debug('IMAGE ', resource.url, ', LONG ', contents.length.toString(), ' BYTES WRITTEN TO ', destination, ' :-)');
            callback(null, resource); // success
          }
        );
      });
    }
  );
};

module.exports = exports;
