'use strict';
var network = require('../controllers/network') // network handling
  , Image = require('../models/image') // images handling
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

local.download = function(resourceRequest, destination, callback) {
  network.requestRetryAnonymous(
    resourceRequest,
    function(err) {
      callback(err);
    },
    function(contents, resourceResponse) {
      if (contents.length === 0) {
        // contents length is zero, possibly not modified, do not save to disk
        return callback(null, null);
      }
    }
  );
};

log.silly('1');
      var url = 'http://www.torinoerotica.com/photo-escort/95099-5971/1-384882052-3657450278.jpg';
      //var url = 'http://www.torinoerotica.com/photo-escort/94903-5881/2-812539707-3657701873.JPG';
      //var etag = '"61505193c28d11:0"';
      
      Image.findOne({ url: url }, function(err, img) {
    //Image.findOne({ etag: etag }, function(err, img) {
log.silly('2');
        if (err) {
          log.warn('can\'t find image ', image.url);
          return callbackInner();
        }
        if (img) { // existing image url
log.silly('img is not new');
          img.isNew = false;
        } else { // new image url
log.silly('img is new');
          img = new Image();
          img.isNew = true;
          img.url = image.url;
        }
        resource = {
          img: img,
          url: url,
          type: 'image',
          etag: img.etag, // comment this to force download
        };
        local.download(resource, destination, function(err, res) {
log.silly('downloaded err:', err);
log.silly('downloaded res:', res);
        });
      });