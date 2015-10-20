angular.module('NerdService', []).factory('Nerd', ['$http', function($http) {
  return {
    get: function() { // call to get all nerds
      return $http.get('/persons'); // ('/api/nerds');
    },
    create: function(nerdData) {
      return $http.post('/api/nerds', nerdData);
    },
    delete: function(id) {
      return $http.delete('/api/nerds/' + id);
    }
  }
}]);