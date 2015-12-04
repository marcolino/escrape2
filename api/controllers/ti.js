    var config = require('../config');
    var async = require('async');
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
    ];
    
    var syncPersonsImages = function(persons, images, callback) {
      async.each(
        persons,
        function(person, callbackPerson) {
          async.each(
            person.imageUrls,
            function(imageUrl, callbackImage) {
              download(imageUrl, function(err, image) {
                if (err) return err;
                downloadPost(callbackImage);
              });
            },
            function(err) {
              if (err) return err;
              callbackPerson();
            }
          );
        },
        function(err) {
          if (err) return err;
          callback(persons);
        }
      );
    
      function download(imageUrl, callback) {
        request(
          { uri: imageUrl, },
          function(err) {
            callback(err);
          },
          function(contents, res) {
            image.contents = contents;
            return callback(null, image);
          }
        );
      }

      function downloadPost(image, callback) {
        async.waterfall(
          [
            getSignatureFromImage,
            findSimilarSignatureImage,
            saveImage,
          ],
          function (err, image) {
            callback(image);
          }
        );
      }
    
      function getSignatureFromImage(image, getSignatureFromImageCallback) {
        // ...
        getSignatureFromImageCallback(null);
      }
    
      function findSimilarSignatureImage(image, findSimilarSignatureImageCallback) {
        // ...
        findSimilarSignatureImageCallback(null, image);
      }
    
      function saveImage(image, saveCallback) {
        // ...
        saveCallback(null, image);
      }
    
    };

    syncPersonsImages(persons, images, function(err, persons) {
      if (err) {
        log.error(err);
        return err;
      }
      log.info('result:', persons);
    });

