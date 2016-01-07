'use strict';

/*
angular.module('AuthenticationService', []).factory('Authentication', [ '$rootScope', '$http', function($rootScope, $http) {
  return {};
}]);
*/

angular.module('PersonService', []).factory('Person', [ '$rootScope', '$http', function($rootScope, $http) {
  return {
    getAll: function(filter, callback) { // call to get all persons
      var path = '';
      if (filter && filter.search && filter.search.term) {
        path += '/search/' + filter.search.term;
      }
      console.warn('public service person getAll - url is: ' + $rootScope.config.api.url + $rootScope.config.api.path + '/persons/getAll' + path);
      $http({
        method: 'GET',
        url:
          $rootScope.config.api.url + $rootScope.config.api.path + '/persons/getAll' +
          path
      })
      .success(function(response) {
        if (response.error) {
          return console.warn('error getting persons data:', response.error);
        }
        console.info('got persons data (size is', response.length + '):', response);
        callback(response);
      })
      .error(function(err) {
        console.warn('error getting persons data:', err);
      });
    },

    listAliasGroups: function(callback) { // call to get all persons
      var path = '';
      $http({
        method: 'GET',
        url:
          $rootScope.config.api.url + $rootScope.config.api.path + '/persons/listAliasGroups'
      })
      .success(function(response) {
        if (response.error) {
          return console.warn('error getting persons data:', response.error);
        }
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
        if (response.error) {
          return console.warn('error getting provider url:', response.error);
        }
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