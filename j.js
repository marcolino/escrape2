var Jimp = require('jimp');

var imageName1 = __dirname + '/' + 'img.jpg';
var imageName2 = __dirname + '/' + 'img2.jpg';

Jimp.read(imageName1, function(err, image1) {
  if (err) {
    return callback(err, null);
  }
  Jimp.read(imageName2, function(err, image2) {
    console.log('Distance betweer images is:', Jimp.distance(image1, image2));
  });
});
