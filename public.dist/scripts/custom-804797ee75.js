'use strict';

var app = angular.module('escrape2', [
  'ngRoute',
  'routes',
  'HomeCtrl',
  'PersonCtrl',
  'AboutCtrl',
  'PersonService'
]);

var config = {
  debug: true
};
'use strict';

angular.module('routes', []).config( function($routeProvider, $locationProvider) {
  $routeProvider
    .when('/', { // home page
      templateUrl: 'views/home.html',
      controller: 'PersonController'
    })
    .when('/about', {
      templateUrl: 'views/about.html',
      controller: 'AboutController'
    });

    $locationProvider.html5Mode(true);
});

'use strict';

angular.module('AboutCtrl', []).controller('AboutController', function($scope) {
  
  $scope.about = 'The ultimate contacts manager!';

});
'use strict';

angular.module('HomeCtrl', []).controller('HomeController', function($scope) {

});
'use strict';

angular.module('PersonCtrl', []).controller('PersonController', function($scope, Person) {

  $scope.startup = function() {
    Person.get(function(response) {
      $scope.persons = response;
    });
  };

  $scope.getShowcaseLocalUrl = function(person) {
    var url;
    if (person.showcaseBasename) {
      url = '/images/' + person.providerKey + '/' + person.key + '/' + person.showcaseBasename;
    } else { // no showcase basename for this persin: use default person showcase image
      url = '/images/' + 'person-showcase.default.png';
    }
    return encodeURIComponent(url);
  };

  $scope.startup();  

});
'use strict';

angular.module('PersonService', []).factory('Person', ['$http', function($http) {
  return {
    get: function(callback) { // call to get all persons
      $http({
        method: 'GET',
        url: 'http://test.server.local:3000/api/persons'
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
  };
}]);
//# sourceMappingURL=custom-804797ee75.js.map
