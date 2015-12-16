var jimp = require('jimp');

var timeStart;

timeStart = process.hrtime();
jimp.read('image.jpg', function(err, img) {
  if (err) {
    return console.error('can\'t read image contents:', err);
  }
  destination = 'image-copied.jpg';
  img.write(destination, function(err) {
    if (err) {
      return console.error('can\'t write image version via jimp to', destination, ':', err);
    }
    console.log('image saved in', process.hrtime(timeStart)[0] + '.' + process.hrtime(timeStart)[1], 'seconds');
  })
});