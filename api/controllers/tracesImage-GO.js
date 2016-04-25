'use strict';

var
  request = require('request') // handle network requests
, cheerio = require('cheerio') // parse DOM
//, fs = require('fs') // handle file-system
//, path = require('path') // to handle file-system paths (__dirname)
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
//GO.unavailableImagesPath = path.join(__dirname, '../../config/images/unavailable');

GO.getTraces = function(imageUrl, callback) {
  //console.error('GO.getTraces:', imageUrl);
  var googleSearchByImageUrl = 'https://www.google.com/searchbyimage';
  var userAgent = 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11';

  var options = {
    url: googleSearchByImageUrl,
    qs: { image_url: imageUrl },
    headers: { 'user-agent': userAgent }
  };
  
  var results = [];

  request(options, function (err, res, content) {
    if (err) { // TODO: make this error more "friendly"...
      return callback(err);
    }
    if (res.statusCode === 404) { // not found
      return callback(null, results); // return empty result set
    }
    if (GO.checkUnavailable(content)) { // returned image content is one of the images marked as 'unavailable'
console.info('GO.getTraces() - UNAVAILABLE image found...');
      return callback('unavailable', results); // return with 'unavailable' error
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
        //console.error('GO.getTraces - found:', title);
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
};

GO.checkUnavailable = function(imageContents) { // check if an image contents  is one of the images marked as 'unavailable'
  if (!GO.unavailableImagesMd5) { // load unavailable images checksusms from disk if not yet loaded
    GO.unavailableImagesMd5 = GO.getUnavailableImagesMd5();
console.info('GO.checkUnavailable() - unavalilable filenames md5 are:', GO.unavailableImagesMd5);
  }
  var isUnavailable = false;
  Object.keys(GO.unavailableImagesMd5).some(function(element, index, array) {
    var imageContentsMd5 = crypto.createHash('md5').update(imageContents).digest('hex');
console.info('GO.checkUnavailable() - comparing\n', imageContentsMd5, '\n', GO.unavailableImagesMd5[element]);
    if (imageContentsMd5 === GO.unavailableImagesMd5[element]) {
console.info('GO.checkUnavailable() - image is UNAVAILABLE');
      isUnavailable = true;
      return true; // this image contents is unavailable, break some() loop
    }
    return false;
  });
console.info('GO.checkUnavailable() - image is unavailable ?', isUnavailable);
  return isUnavailable;
};

GO.getUnavailableImagesMd5 = function() {
  var results = [];
  provider.getAll({ type: 'persons' }, function(err, providers) {
    if (err) {
      return log.error('error getting providers:', err);
    }
    providers.forEach(function(element, index, array) {
      var unavailableImageUrl = element.url + element.unavailableImageUrl;

      request.defaults({ encoding: null });
      request.get(unavailableImageUrl, function(error, response, body) {
        if (error || response.statusCode !== 200) {
          log.error('error getting image at', unavailableImageUrl + ':', err);
        } else {
          results[unavailableImageUrl] = crypto.createHash('md5').update(body).digest('hex');
        }
      });
    });
console.info('GO.getUnavailableImagesMd5() - results:\n', results);
    return results;
  });
};

/*
GO.getUnavailableImagesMd5 = function(dir) {
  var results = [];
  var filenames = [];

console.info('GO.getUnavailableImagesMd5() - dir:', dir);
  try {
    filenames = fs.readdirSync(dir);
  } catch (err) {
    console.error('can\'t read dir', dir, ':', err);
  }
console.info('GO.getUnavailableImagesMd5() - files in dir:', filenames);

  filenames.forEach(function(filename) {
    try {
      var content = fs.readFileSync(dir + '/' + filename);
      //var content64 = new Buffer(content).toString('base64');
      results[filename] = crypto.createHash('md5').update(content).digest('hex');
    } catch (err) {
      console.error('can\'t read file', dir + '/' + filename, ':', err);
    }
  });
console.info('GO.getUnavailableImagesMd5() -', results, 'results found');
  return results;
};
*/

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