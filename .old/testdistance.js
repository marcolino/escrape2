var sigS = '1110001000110000101000000101100010011001010000100001010001000000';
var sigE = '1010000000000101001111010000110000111111001100011110011001000000';

var distance = function(signature1, signature2) {
  if (!signature1 || !signature2) {
    return 1; // maximum possible distance
  }
  var counter = 0;
  for (var k = 0; k < signature1.length; k++) {
    if (signature1[k] != signature2[k]) {
      counter++;
    }
  }
  return (counter / signature1.length);
}

console.log(distance(sigS, sigE));
