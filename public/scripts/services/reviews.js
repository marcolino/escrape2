'use strict';

angular.module('ReviewService', []).factory('Review', [ '$rootScope', '$http', function($rootScope, $http) {
  return {
    
    getPostsByPhone: function(phone, callback) { // call to get all review posts
      $http({
        method: 'GET',
        url: $rootScope.config.api.url + $rootScope.config.api.path + '/reviews/getPostsByPhone' + '/' + phone,
      })
      .success(function(response) {
        if (response.error) {
          return console.warn('error getting review posts data:', response.error);
        }
        console.info('review posts (' + response.length + '):', response);
        callback(response);
      })
      .error(function(err) {
        console.warn('error getting review posts data:', err);
      });
    },

    getTopicsByPhone: function(phone, callback) { // call to get review topics by phone
      $http({
        method: 'GET',
        url: $rootScope.config.api.url + $rootScope.config.api.path + '/reviews/getTopicsByPhone' + '/' + phone,
      })
      .success(function(response) {
        if (response.error) {
          return console.warn('error getting review tpoics by phone data:', response.error);
        }
        console.info('review topics by phone (' + response.length + '):', response);
        callback(response);
      })
      .error(function(err) {
        console.warn('error getting review topics by phone data:', err);
      });
    },

    getPostsByTopic: function(topicKey, callback) { // call to get review posts by topic
      $http({
        method: 'GET',
        url: $rootScope.config.api.url + $rootScope.config.api.path + '/reviews/getPosgtsByTopic' + '/' + topicKey,
      })
      .success(function(response) {
        if (response.error) {
          return console.warn('error getting review posts by topic:', response.error);
        }
        console.info('review posts by topic (' + response.length + '):', response);
        callback(response);
      })
      .error(function(err) {
        console.warn('error getting review posts by topic data:', err);
      });
    },
  };
}]);