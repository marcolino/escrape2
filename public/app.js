'use strict';

// Declare app level module which depends on views, and components
var app = angular.module('escrape2', [
  'ngRoute',
  'escrape2.view1',
  'escrape2.version'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/view1'});
}]);
