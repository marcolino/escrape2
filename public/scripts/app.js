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
    if ((nextRoute.access && nextRoute.access.requiredLogin) && !Authentication.isLogged) {
      $location.path('/login');
    } else {
      // check if user object exists else fetch it (in case of a page refresh)
      if (!Authentication.user) Authentication.user = $window.sessionStorage.user;
      if (!Authentication.userRole) Authentication.userRole = $window.sessionStorage.userRole;
    }
  });
 
  $rootScope.$on('$routeChangeSuccess', function(event, nextRoute, currentRoute) {
    $rootScope.showMenu = Authentication.isLogged;
    $rootScope.role = Authentication.userRole;
    // if the user is already logged in, take him to the home page
    if (Authentication.isLogged === true && $location.path() == '/login') {
      $location.path('/');
    }
  });

  // put config into $rootScope
  $rootScope.config = config;
});



/*
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
*/

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
