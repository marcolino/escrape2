var fs = require('fs') // file-system handling
  , mkdirp = require('mkdirp') // to make directories with parents
  , path = require('path') // path handling
  , async = require("async") // to call many async functions in a loop
  , network = require('./network') // network handling
  , Image = require('../models/image') // images handling
  , config = require('../config'); // global configuration

/*
var dhash = require('dhash-image');
exports.dhash = function(fileimage) {
  dhash(fileimage, function(err, hash) {
    if (err) {
      return console.error('error:', err);
    }
    console.log('hash for image', fileimage + ':', hash);
  });
};
exports.dhash('./a1.jpg');
exports.dhash('./a2.jpg');
exports.dhash('./b1.jpg');
*/

// syncronize all images for person
exports.syncPersonImages = function(person, callback) {
  var personTag = person.providerKey + '/' + person.key;
  var destination = config.imagesPath + '/' + person.providerKey + '/' + person.key;
  var resource;

  if (!(person && person.imageUrls && person.imageUrls.length > 0)) {
    callback('no image for person' + ' ' + personTag);
  }

  async.each(
    person.imageUrls, // 1st param is the array of items
    function(element, callbackInner) { // 2nd param is the function that each item is passed to
      var image = {};
      image.url = element;
      if (!image.url) {
        console.warn('Error syncing image for person', personTag + ',', 'image with no url', '-', 'skipping');
        return callbackInner(); // skip this inner loop
      }

      // find this url in images collection
      Image.findOne({ url: image.url }, function (err, img) {
        if (err) {
          return console.error('Error finding image', umage.url, 'in database');
        }
        if (!img) { // new image url
          img = new Image();
          img.url = image.url;
        }
        resource = {
          url: image.url,
          type: 'image',
          etag: img.etag,
          lastModified: img.lastModified,
        };
        exports.download(resource, destination, function(err, resource) {
          if (err)  {
            return console.error('Error downloading image', image.url, 'download error:', err);
          }
//console.log('£££££££££££££££££££ image resource from download():', resource)
          img.etag = resource.etag; // ETag, to handle caching
          img.lastModified = resource.lastModified; // ETag, to handle caching
          img.save(function (err) {
            if (err) {
              return console.error('Error saving image', image.url + ':', err);
            }
            //console.log('image saved.');
          });
        });
      });
    },
    function(err) { // 3rd param is the function to call when everything's done (inner callback)
      if (err) {
        return console.error('Error in the final internal async callback:', err, '\n',
          'One of the iterations produced an error.\n',
          'Skipping this iteration.'
        );
      }
      // all tasks are successfully done now
      callback();
    }
  );
};

// download an image from url to destination on filesystem
exports.download = function(resource, destination, callback) {
  network.requestRetryAnonymous(
    resource,
    function(err) {
      callback(err);
    },
    function(contents, resource) {
console.error('NETWORK REQUEST SUCCESS: resource is long', contents.length);
//console.log('$$$$$$$$$$$$$$$$$$$ image resource from network.request...():', resource)
      /*
      var urlBasename;
      var urlExtension = path.extname(resource.url);
      var imagesExtensionsPattern = new RegExp('((\.(jpe?g|png|gif|bmp))$)', 'i');
      var match = urlExtension.match(imagesExtensionsPattern);
      if (match && match[1]) { // url does not terminate by an image extension: normalize it
        var extension = match[1];
        extension = extension.toLowerCase();
        extension = extension.replace(/^\.jpeg$/, '.jpg');
        urlBasename = path.basename(resource.url, urlExtension) + extension;
      } else { // url does not terminate by an image extension: keep it as-is
        urlBasename = path.basename(resource.url);
      }*/
      var urlBasename = path.basename(resource.url);
      mkdirp(destination, function (err) {
        if (err) {
          return callback(err);
        }
        destination += (destination.match('\/$') ? '' : '/') + urlBasename;
        fs.writeFile(
          destination,
          contents,
          'binary',
          function (err) {
            if (err) {
console.error('fs.writeFile ERROR:', err);
              return callback(err);
            }
//console.error('fs.writeFile SUCCESS: resource long', contents.length, 'SAVED TO', destination);
            callback(null, resource); // success
          }
        );
      });
    }
  )
};

/* testing...
var url = 'https://www.google.it/logos/doodles/2015/evidence-of-water-found-on-mars-5652760466817024.2-hp.gif';
var destination = './';
exports.download(url, destination, function(err) {
  if (err)  {
    return console.error(url + 'download error:', err);
  }
  console.error(url, 'downloaded to', destination);
});
*/

module.exports = exports;