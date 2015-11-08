'use strict';

var app = angular.module('escrape2', [
  'ngRoute',
  'routes',
  'HomeCtrl',
  'PersonCtrl',
  'AboutCtrl',
  'PersonService'
]);

var config = {
  debug: true,
  devel: false,
  api: {
    url: 'http://test.server.local:3000',
    //url: 'http://192.168.1.2:3000', // to debug on device on LAN (mobiles...)
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
