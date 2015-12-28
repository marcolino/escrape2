'use strict';

angular.module('routes', []).config( function($routeProvider, $locationProvider) {
  $routeProvider
    .when('/', { // home page
      templateUrl: 'views/persons.html',
      controller: 'PersonController'
    })
    .when('/aliases', { // aliases list page
      templateUrl: 'views/aliases.html',
      controller: 'PersonController'
    })
    .when('/about', {
      templateUrl: 'views/about.html',
      controller: 'AboutController'
    })
    .when('/users/signup', { // home page
      templateUrl: 'views/users/signup.html',
      controller: 'AuthController'
    })
    .when('/users/signin', { // home page
      templateUrl: 'views/users/signin.html',
      controller: 'AuthController'
    })
  ;
  $locationProvider.html5Mode(true);
});
