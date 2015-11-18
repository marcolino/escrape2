/// DEBUG ONLY /////////////////////////////////////
var db = require('../models/db'); // database wiring
var imageName = __dirname + '/../../.old/images.test/' + 'img2.jpg';
var thresholdDistance = 0.12;
Jimp.read(imageName, function(err, image) {
  if (err) {
    return log.error('Jimp can\'t read image', imageName, ':', err);
  }
  exports.findSimilar(image, {}, thresholdDistance, function(err, found, distance, personKey) {
    if (err) {
      return log.warn('can\'t find similar images:', err);
    }
    if (found) {
      log.info('most similar image found (distance is', distance + ') has person key', personKey);
    } else {
      log.info('no similar images found');
    }
  });
});
////////////////////////////////////////////////////

/// DEBUG ONLY /////////////////////////////////////
var db = require('../models/db'); // database wiring
var thresholdDistance = 0.05;
log.info('start');
Image.find({}, '_id personKey signature basename url', check);
function check(err, images) {
  if (err) {
    return log.error('can\'t find images');
  }
  log.debug('#images:', images.length);
  var minDistance = 1;
  var personKey = null;
  var found = false;
  for (var i = 0, len = images.length; i < len; i++) {
    var printed = false;
    for (var j = i + 1; j < images.length; j++) {
      var distance = local.distance(images[i].signature, images[j].signature);
      if (distance <= thresholdDistance) {
        found = true;
        //log.info('similar images found (distance is', distance + ') :', images[i].personKey, '<=>', images[j].personKey);
        if (!printed) console.log('<hr>', i, images[i].personKey + ': <img src="' + images[i].url + '" width="128" />');
        printed = true;
        console.log(' ', j, images[j].personKey, ': <img src="', images[j].url, '" width="128" /> ', distance, '<br>');
      }
      //break;
    }
  }
  if (!found) {
    log.info('no similar images found');
  }
  log.info('finish');
}
////////////////////////////////////////////////////