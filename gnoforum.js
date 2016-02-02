var request = require('request')
var cheerio = require('cheerio')
var querystring = require('querystring')
var util = require('util')

var linkSel = 'h3.r a'
var descSel = 'div.s'
var itemSel = 'topic_details';
var nextSel = 'td.b a span'

var url = 'http://gnoccaforum.com/escort/search2';

var nextTextErrorMsg = 'Translate `google.nextText` option to selected language to detect next results link.'

// start parameter is optional
function gnoforum(query, callback) {
  var resultsPerPage = 15;
  var requestOptions = {
    url: url,
    qs: {
      advanced: 1,
      'search-field-name': query,
      searchtype: 1,
      userspec: '*',
      sort: 'relevance|desc',
      minage: 0,
      maxage: 9999,
    },
    method: 'POST'
  }

  request(requestOptions, function (err, response, body) {
    if ((err == null) && response.statusCode === 200) {
      console.log(body);
      var $ = cheerio.load(body);
      var links = [];

      $('div[class~="'+itemSel+'"]').each(function (i, elem) {
        console.log($(elem));
        //links.push(item);
      })
      callback(null, links);
    } else {
      callback(new Error('Error on response' + (response ? ' (' + response.statusCode + ')' : '') + ':' + err + ' : ' + body), null);
    }
  })
}

gnoforum('388.8350421', function(err, links) {
  if (err) {
    console.error(err);
  }
});

module.exports = gnoforum;