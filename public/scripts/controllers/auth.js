'use strict';

angular.module('LoginCtrl', []).controller('LoginController', function($rootScope, $scope, $window, $location, Filter, UserAuthentication, Authentication) {
  //console.log('INITIALIZING LOGIN CONTROLLER =======================');

  $scope.user = { // TODO: remove this...
    username: '', //'marco',
    password: '', //'pass'
    role: '',
  }; 
  $scope.filters = {};
  $scope.filters.search = null;

  $scope.viewRegister = function() {
    $location.path('/register'); // redirect to register view
  };

  $scope.viewLogin = function() {
    $location.path('/login'); // redirect to login view
  };

  $scope.register = function() {
    if ($scope.form.$invalid) {
      return; // do not attempt registration if errors in form
    }

    var username = $scope.user.username;
console.log('username:', username);
    var email = $scope.user.email;
    var password = $scope.user.password;
    $scope.registrationFailed = false;
    if (!username || !password) {
      $scope.registrationFailed = true;
      return console.error('invalid credentials');
    }
    UserAuthentication.register(username, email, password).success(function(data) {
console.log(' UserAuthentication.register returns', data);
/* enable this to auto-login user on registration
      Authentication.isLogged = true;
      Authentication.user = data.user.username;
      Authentication.userRole = data.user.role;
      $window.localStorage.token = data.token;
      $window.localStorage.user = data.user.username; // to fetch the user details on refresh
      $window.localStorage.userRole = data.userRole; // to fetch the user details on refresh
*/
      $location.path('/'); // redirect to home page
    }).error(function(message) {
      $scope.registrationFailed = message.error;
      return console.error(message);
    });
  };

  $scope.login = function() {
    if ($scope.form.$invalid) {
      return; // do not attempt login if errors in form
    }

    var username = $scope.user.username;
    var password = $scope.user.password;

    $scope.loginFailed = false;
    if (username === undefined && password === undefined) {
      $scope.loginFailed = true;
      return console.error('invalid credentials');
    }
    UserAuthentication.login(username, password).success(function(data) {
console.log(' UserAuthentication.login returns', data);
      Authentication.isLogged = true;
      Authentication.user = data.user.username;
      Authentication.userRole = data.user.role;
      $window.localStorage.token = data.token;
      $window.localStorage.user = data.user.username; // to fetch the user details on refresh
      $window.localStorage.userRole = data.userRole; // to fetch the user details on refresh
      $location.path('/'); // redirect to home page
    }).error(function(message) {
      $scope.loginFailed = message.error;
      return console.error(message);
    });
  };

  $scope.logout = function () {
    UserAuthentication.logout();
    $rootScope.isLogged = Authentication.isLogged;
  };

  $scope.search = function() {
//console.info('Fiter.set({ search: { term:', $scope.filters.search.term, ' } })');
    Filter.set({ search: { term: $scope.filters.search.term } });
    console.info('searching', Filter.get().search);
  };

});
