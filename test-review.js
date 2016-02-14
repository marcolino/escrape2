var review = require('./api/controllers/review');
var db = require('./api/models/db'); // database wiring

//var phone = '3888350421'; // SANDRA (4) (96+9+15=120)
//var phone = '3240810872'; // ANE MARIE (1) (18=18)
//var phone = '3897876672'; // KSIUSCHA (4) (3+18+14+7=42)
//var phone = '3426856330'; // GIULIA (0) (0=0)
//var phone = '3276104785'; // ILARIA (1) (8=8)
//var phone = '3206771993'; // BARBARA
//var phone = '3886531900'; // RELENAS
  var phone = '3277159559'; // ARIHANNA

review.sync(phone, function(err, results) {
//local.searchTopics(phone, function(err, results) {
  if (err) {
    return console.error(err);
  }
  console.log(results);
  console.log('found', results.length, 'posts for number', phone);
});
