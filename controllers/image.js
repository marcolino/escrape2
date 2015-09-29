var fs = require('fs') // file-system handling
  , mkdirp = require('mkdirp') // to make directories with parents
  , network = require('./network') // network handling
  , path = require('path') // path handling
  , config = require('../config'); // global configuration

fs.mkdirParent = function(dirPath, mode, callback) {
  // call the standard fs.mkdir
  fs.mkdir(dirPath, mode, function(error) {
    // when it fail in this way, do the custom steps
    if (error && error.errno === 34) {
      // create all the parents recursively
      fs.mkdirParent(path.dirname(dirPath), mode, callback);
      // and then the directory
      fs.mkdirParent(dirPath, mode, callback);
    }
    // manually run the callback since we used our own callback to do all these
    callback && callback(error);
  });
};

exports.download = function(url, destination, callback) {
  network.requestRetryAnonymous(
    url,
    'image',
    function(err) {
      error(err);
    },
    function(contents) {
      var urlBasename;
      var urlExtension = path.extname(url);
      var imagesExtensionsPattern = new RegExp('([^\s]+(\.(jpg|png|gif|bmp))$)', 'i');
      var match = urlExtension.match(imagesExtensionsPattern);
      if (match && match[1]) {
        var extension = match[1];
        urlBasename = path.basename(url, extension);
      } else { // url does not terminate by an image extension: keep it as-is
        urlBasename = path.basename(url);
      }
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
              callback(err);
            }
            callback(); // success
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