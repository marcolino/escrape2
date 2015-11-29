'use strict';
var img = null;

for (var i = 0; i < 1; i++) {
  var image = { type: 'jpeg' };
  img = image;
  image = null;
}

console.log(image);
console.log(img);