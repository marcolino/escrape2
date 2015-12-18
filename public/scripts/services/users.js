angular.module('UserService', []).factory('User', [ '$rootScope', '$http', function($rootScope, $http) {
  return {
  	getAll: function(filter, callback) { // call to get all persons
      var path = '';
      if (filter && filter.search && filter.search.term) {
        path += '/search/' + filter.search.term;
      }
      //console.warn('public service person getAll - url is: ' + $rootScope.config.api.url + $rootScope.config.api.path + '/persons/getAll' + path);
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

  };
}]);