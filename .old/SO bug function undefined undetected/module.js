var async = require('async');

var local = {};

exports.myMethod = function(array, callback) {
  async.each(
    array, // 1st param is the array of items
    function(item, callback) { // 2nd param is the function that each item is passed to
console.log('1');
      local.existing(item, function(err, result) {
console.log('1.5');
        local.unexisting(function() {
console.log('1.6');
        });
      });
console.log('2');
    },
    function(err) { // 3rd param is the function to call when everything's done
      if (err) {
        console.log('some error in the final images async callback:', err);
        return callback(err);
      }
console.log('done');
      callback(null, 'ok');
    }
  );
};

local.existing = function(value, callback) {
  console.log('local.existing()', value);
  callback(null, value);
};

module.exports = exports;
