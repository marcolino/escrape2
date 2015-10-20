/*
function objectClone(obj) {
  if (null == obj || "object" != typeof obj) {
    return obj;
  }
  var copy = obj.constructor();
  for (var attr in obj) {
    if (obj.hasOwnProperty(attr)) {
      copy[attr] = obj[attr];
    }
    return copy;
  }
}

var pHash = require("phash");

pHash.imageHash("../public/test/meb1.jpg", function(err, hash) {
  if (err) {
    console.error('pHash error:', err);
  }
  console.log("pHash: " + hash);
});

var hashA,
    hashB,
    hammingAB
;

hashA = pHash.imageHashSync("../public/test/meb1.jpg");
hashB = pHash.imageHashSync("../public/test/meb2.jpg");
hammingAB = pHash.hammingDistance(hashA, hashB);
console.log("Hamming Distance 1 -> 2: " + hammingAB);

hashA = pHash.imageHashSync("../public/test/meb1.jpg");
hashB = pHash.imageHashSync("../public/test/meb2-mirrored.jpg");
hammingAB = pHash.hammingDistance(hashA, hashB);
console.log("Hamming Distance 1 -> 2-mirrored: " + hammingAB);

hashA = pHash.imageHashSync("../public/test/meb1.jpg");
hashB = pHash.imageHashSync("../public/test/meb9.jpg");
hammingAB = pHash.hammingDistance(hashA, hashB);
console.log("Hamming Distance 1 -> 9: " + hammingAB);

{
  threshold: 0.85;
  compare: function(fileImg1, fileImg2) {
    var hash1 = pHash.imageHashSync(fileImg1);
    var hash2 = pHash.imageHashSync(fileImg2);
  	var hamming = pHash.hammingDistance(hash1, hash2);
  	if (hamming < threshold) {
      var hash2 = pHash.imageHashSync(fileImg2rotated);
  	}
  }
}
*/

/*
//var resemble = require("node-resemble");
var diff = resemble("../public/test/meb1.jpg")
  .compareTo("../public/test/meb1.jpg")
  .ignoreColors()
  .onComplete(function(data) {
  console.log(data);
    / *
    {
      misMatchPercentage : 100, // %
      isSameDimensions: true, // or false
      dimensionDifference: { width: 0, height: -1 }, // defined if dimensions are not the same
      getImageDataUrl: function(){}
    }
    * /
});
*/
/*
var r = require("resemblejs");

var api = r.resemble("../public/images/test/meb1.jpg")
  .compareTo("../public/images/test/meb1.jpg")
  .onComplete(function(data) {
    console.log(data);
    / *
    {
      red: 255,
      green: 255,
      blue: 255,
      brightness: 255
    }
    * /
});
*/

/*
var
  fs = require('fs'),
  imagediff = require('imagediff'),
  Canvas = require('canvas');

function loadImage (url, callback) {
  var image = new Canvas.Image();
  fs.readFile(url, function (error, data) {
    if (error) throw error;
    image.onload = function () {
      callback(image);
    };
    image.onerror = function () {
      throw 'Error loading image buffer.'
    };
    image.src = data;
  });
  return image;
}

loadImage("../public/images/test/meb1.jpg", function (b) {
  loadImage("../public/images/test/meb2.jpg", function (a) {
    var
      aData = imagediff.toImageData(a),
      bData = imagediff.toImageData(b),
      equal = imagediff.equal(aData, bData, t),
      result;

    result = imagediff.diff(aData, bData, t);
    imagediff.imageDataToPNG(result, output, function () {
      console.log('Diff of ' + '1' + ' and ' + '2' + ': ', result);
    });
  });
});
*/
