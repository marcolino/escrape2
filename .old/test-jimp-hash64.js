var Jimp = require('jimp');

//var imageName = 'a553a911b4195da3a0834d566933c9e4.jpg';
var imageName = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Taylor_Swift_112_%2818119055110%29.jpg/250px-Taylor_Swift_112_%2818119055110%29.jpg';

Jimp.read(imageName, function(err, image) {
  if (err) {
    return console.error('Jimp can\'t rerad image:', err);
  }
  var hash64 = image.hash(64);
  if (hash64.length !== 11) {
    return console.error('hash value ('+hash64+') length is', hash64.length, 'instead of 11!');
  }
  console.log('hash64:', hash64);
});
