'use strict';

angular.module('LoginCtrl', []).controller('LoginController', function($rootScope, $scope, $window, $location, Filter, UserAuthentication, Authentication) {
  //console.log('INITIALIZING LOGIN CONTROLLER =======================');

  /*
  $scope.user = { // TODO: remove this...
    username: '', //'marco',
    password: '', //'pass'
    roles: '',
  }; 
  */
  //$scope.user = {};
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

  $scope.register = function() {
    if ($scope.form.$invalid) {
      return; // do not attempt registration if errors in form
    }

    var username = $scope.user.username;
    var email = $scope.user.email;
    var password = $scope.user.password;

    $scope.registrationFailed = null;
    if (!username || !password) {
      $scope.registrationFailed = true;
      return console.error('invalid credentials');
    }
    UserAuthentication.register(username, email, password).success(function(data) {
console.log('UserAuthentication.register returns', data);
/* enable this to auto-login user on registration
      Authentication.isLogged = true;
      Authentication.user = data.user.username;
      Authentication.userRole = data.user.role;
      $window.localStorage.token = data.token;
      $window.localStorage.user = data.user.username; // to fetch the user details on refresh
      $window.localStorage.userRole = data.userRole; // to fetch the user details on refresh
*/
      $location.path('/'); // redirect to home page
    }).error(function(data) {
console.error('UserAuthentication.register returns error:', data);
      $scope.registrationFailed = data.errur;
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
      $scope.loginFailed = 'username and password are required';
      return console.error('invalid credentials');
    }
    UserAuthentication.login(username, password).success(function(data) {
console.log(' YYYYYYYYYYYY UserAuthentication.login - data:', data);
      Authentication.isLogged = true;

      Authentication.user = data.user;
      /*
      Authentication.user = data.user.username;
      Authentication.userRoles = data.user.roles;
      */

      // set to localStorage too to fetch the user details on refresh
      $window.localStorage.token = data.token;
      //$window.localStorage.user = data.user;
      $window.localStorage.setItem('user', JSON.stringify(data.user)); // must stringify object before saving to localstorage
      /*
      $window.localStorage.user = data.user.username; 
      $window.localStorage.userRoles = data.user.roles;
      */

      $location.path('/'); // redirect to home page
    }).error(function(data) {
console.error('UserAuthentication.login returns error:', data);
      $scope.loginFailed = data.error;
    });
  };

  $scope.logout = function () {
    UserAuthentication.logout();
    if (Authentication.isLogged) {
console.log('public script services auth - logout - was logged');
      Authentication.isLogged = false;
      delete Authentication.user;
      delete Authentication.userRole;
      $window.localStorage.removeItem('user');
      delete $window.localStorage.token;
      //delete $window.localStorage.user;
      //delete $window.localStorage.userRole;
      console.error('logget out!');
      //$location.path('/');
    }
else console.log('public script services auth - logout - was NOT logged');
    $rootScope.isLogged = Authentication.isLogged; // we need this because we do not change route on logout
  };

  $scope.registrationReset = function() {
    $scope.registrationFailed = false;
  };

  $scope.loginReset = function() {
    $scope.loginFailed = false;
  } ;

  $scope.search = function() {
//console.info('Fiter.set({ search: { term:', $scope.filters.search.term, ' } })');
    Filter.set({ search: { term: $scope.filters.search.term } });
    console.info('searching', Filter.get().search);
  };

});
