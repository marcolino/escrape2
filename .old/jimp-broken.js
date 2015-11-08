var jimp = require('jimp');
var hammingDistance = require('hamming-distance');
var async = require('async');

var imageNames = [
 'jlo-1.jpg',
 'jlo-2.jpg',
 'jla-1.jpg',
];
var pHashes = [];

async.each(
  imageNames, // 1st param in async.each() is the array of items
  function(imageName, callback) { // 2nd param is the function that each item is passed to
    console.log('imageName:', imageName);
    jimp.read(imageName, function (err, image) {
      if (err) {
        return console.error('error in Jimp.read():', err);
      }
      console.log('image:', image);
      pHashes.push(image.hash());
    });
  },
  function(err) { // 3rd param is the function to call when everything's done (outer callback)
    if (err) {
      return log.error('error in async:', err);
    }
    log.info('finished image reading for all images');

    log.info('phash jlo-1', ' => ', pHashes[imageNames[0]]);
    log.info('phash jlo-2', ' => ', pHashes[imageNames[1]]);
    log.info('phash jla-1', ' => ', pHashes[imageNames[2]]);
    
    var hamming00 = hammingDistance(pHashes[imageNames[0]], pHashes[imageNames[0]]);
    var hamming01 = hammingDistance(pHashes[imageNames[0]], pHashes[imageNames[1]]);
    var hamming02 = hammingDistance(pHashes[imageNames[0]], pHashes[imageNames[2]]);
    var hamming20 = hammingDistance(pHashes[imageNames[2]], pHashes[imageNames[0]]);
    
    log.info('Hamming distance 0 => 0 is ', hamming00.toString());
    log.info('Hamming distance 0 => 1 is ', hamming01.toString());
    log.info('Hamming distance 0 => 2 is ', hamming02.toString());
    log.info('Hamming distance 2 => 0 is ', hamming20.toString());
  }
);
