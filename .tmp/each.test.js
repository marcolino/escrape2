var async = require('async')
  , request = require('request')
;
var providers = [ 'http://localhost/test/list.one', 'http://localhost/test/list.two' ];

async.each(
  providers, // 1st param is the collection
  function(provider, callbackOuter) { // 2nd param is the function that each item is passed to
    console.log('requesting provider', provider);
    request(
      provider,
      function(err, response, contents) {
        if (err) {
          console.error(err);
        }
        if (!contents) {
          return callbackOuter(); // skip this outer loop
        }
        console.log('list:', contents);
        var list = contents.split('\n');
        async.each(
          list, // 1st param is the array of items
          function(element, callbackInner) { // 2nd param is the function that each item is passed to
            console.log('leaf url:', element);
            request(
              element,
              function(err, response, contents) {
                if (err) {
                  console.error(err);
                }
                console.log('leaf contents:', contents);
                callbackInner(); // signal this inner cicle is done
              }
            );
          },
          function(err) { // 3th param is the function to call when everything's done (inner callback)
            if (err) {
              return console.error('Error in the final inner async callback:', err, '\n',
                'One of the iterations produced an error.\n',
                'Skipping this iteration.'
              );
            }
            callbackOuter(); // signal this inner loop is done
            console.log('inner loop done');
          }
        );
      }
    );
  },
  function(err) { // 3rd param is the function to call when everything's done (outer callback)
    console.log('outer loop done!');
    if (err) {
      console.error('Error in the final outer async callback:', err, '\n',
        'One of the iterations produced an error.\n',
        'All processing will now stop.'
      );
    }
  }
);

/*
function (sets, waterfallCallback) {
  async.eachSeries(sets, function (set, seriesCallback) {
    console.log('SET ' + set.code.toUpperCase());
    request(baseurl + set.path, function (err, response, body) {
      var $ = cheerio.load(body);
      $('body > a[href^="/' + set.code + '/"]').each(function () {
        console.log('   %s (%s)', $(this).text(), $(this).attr('href'));
      });

      seriesCallback(null); /* 1 * /

    });
  }, waterfallCallback /* 2 * /);
}
*/
