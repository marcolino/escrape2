'use strict';

var
  request = require('request') // handle network requests
, cheerio = require('cheerio') // parse DOM
, async = require('async') // to call many async functions in a loop
, crypto = require('crypto') // for md5
, provider = require('../controllers/provider') // provider's controller
, config = require('../config') // global configuration
;
var local = {};
var log = config.log;

// Google searchImagesProvider initialization
var GO = Object.create({});
GO.key = 'GO'; // Google
GO.active = true;

GO.getTraces = function(imageUrl, callback) {
  //log.debug('GO.getTraces:', imageUrl);
  var googleSearchByImageUrl = 'https://www.google.com/searchbyimage';
  var userAgent = 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11';

  var options = {
    url: googleSearchByImageUrl,
    qs: { image_url: imageUrl },
    headers: { 'user-agent': userAgent },
  };
  
  var results = [];

  request(options, function (err, res, content) {
    if (err) { // TODO: make this error more "friendly"...
      return callback(err);
    }
    if (res.statusCode === 404) { // not found
      return callback(null, results); // return empty result set
    }

    GO.checkUnavailable(imageUrl, function(err, result) {
      if (err) {
        log.error('can\'t check unavailable:', err);
        return callback(err);
      }
      if (result) { // returned image content is one of the images marked as 'unavailable'
        return callback('unavailable', result); // return with 'unavailable' error
      }

      var $ = cheerio.load(content);
      var bestGuess = $('a[class="_gUb"]').html();
      //console.log('Best guess:', bestGuess);
      //console.log('Similar images:');
      $('div[class="srg"] > div[class="g"]').each(function(index, element) { // showcase image
        var elementTitle = $(element).find('h3[class="r"] > a');
        var url = $(elementTitle).attr('href');
        var title = $(elementTitle).text();
        var description = $(element).find('span[class="st"]').html();
        var thumbnailUrl = $(element).find('img[class="_WCg"]').attr('src');
if (!thumbnailUrl) { console.error('thumbnailUrl for imageUrl', googleSearchByImageUrl + '?image_url=' + imageUrl, 'is null!'); }
        var dateOfLastSync = new Date();
  
        if (url) {
          results.push({
            imageUrl: imageUrl,
            url: url,
            title: title,
            description: description,
            thumbnailUrl: thumbnailUrl,
            bestGuess: bestGuess,
            dateOfLastSync: dateOfLastSync,
          });
        }
      });
      return callback(null, results);
    });
  });
};

GO.checkUnavailable = function(imageUrl, callback) { // check if an image contents is one of the images marked as 'unavailable'
  GO.getUnavailableImagesMd5(function(err, results) {
    if (err) {
      log.err('can\'t get unavailable images md5:', err);
      return callback(err);
    }
    GO.unavailableImagesMd5 = results;
    //log.debug('GO.checkUnavailable() - unavalilable filenames md5 are:', GO.unavailableImagesMd5);
    var isUnavailable = false;

    request.defaults({ encoding: null });
    request(imageUrl, function(err, res, body) {
      if (err) {
        log.error('can\'t check unavailability of image', imageUrl + ':', err);
        return callback(null, true); // ignore error, return true
      }

      Object.keys(GO.unavailableImagesMd5).some(function(element, index, array) {
        var imageContentsMd5 = crypto.createHash('md5').update(body).digest('hex');
        //log.debug('GO.checkUnavailable() - comparing\n', imageContentsMd5, '\n', GO.unavailableImagesMd5[element]);
        if (imageContentsMd5 === GO.unavailableImagesMd5[element]) {
          isUnavailable = true;
          return true; // this image contents is unavailable, break some() loop
        }
        return false;
      });
      //log.debug('GO.checkUnavailable() - image is unavailable ?', isUnavailable);
      return callback(null, isUnavailable);
    });
  });
};

GO.getUnavailableImagesMd5 = function(callback) {
  if (GO.unavailableImagesMd5) { // return unavailableImagesMd5 if already set
    //log.debug('GO.getUnavailableImagesMd5 - unavailableImagesMd5 ALREADY SET, OK');
    return callback(null, GO.unavailableImagesMd5);
  }
  // load unavailable images checksusms from disk if not yet loaded
  var results = {};
  provider.getAll({ type: 'persons' }, function(err, providers) {
    if (err) {
      log.error('error getting providers:', err);
      return callback(err);
    }
    //providers.forEach(function(element, index, array) {
    async.each(
      providers, // 1st param in async.each() is the array of items
      function(provider, callbackInner) { // 2nd param is the function that each item is passed to
        if (!provider.unavailableImageUrl) {
          return callbackInner();
        }
        var unavailableImageUrl = provider.url + provider.unavailableImageUrl;
        request.defaults({ encoding: null });
        request.get(unavailableImageUrl, function(error, response, body) {
          if (error || response.statusCode !== 200) {
            log.error('error getting image at', unavailableImageUrl + ':', err);
            return callbackInner(err);
          }
          results[unavailableImageUrl] = crypto.createHash('md5').update(body).digest('hex');
          return callbackInner();
        });
      },
      function(err) { // 3rd param is the function to call when everything's done (outer callback)
        if (err) {
          return callback(err);
        }
        //log.debug('GO.getUnavailableImagesMd5() - results:', results);
        return callback(null, results);
      }
    );
  });
};

module.exports = GO;



/*
// test
//var image = 'http://vignette4.wikia.nocookie.net/epicrapbattlesofhistory/images/f/f2/Marilyn_Monroe_Based_On.jpg/revision/latest?cb=20150823030728';
var image = 'http://www.torinoerotica.com/photo-escort/123/456.jpg';
GO.getTraces(image, function(err, results) {
  if (err) {
    return console.error(err);
  }
  console.log(results.length, 'phone traces found:', results);
});
*/