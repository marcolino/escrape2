'use strict';

angular.module('PersonService', []).factory('Person', [ '$rootScope', '$http', function($rootScope, $http) {
  return {
    get: function(callback) { // call to get all persons
      $http({
        method: 'GET',
        url: $rootScope.config.api.url + $rootScope.config.api.path + '/persons'
      })
      .success(function(response) {
        console.info('got persons data (size is', response.length + '):', response);
        callback(response);        
      })
      .error(function(err) {
        console.warn('error getting persons data:', err);
      });
    },

    getProviderUrl: function(key, category, callback) { // call to get person's provider base url
      $http({
        method: 'GET',
        //url: 'http://test.server.local:3000/api/providers/' + key + '/' + category + '/getUrl',
        url: $rootScope.config.api.url + $rootScope.config.api.path + '/providers' + '/' + key + '/' + category + '/getUrl',
      })
      .success(function(response) {
        callback(response);        
      })
      .error(function(err) {
        console.warn('error getting persons data:', err);
      });
    },
    
    /*
    create: function(personData) {
      return $http.post('/api/persons', personData);
    },
    delete: function(id) {
      return $http.delete('/api/persons/' + id);
    }
    */

  };
}]);