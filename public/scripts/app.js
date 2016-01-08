'use strict';

var config = {
  debug: true,
  devel: false,
  api: {
    url: null, //'http://test.server.local:3000', // http
  //url: null, //'https://test.server.local:8443', // https
    path: '/api',
  },
  category: 'women',
};

var app = angular.module('escrape2', [
  'ngRoute',
  'Directives',
  'HomeCtrl',
  'PersonCtrl',
  'AboutCtrl',
  'LoginCtrl',
  'AuthenticationService',
  'UserAuthenticationService',
  'TokenInterceptorService',
  'UserService',
  'FilterService',
  'PersonService'
]);

app.config(function($httpProvider, $routeProvider, $locationProvider) {
/*
app.config(function($routeProvider, $httpProvider) {
*/
  $httpProvider.interceptors.push('TokenInterceptor');

  $routeProvider
    .when('/login', {
      templateUrl: 'views/auth/login.html',
      controller: 'LoginController',
      access: {
        requiredLogin: false
      }
    }).when('/register', {
      templateUrl: 'views/auth/register.html',
      controller: 'LoginController',
      access: {
        requiredLogin: false
      }
    }).when('/', {
      templateUrl: 'views/persons.html',
      controller: 'PersonController',
      access: {
        requiredLogin: false
      }
    }).when('/about', {
      templateUrl: 'views/about.html',
      controller: 'AboutController',
      access: {
        requiredLogin: false
      }
    }).when('/profile', {
      templateUrl: 'views/profile.html',
      controller: 'UserController',
      access: {
        requiredLogin: true
      }
    })
    .when('/aliases', {
      templateUrl: 'views/aliases.html',
      controller: 'PersonController',
      access: {
        requiredLogin: true
      }
    }).otherwise({
      redirectTo: '/'
    })
  ;
  $locationProvider.html5Mode(true);
});

app.run(function($rootScope, $window, $location, Authentication) {
  // when the page refreshes, check if the user is already logged in
  Authentication.check();
 
  $rootScope.$on('$routeChangeStart', function(event, nextRoute, currentRoute) {
    //console.log('$on $routeChangeStart - Authentication.isLogged:', Authentication.isLogged);
    if ((nextRoute.access && nextRoute.access.requiredLogin) && !Authentication.isLogged) {
      $location.path('/login');
    } else {
      // check if user object exists else fetch it (in case of a page refresh)
console.log('WWWWWWWW $routeChangeStart - Authentication.user:', Authentication.user);
      if (!Authentication.user) {
        //Authentication.user = $window.localStorage.user;
        Authentication.user = $window.localStorage.getItem('user');
console.log('WWWWWWWW 222222222 $routeChangeStart - Authentication.user:', Authentication.user);
      }
/*
      if (!Authentication.userRole) {
        Authentication.userRole = $window.localStorage.userRole;
      }
*/
    }
  });
 
  $rootScope.$on('$routeChangeSuccess', function(event, nextRoute, currentRoute) {
    //console.log('$on $routeChangeSuccess - Authentication.isLogged:', Authentication.isLogged);
    $rootScope.isLogged = Authentication.isLogged;
console.log('SSSSSSS $routeChangeSuccess - Authentication:', Authentication);
    if (Authentication.isLogged) {
      /*
      $rootScope.username = Authentication.user;
      $rootScope.userRoles = Authentication.userRoles;
      */
      $rootScope.user = Authentication.user;
console.log('TTTTTTTTT $rootScope:', $rootScope);

      // if the user is already logged in, take him to the home page
      if ($location.path() == '/login') {
        $location.path('/');
      }
    }
  });

  // put config into $rootScope
  $rootScope.config = config;
});



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
      if (!config.api.url) {
        console.warn('DEVELOPMENT ONLY:', url, 'replied, setting as config.api.url');
        config.api.url = url;
      }
    },     
    error: function(result) {
      //console.log('url', url, 'timeout/error');
    }
  });
}
///////////////////////////////////////////////////////////////////////////////
