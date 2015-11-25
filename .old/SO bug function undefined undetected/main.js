var mod = require('./module');

var array = [ 1, 2, 3 ];
mod.myMethod(array, function(err, result) {
  if (err) {
    return console.error('error:', err);
  }
  console.log(result);
});