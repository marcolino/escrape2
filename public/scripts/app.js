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
};

app.run([ '$rootScope', function($rootScope) {
  $rootScope.config = config;
}]);
