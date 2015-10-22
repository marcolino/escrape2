'use strict';

angular.module('PersonService', []).factory('Person', ['$http', function($http) {
  return {
    get: function(callback) { // call to get all persons
      $http({
        method: 'GET',
        url: 'http://test.server.local:3000/persons'
      })
      .success(function(response) {
        console.info('got persons data:', response);
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
  }
}]);