'use strict';

angular.module('AuthCtrl', []).controller('AuthController', function($scope, Filter, Person) {

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

  $scope.startup();
});