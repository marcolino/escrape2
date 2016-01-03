'use strict';


angular.module('AuthenticationService', []).factory('Authentication', function($rootScope, $window) {
/*
app.factory('AuthenticationFactory', function($rootScope, $window) {
*/
  return {
    isLogged: false,
    check: function() {
      if ($window.sessionStorage.token && $window.sessionStorage.user) {
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
    login: function(username, password) {
console.log('UserAuthenticationService - api url:', $rootScope.config.api.url);
/*
      return $http.post($rootScope.config.api.url + '/login', {
        username: username,
        password: password
      });
*/
      return {
        username: username,
        password: password
      };
    },
    logout: function() {
      if (Authentication.isLogged) {
        Authentication.isLogged = false;
        delete Authentication.user;
        delete Authentication.userRole;
        delete $window.sessionStorage.token;
        delete $window.sessionStorage.user;
        delete $window.sessionStorage.userRole;
        $location.path('/');
      }
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
      if ($window.sessionStorage.token) {
        config.headers['X-Access-Token'] = $window.sessionStorage.token;
        config.headers['X-Key'] = $window.sessionStorage.user;
        config.headers['Content-Type'] = 'application/json';
      }
      return config || $q.when(config);
    },
    response: function(response) {
      return response || $q.when(response);
    }
  };
});
