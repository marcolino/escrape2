angular.module('NerdService', []).factory('Nerd', ['$http', function($http) {
  return {
    get: function(callback) { // call to get all nerds
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
    getImages: function(person, callback) { // call to get all images for a person
      console.info('getImages():', person);
      $http({
        method: 'GET',
        url: 'http://test.server.local:3000/persons/' + person._id + '/getImages'
      })
      .success(function(response) {
        console.info('got images for person ', person.providerKey, ' ', person.key, ':', response);
        callback(null, response);
      })
      .error(function(err) {
        console.warn('error getting images for person ', person.providerKey, ' ', person.key, ':', err);
        callback(err);
      });
    },
*/
    create: function(nerdData) {
      return $http.post('/api/nerds', nerdData);
    },
    delete: function(id) {
      return $http.delete('/api/nerds/' + id);
    }
  }
}]);