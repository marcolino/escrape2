var urlRE = new RegExp([
  /(?:(?:(https?|ftp):)?\/\/)/      // protocol
  ,/(?:([^:\n\r]+):([^@\n\r]+)@)?/  // user:pass
  ,/(?:(?:www\.)?([^\/\n\r]+))/     // domain
  ,/(\/[^?\n\r]+)?/                 // request
  ,/(\?[^#\n\r]*)?/                 // query
  ,/(#?[^\n\r]*)?/                  // anchor
].map(function(r) {return r.source}).join(''));
var url = 'http://stackoverflow.com/questi';
var match = urlRE.exec(url);
console.log('domain:', match[4]);
