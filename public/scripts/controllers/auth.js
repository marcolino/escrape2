'use strict';

angular.module('AuthCtrl', []).controller('AuthController', function($scope, Filter) {

  $scope.filters = {};

  $scope.$watch('filters.search', function(newValue, oldValue) {
    Filter.set({ search: newValue });
  });

  $scope.startup = function() {
  	console.log('auth controller - startup() called ...');
    $scope.filters.search = null;
  };

  $scope.search = function() {
  	console.log('Filter:', Filter.get());
  	var what = Filter.get().search;
    console.info('searching', what);
  };

  $scope.startup();
});