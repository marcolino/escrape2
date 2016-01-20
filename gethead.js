var http = require('http');
var options = {
  method: 'GET',
  host: 'www.sexyguidaitalia.com',
  port: 80,
  path: '/public/28695/copertina.jpg',
  headers: {
    'If-None-Match': '123'
  }
};
var t = process.hrtime();
var req = http.request(options, function(res) {
  console.log(res.headers);
  console.log(res);
});
console.log('HEAD http get:', process.hrtime(t)[0] + (process.hrtime(t)[1] / 1000000000), 'seconds');
req.end();
