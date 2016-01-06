'use strict';

angular.module('AuthenticationService', []).factory('Authentication', function($rootScope, $window) {
/*
app.factory('AuthenticationFactory', function($rootScope, $window) {
*/
  return {
    isLogged: false,
    check: function() {
      if ($window.localStorage.token && $window.localStorage.user) {
        this.isLogged = true;
      } else {
        this.isLogged = false;
        delete this.user;
      }
    }
  };
});

angular.module('UserAuthenticationService', []).factory('UserAuthentication', function($rootScope, $window, $location, $http, Authentication) {
/*
app.factory('UserAuthFactory', function($rootScope, $window, $location, $http, AuthenticationFactory) {
*/
  return {
    register: function(username, email, password) {
console.log('UserAuthenticationService - register - api url:', $rootScope.config.api.url);
console.log('UserAuthenticationService - register - username, password:', username, password);
      return $http.post($rootScope.config.api.url + '/auth/register', {
        username: username,
        email: email,
        password: password
      });
    },

    login: function(username, password) {
console.log('UserAuthenticationService - login - api url:', $rootScope.config.api.url);
console.log('UserAuthenticationService - login - username, password:', username, password);
      return $http.post($rootScope.config.api.url + '/auth/login', {
        username: username,
        password: password
      });
    },

    logout: function() {
      if (Authentication.isLogged) {
console.log('public script services auth - logout - was logged');
        Authentication.isLogged = false;
        delete Authentication.user;
        delete Authentication.userRole;
        delete $window.localStorage.token;
        delete $window.localStorage.user;
        delete $window.localStorage.userRole;
        console.error('logget out!');
        //$location.path('/');
      }
else console.log('public script services auth - logout - was NOT logged');
    }

  };
});
 
angular.module('TokenInterceptorService', []).factory('TokenInterceptor', function($rootScope, $window, $q) {
/*
app.factory('TokenInterceptor', function($rootScope, $window, $q) {
*/
  return {
    request: function(config) {
      config.headers = config.headers || {};
      if ($window.localStorage.token) {
        config.headers['X-Access-Token'] = $window.localStorage.token;
        config.headers['X-Key'] = $window.localStorage.user;
        config.headers['Content-Type'] = 'application/json';
      }
      return config || $q.when(config);
    },
    response: function(response) {
      return response || $q.when(response);
    }
  };
});
