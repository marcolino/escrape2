'use strict';

var request = require('request'),
    cheerio = require('cheerio')
  ;

// Google searchImagesProvider initialization
var GO = Object.create({});
GO.key = 'Google';
GO.active = true;

GO.getTraces = function(imageUrl, callback) {
  var googleSearchByImageUrl = 'https://www.google.com/searchbyimage';
  var userAgent = 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11';

  var results = [];

  var options = {
    url: googleSearchByImageUrl,
    qs: { image_url: imageUrl },
    headers: { 'user-agent': userAgent }
  };
  
  request(options, function (err, res, body) {
    if (err) { // TODO: make this error more "friendly"...
      return callback(null, results);
    }
    var $ = cheerio.load(body);
    var bestGuess = $('a[class="_gUb"]').html();
    //console.log('Best guess:', bestGuess);
    //console.log('Similar images:');
    $('div[class="srg"] > div[class="g"]').each(function(index, element) { // showcase image
      var elementTitle = $(element).find('h3[class="r"] > a');
      var imageUrl = $(elementTitle).attr('href');
      var title = $(elementTitle).text();
      var description = $(element).find('span[class="st"]').html();
      var thumbnailUrl = $(element).find('img[class="_WCg"]').attr('src');
      var dateOfLastSync = new Date();

      if (imageUrl) {
        results.push([
          {
            imageUrl: imageUrl,
            title: title,
            description: description,
            thumbnailUrl: thumbnailUrl,
            betsGuess: bestGuess,
            dateOfLastSync: dateOfLastSync,
          }
        ]);
      }
    });
    return callback(null, results);
  });
};

module.exports = GO;

/*
// test
GO.getTraces('http://vignette4.wikia.nocookie.net/epicrapbattlesofhistory/images/f/f2/Marilyn_Monroe_Based_On.jpg/revision/latest?cb=20150823030728', function(err, results) {
  if (err) {
    return console.error(err);
  }
  console.log(results.length, 'phone traces found:', results);
});
*/