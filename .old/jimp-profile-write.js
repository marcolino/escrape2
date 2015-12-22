var jimp = require('jimp'); // image manipulation

var profile = function() {
  var t1 = process.hrtime();
  jimp.read('image.in.jpg', function(err, img) {
    if (err) {
      return console.error(err);
    }
    console.log(' read completed in', (process.hrtime(t1)[0] + (process.hrtime(t1)[1] / 1000000000)), 'seconds');

    var t2 = process.hrtime();
    img
      .autocrop(0.0029)
      .resize(128, jimp.AUTO)
      .quality(90)
      .write('image.out.jpg', function(err) {
      if (err) {
        return console.error(err);
      }
      console.log('write completed in', (process.hrtime(t2)[0] + (process.hrtime(t2)[1] / 1000000000)), 'seconds');
    });
  });
};

profile();