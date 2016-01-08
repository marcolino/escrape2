'use strict';

angular.module('UserService', []).factory('User', [ '$rootScope', '$http', function($rootScope, $http) {
  return {
  	getAll: function(filter, callback) { // call to get all persons
      var path = '';
      if (filter && filter.search && filter.search.term) {
        path += '/search/' + filter.search.term;
      }
      $http({
        method: 'GET',
        url:
          $rootScope.config.api.url + $rootScope.config.api.path + '/users/getAll' +
          path
      })
      .success(function(response) {
        if (response.error) {
          return console.warn('error getting users data:', response.error);
        }
        console.info('got users data (size is', response.length + '):', response);
        callback(response);
      })
      .error(function(err) {
        console.warn('error getting users data:', err);
      });
    },

  };
}]);