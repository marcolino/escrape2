    var config = require('../config');
    var async = require('async');
    var crypto = require('crypto');
    var request = require('request');

    var log = config.log;
    
    var persons = [
      { key: 'P1/K1', imageUrls: [
                        'http://dummyimage.com/250x250/f00/fff',
                        'http://dummyimage.com/250x250/0f0/fff',
                        'http://dummyimage.com/250x250/00f/fff',
                      ], },
      { key: 'P1/K2', imageUrls: [
                        'http://dummyimage.com/350x350/f00/fff',
                        'http://dummyimage.com/350x350/0f0/fff',
                        'http://dummyimage.com/350x350/00f/fff',
                      ], },
      { key: 'P2/K1', imageUrls: [
                        'http://dummyimage.com/450x450/f00/fff',
                        'http://dummyimage.com/450x450/0f0/fff',
                        'http://dummyimage.com/450x450/00f/fff',
                      ], },
    ];
    var images = [
      { personKey: 'P2/K1', url: 'http://dummyimage.com/450x450/0f0/fff', }
    ];

    var syncPersonsImages = function(persons, images, callback) {
      async.each(
        persons,
        function(person, callbackPerson) {
          async.each(
            person.imageUrls,
            function(imageUrl, callbackImage) {
              download(imageUrl, function(err, image) {
                check(image, callbackImage);
              });
            },
            function(err) {
              callbackPerson();
            }
          );
        },
        function(err) {
          callback(null, persons);
        }
      );

      function download(imageUrl, callback) {
        request(
          { uri: imageUrl },
          function (err, response, contents) {
            if (!err && response.statusCode === 200) {
              var image = {}; // new Image() omitted for simplicity
              image.url = response.request.uri.href;
              image.contents = contents;
              callback(null, image);              
            } else {
              log.error('err in image download:', err, response.statusCode);              
            }
          }
        );
      }

      function check(image, callback) {
        async.waterfall(
          [
            function(callback) { getSignatureFromImage(image, callback); },
            findSimilarSignatureImage,
            saveImage,
          ],
          function (err, image) {
            callback();
          }
        );
      }
    
      var getSignatureFromImage = function(image, callback) {
        var image = {}; image.url = 'http://dummyimage.com/250x250/f00/fff'; // TODO: how to pass parameters to first waterfall function?
        image.signature = crypto.createHash('md5').update('image.url').digest('hex');
        callback(null, image);
      }
    
      var findSimilarSignatureImage = function(image, callback) {
        if (existsAlready(image.signature)) {
          image.isNew = true;
        }
        callback(null, image);
      }
    
      var saveImage = function(image, callback) {
        if (image.isNew) {
          // save image to db/fs omitted for simplicity
          console.log('image', image.url, 'saved');
          callback(null, image);
        } else {
          console.log('image', image.url, 'not saved');
          callback(null, null);
        }   
      }
    
      function existsAlready(signature) {
        return Math.random() < 0.5; // random value, for simplicity
      }

    };

    syncPersonsImages(persons, images, function(err, persons) {
      log.info('done syncy\'ing persons images');
    });
