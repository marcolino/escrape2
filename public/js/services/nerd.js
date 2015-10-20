angular.module('NerdService', []).factory('Nerd', ['$http', function($http) {
  return {
    get: function(callback) { // call to get all nerds
      $http({
        method: 'GET',
        url: 'http://localhost:3000/persons',
        data: null
      })
      .success(function(response) {
        console.info('got persons data:', response);
        callback(response);        
      })
      .error(function(err) {
        console.error('error getting persons data:', err);
      });
      /*
      $http.get({
        method: 'GET',
        url: '/persons/',
      }).then(
        function(response) {
          console.info('got persons data:', response);
          callback(response);
        },
        function(err) {
          console.error('error getting persons data:', err);
        }
      );
      */
      //return $http.get('/persons'); // ('/api/nerds');
    },
    create: function(nerdData) {
      return $http.post('/api/nerds', nerdData);
    },
    delete: function(id) {
      return $http.delete('/api/nerds/' + id);
    }
  }
}]);