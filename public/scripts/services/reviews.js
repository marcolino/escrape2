'use strict';

angular.module('ReviewService', []).factory('Review', [ '$rootScope', '$http', function($rootScope, $http) {
  return {
    getByPhone: function(phone, callback) { // call to get all reviews
      $http({
        method: 'GET',
        url: $rootScope.config.api.url + $rootScope.config.api.path + '/reviews/getByPhone' + '/' + phone,
      })
      .success(function(response) {
        if (response.error) {
          return console.warn('error getting reviews data:', response.error);
        }
        console.info('reviews (' + response.length + '):', response);
        callback(response);
      })
      .error(function(err) {
        console.warn('error getting reviews data:', err);
      });
    },

  };
}]);