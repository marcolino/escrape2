var request = require('request'),
    cheerio = require('cheerio')
  ;

var googleSearchByImageUrl = 'https://www.google.com/searchbyimage';
var userAgent = 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11';

//var image = 'http://www.torinoerotica.com/photo-escort/91126-4137/1-988916588-3643649102.JPG';
//var image = 'https://www.sexyguidaitalia.com/public/29276/copertina.jpg?t=635900234397057994';
var image = 'https://www.sexyguidaitalia.com/public/29577/3.jpg';

var options = {
  url: googleSearchByImageUrl,
  qs: { image_url: image },
  headers: { 'user-agent': userAgent }
};

request(options, function (err, res, body) {
  var $ = cheerio.load(body);
  var bestGuess = $('a[class="_gUb"]').html();
  console.log('Best guess:', bestGuess);
  console.log('Similar images:');
  $('div[class="srg"] > div[class="g"]').each(function(index, element) { // showcase image
  	var title = $(element).find('h3[class="r"] > a');
  	var titleHref = $(title).attr('href');
  	var titleText = $(title).text();
  	var des = $(element).find('span[class="st"]').html();
  	var src = $(element).find('img[class="_WCg"]').attr('src');
  	if (src) {
  	  console.log('title href:', titleHref);
  	  console.log('title text:', titleText);
  	  console.log('des:', des);
  	  console.log('img src:', src);
      console.log('-----');
  	}
  });
});
