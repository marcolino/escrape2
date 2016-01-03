'use strict';

var app = angular.module('escrape2', [
  'ngRoute',
  'routes',
  'AuthCtrl',
  //'UserCtrl',
  'HomeCtrl',
  'PersonCtrl',
  'AboutCtrl',
  'UserService',
  'FilterService',
  'PersonService'
]);

var config = {
  debug: true,
  devel: false,
  api: {
    url: 'http://test.server.local:3000',
    //url: 'https://test.server.local:8443', // ssl
    path: '/api',
  },
  category: 'women',
};

// TODO: we should not need $rootScope:
// for livereload use connect-livereload,
// and for other variable use some sort of templating system (handlebars?)
app.run([ '$rootScope', function($rootScope) {
  $rootScope.config = config;
}]);



///////////////////////////////////////////////////////////////////////////////
// DEVELOPMENT ONLY: find current active server pinging it: during
//                   development we can have different alternative server urls
///////////////////////////////////////////////////////////////////////////////
var apiUrls = [ // list all possible api servers addresses during development
  'http://test.server.local:3000', // (client == server)
  'http://192.168.1.2:3000', // (@Torino, client != server)
  'http://192.168.1.90:3000', // (@Portovenere, client != server)
];
/*
var apiUrls = [ // list all possible api servers addresses during development
  'https://test.server.local:8443', // (client == server)
  'https://192.168.1.2:8443', // (@Torino, client != server)
  'https://192.168.1.90:8443', // (@Portovenere, client != server)
];
*/

for (var i = 0, len = apiUrls.length; i < len; i++) {
  ping(apiUrls[i]);
}
function ping(url) {
  $.ajax({
    url: url,
    success: function(result) {
      console.warn('DEVELOPMENT ONLY:', url, 'replied, setting as config.api.url');
      config.api.url = url;
    },     
    error: function(result) {
      //console.log('url', url, 'timeout/error');
    }
  });
}
///////////////////////////////////////////////////////////////////////////////
