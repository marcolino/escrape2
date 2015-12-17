var jimp = require('jimp');

var timeStart;

timeStart = process.hrtime();
jimp.read('image-framed.jpg', function(err, img) {
  if (err) {
    return console.error('can\'t read image contents:', err);
  }
  destination = 'image-framed-autocropped.jpg';
  img
  .autocrop(false)
  .write(destination, function(err) {
    if (err) {
      return console.error('can\'t write auto-cropped image version via jimp to', destination, ':', err);
    }
    console.log('image auto-cropped saved in', process.hrtime(timeStart)[0] + '.' + process.hrtime(timeStart)[1], 'seconds');
  })
});
