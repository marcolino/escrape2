'use strict';

angular.module('AuthenticationService', []).factory('Authentication', function($rootScope, $window) {
  return {
    isLogged: false,
    isExpired: false,
    check: function() {
      if ($window.localStorage.token) { // if we have a token a user is logged
        if (!this.checkExpired()) {
          this.isLogged = true;
          this.isExpired = false;
        } else {
          this.isLogged = false;
          this.isExpired = true;
        }
      } else {
        this.isLogged = false;
        this.isExpired = false;
        delete this.user;
      }
    },
    checkExpired: function() {
      if ($window.localStorage.token) { // if we have a token a user is logged
        //console.log('$window.localStorage.token:', $window.localStorage.token);
        //console.log('$window.localStorage.token.split(.)[1]:', $window.localStorage.token.split('.')[1]);
        //console.log('$window.atob($window.localStorage.token.split(.)[1]):', $window.atob($window.localStorage.token.split('.')[1]));
        this.isExpired = JSON.parse($window.atob($window.localStorage.token.split('.')[1])).exp < new Date();
        //sconsole.log('isExpired:', this.isExpired);
        return this.isExpired;
      }
    }
  };
});

angular.module('UserAuthenticationService', []).factory('UserAuthentication', function($rootScope, $window, $location, $http, Authentication) {
  return {
    register: function(username, email, password) {
      return $http.post($rootScope.config.api.url + '/auth/register', {
        username: username,
        email: email,
        password: password
      });
    },

    login: function(username, password) {
      return $http.post($rootScope.config.api.url + '/auth/login', {
        username: username,
        password: password
      });
    },

    logout: function() {
    }

  };
});
 
angular.module('TokenInterceptorService', []).factory('TokenInterceptor', function($rootScope, $window, $q) {
  return {
    request: function(config) {
      config.headers = config.headers || {};
      if ($window.localStorage.token) {
        var user = $window.localStorage.getItem('user');
        config.headers['X-Access-Token'] = $window.localStorage.token;
        config.headers['X-Key'] = user ? JSON.parse(user).username : null;
        config.headers['Content-Type'] = 'application/json';
      }
      return config || $q.when(config);
    },
    response: function(response) {
      return response || $q.when(response);
    }
  };
});
