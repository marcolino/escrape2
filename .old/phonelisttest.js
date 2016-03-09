var description = '12345678 +123456789 1234567890';

//if (description.match(/(\d\{8-11\}[^\d]+)\{3-\}/)) {
if (/(\d{8,11}([^\d]+|$)){3,}/.test(description)) {
  console.log('matched');
} else {
  console.log('NOT matched');
}