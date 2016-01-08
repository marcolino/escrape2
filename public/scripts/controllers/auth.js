'use strict';

angular.module('LoginCtrl', []).controller('LoginController', function($rootScope, $scope, $window, $location, Filter, UserAuthentication, Authentication) {
  $scope.registrationFailed = null;
  $scope.loginFailed = null;
  $scope.filters = {};
  $scope.filters.search = null;

  $scope.viewRegister = function() {
    $location.path('/register'); // redirect to register view
  };

  $scope.viewLogin = function() {
    $location.path('/login'); // redirect to login view
  };

  $scope.viewProfile = function() {
    $location.path('/profile'); // redirect to profile view
  };

  $scope.register = function() {
    if ($scope.form.$invalid) {
      return; // do not even attempt registration if errors in form
    }

    var username = $scope.user.username;
    var email = $scope.user.email;
    var password = $scope.user.password;

    $scope.registrationFailed = null;
    if (!username || !password) {
      $scope.registrationFailed = 'invalid credentials';
      return;
    }

    UserAuthentication.register(username, email, password).success(function(data) { // registration success
      if ($rootScope.config.auth.autoLogin) {
        $scope.login(); // automatically log in just registered user
      }
      $location.path('/'); // redirect to home page
    }).error(function(data) { // registration error
      $scope.registrationFailed = data.error;
    });
  };

  $scope.login = function() {
    if ($scope.form.$invalid) {
      return; // do not even attempt login if errors in form
    }

    var username = $scope.user.username;
    var password = $scope.user.password;

    $scope.loginFailed = false;
    if (username === undefined && password === undefined) {
      $scope.loginFailed = 'username and password are required';
      return console.error('invalid credentials');
    }
    UserAuthentication.login(username, password).success(function(data) {
      Authentication.isLogged = true;
      Authentication.user = data.user;

      // set to localStorage too to fetch the user details on refresh
      $window.localStorage.token = data.token;
      $window.localStorage.setItem('user', JSON.stringify(data.user)); // must stringify object before saving to localstorage

      $location.path('/'); // redirect to home page
    }).error(function(data) { // login error
      $scope.loginFailed = data.error;
    });
  };

  $scope.logout = function () {
    UserAuthentication.logout();
    if (Authentication.isLogged) {
      Authentication.isLogged = false;
      delete Authentication.user;
      delete Authentication.userRole;
      $window.localStorage.removeItem('user');
      delete $window.localStorage.token;
    }
    $rootScope.isLogged = Authentication.isLogged; // we need this because we do not change route on logout
  };

  $scope.register = function() {
    if ($scope.form.$invalid) {
      return; // do not even attempt registration if errors in form
    }

    var username = $scope.user.username;
    var email = $scope.user.email;
    var password = $scope.user.password;

    $scope.registrationFailed = null;
    if (!username || !password) {
      $scope.registrationFailed = 'invalid credentials';
      return;
    }

    UserAuthentication.register(username, email, password).success(function(data) { // registration success
      if ($rootScope.config.auth.autoLogin) {
        $scope.login();
      }
      $location.path('/'); // redirect to home page
    }).error(function(data) { // registration error
      $scope.registrationFailed = data.error;
    });
  };

  $scope.updateProfile = function() {
    console.error('updateProfile IS TO BE IMPLEMENTED...');
    // TODO: ...
  };

  $scope.registrationReset = function() {
    $scope.registrationFailed = false;
  };

  $scope.loginReset = function() {
    $scope.loginFailed = false;
  } ;

  $scope.profileupdateReset = function() {
    $scope.profileupdateFailed = false;
  };

  $scope.search = function() {
    Filter.set({ search: { term: $scope.filters.search.term } });
    console.info('searching', Filter.get().search);
  };

});
