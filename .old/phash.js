// MOVE TO IMAGE.JS !!!
var pHash = require('phash-image')
  , hammingDistance = require('hamming-distance') // calculate hamming distance
  , Image = require('../models/image') // images handling
  , _ = require('lodash') // lo-dash utilities
  , config = require('../config') // global configuration
;
var log = config.log;

exports.findNearest = function(perceptualHash, thresholdDistance, callback) {
  Image.find({}, function(err, images) {
    if (err) {
      log.warn('can\'t find images');
      return callback('can\'t find images');
    }
log.info('images:', images);
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
    //console.log('image ' + imageName + ' hash:', hash);
    hash = _.padRight(hash, 20, '0');
    callback(hash);
  });
};

local.hammingDistance = function(hash1, hash2) {
  return hammingDistance(hash1, hash2) / 80; // phash lenght is 20 bytes, each byte is 4 bits long
}

/*
exports.test = function() {
  var async = require('async');
  var pHashes = {};

  var imageNames = [
    'jlo-1.jpg',
    'jlo-2.jpg',
    'jlo-3.jpg',
    'jla-1.jpg',
  ];
  var pHashes = [];

  async.each(
    imageNames, // 1st param in async.each() is the array of items
    function(imageName, callback) { // 2nd param is the function that each item is passed to
      console.log('imageName:', imageName);
      pHash(imageName, true).then(function(hash) {
        console.log('image ' + imageName + ' hash:', hash);
        //pHashes[imageName] = hash;
        pHashes[imageName] = _.padRight(hash, 20, '0');
        callback();
      });
    },
    function(err) { // 3rd param is the function to call when everything's done
      if (err) {
        return console.error('error in async:', err);
      }
  
      //pHashes[imageNames[2]] = pHashes[imageNames[2]] + '0';
  
      console.info('phash jlo-1', ' => ', pHashes[imageNames[0]]);
      console.info('phash jlo-2', ' => ', pHashes[imageNames[1]]);
      console.info('phash jlo-3', ' => ', pHashes[imageNames[2]]);
      console.info('phash jla-1', ' => ', pHashes[imageNames[3]]);
      
      var hamming00 = hammingDistance(pHashes[imageNames[0]], pHashes[imageNames[0]]);
      console.info('Hamming distance 0 => 0 is ', hamming00);
      var hamming01 = hammingDistance(pHashes[imageNames[0]], pHashes[imageNames[1]]);
      console.info('Hamming distance 0 => 1 is ', hamming01);
      var hamming12 = hammingDistance(pHashes[imageNames[1]], pHashes[imageNames[2]]);
      console.info('Hamming distance 0 => 2 is ', hamming12);
      var hamming03 = hammingDistance(pHashes[imageNames[0]], pHashes[imageNames[3]]);
      console.info('Hamming distance 0 => 3 is ', hamming03);
    }
  );
};
*/

module.exports = exports;
