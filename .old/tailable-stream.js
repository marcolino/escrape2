var mongoose = require('mongoose') // mongo abstraction
  , Status = require('../models/status') // model of provider logging
;

var stream = Status.find().tailable().stream();

stream.on('data', function(doc) {
  console.log('=== status stream data: new doc:', doc);
}).on('error', function (error) {
  //if (error.message !== 'No more documents in tailed cursor') {
    console.log('!!! status stream data error:', error);
  //}
}).on('close', function () {
  console.log('!!! status stream data closed');
});