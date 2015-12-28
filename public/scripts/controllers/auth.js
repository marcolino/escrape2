'use strict';

angular.module('AuthCtrl', []).controller('AuthController', function($scope, $location, Filter, Person) {

  //$scope.signedIn = false;
  $scope.filters = {};

/*
  $scope.$watch(function() { return Filter.get().search.term; }, function(newValue, oldValue) {
console.log('auth WATCH:', newValue);
    Filter.set({ search: { term: newValue } });
  });
*/

  $scope.startup = function() {
  	console.log('auth controller - startup() called ...');
    $scope.filters.search = null;
  };

  $scope.search = function() {
console.info('searching', $scope.filters.search.term);
console.info('Fiter.set({ search: { term:', $scope.filters.search.term, ' } })');
    Filter.set({ search: { term: $scope.filters.search.term } });
/*
  	var what = Filter.get().search;
    console.info('searching', what);
*/
  };

  $scope.signup = function() {
    console.info('signup');
    $location.path('/users/signup');
  };

  $scope.signin = function() {
    console.info('signin');
    $scope.signedIn = true;
    $scope.username = 'pippo';
    $location.path('/users/signin');
  };
  
  $scope.signout = function() {
    console.info('signout');
    $scope.username = null;
    $scope.signedIn = false;
    $location.path('/');
  };
  
  $scope.startup();
});