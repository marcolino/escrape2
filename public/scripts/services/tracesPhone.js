'use strict';

angular.module('TracesPhoneService', []).factory('TracesPhone', [ '$rootScope', '$http', function($rootScope, $http) {
  return {
    
    getTracesByPhone: function(phone, callback) { // call to get all phone traces
      $http({
        method: 'GET',
        url: $rootScope.config.api.url + $rootScope.config.api.path + '/tracesPhone/getTracesByPhone' + '/' + phone,
      })
      .success(function(response) {
        if (response.error) {
          return console.warn('error getting phone traces posts data:', response.error);
        }
        //console.info('phone traces posts (' + response.length + '):', response);
        callback(response);
      })
      .error(function(err) {
        console.warn('error getting phone traces posts data:', err);
      });
    },

  };
}]);