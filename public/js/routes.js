'use strict';

angular.module('routes', []).config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
  $routeProvider
    .when('/', { // home page
      templateUrl: 'views/home.html',
      controller: 'PersonController'
    })
    .when('/about', {
      templateUrl: 'views/about.html',
      controller: 'AboutController'
    });

    $locationProvider.html5Mode(true);
}]);
