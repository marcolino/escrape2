var google = require('google');

google.resultsPerPage = 50;
var nextCounter = 0;

var search = 'donna';

var tot = 0;
google(search, function(err, next, links) {
  var maxPages = 4;
  if (err) {
  	return console.error(err);
  }
  
  for (var i = 0; i < links.length; ++i) {
    if (links[i].title && links[i].link && links[i].description) {
      tot++;
      console.log(tot);
      console.log(links[i].title + ' - ' + links[i].link);
      console.log(links[i].description + "\n");
    }
  }
  
  if (nextCounter < maxPages - 1) {
    nextCounter++;
    if (next) {
      next();
    }
  }
});