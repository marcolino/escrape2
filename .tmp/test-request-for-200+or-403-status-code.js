    var request = require('request');
    var myResource = {
      'url': '//fiftyshadesofblog.altervista.org/wp-content/uploads/2015/06/donna.jpg',
      //'etag': '',
    };

    var options = {
      url: myResource.url,
      headers: { 'If-None-Match': myResource['etag'] },
    };
    request(
      options,
      function (err, res, body) {
        if (err) {
          return console.error('error in request:', err);
        }
        console.log('statusCode:', res.statusCode);
        console.log('headers:', res.headers);
        if (res.statusCode === 200) {
          myResource['etag'] = res.headers['etag'];
          console.log('etag:', myResource['etag']);
          console.log('downloaded.');

          // repeat request to check for 403...
          var options = {
            url: myResource.url,
            headers: { 'If-None-Match': myResource['etag'] },
          };
          request(
            options,
            function (err, res, body) {
              if (err) {
                return console.error('error in request:', err);
              }
              if (res.statusCode === 200) {
                myResource['etag'] = res.headers['etag'];
                console.log('downloaded.');
              }
              if (res.statusCode === 304) {
                console.log('cache hit.');
              }
            }
          );
          /////////////////////////////////////////////

        }
        if (res.statusCode === 304) {
          console.log('cache hit.');
        }
      }
    );
