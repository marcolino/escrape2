'use strict';

angular.module('TracesImageService', []).factory('TracesImage', [ '$rootScope', '$http', function($rootScope, $http) {
  return {
    
    getTracesByImage: function(image, callback) { // call to get all image traces
      $http({
        method: 'GET',
        url: $rootScope.config.api.url + $rootScope.config.api.path + '/tracesImage/getTracesByImage' + '/' + image,
      })
      .success(function(response) {
        if (response.error) {
          return console.warn('error getting image traces posts data:', response.error);
        }
        //console.info('image traces posts (' + response.length + '):', response);
        callback(response);
      })
      .error(function(err) {
        console.warn('error getting image traces posts data:', err);
      });
    },

    getTracesByPersonKey: function(personKey, callback) { // call to get all image traces by person key
console.info('getTracesByPersonKey():', $rootScope.config.api.url + $rootScope.config.api.path + '/tracesImage/getTracesByPersonKey' + '/' + personKey);
      $http({
        method: 'GET',
        url: $rootScope.config.api.url + $rootScope.config.api.path + '/tracesImage/getTracesByPersonKey' + '/' + personKey,
      })
      .success(function(response) {
console.info('getTracesByPersonKey() success');
        if (response.error) {
          return console.warn('error getting image traces posts data:', response.error);
        }
console.info('image traces posts (' + response.length + '):', response);
        callback(response);
      })
      .error(function(err) {
console.info('getTracesByPersonKey() error');
        console.warn('error getting image traces posts data:', err);
      });
    },

  };
}]);