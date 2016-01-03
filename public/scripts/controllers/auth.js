'use strict';

/*
angular.module('LoginCtrl', []).controller('LoginController', function($scope, $window, $location, Authentication) {
});
*/
angular.module('LoginCtrl', []).controller('LoginController', function($scope, $window, $location, UserAuthentication, Authentication) {
/*
app.controller('LoginCtrl', ['$scope', '$window', '$location', 'UserAuthFactory', 'AuthenticationFactory',
  function($scope, $window, $location, UserAuthFactory, AuthenticationFactory) {
]);
*/
    $scope.user = { // TODO: remove this...
      username: 'arvind@myApp.com',
      password: 'pass123'
    };

    $scope.loginPage = function() {
      $location.path('/login'); // redirect to login page
    };

    $scope.login = function() {
      var username = $scope.user.username;
      var password = $scope.user.password;

      if (username !== undefined && password !== undefined) {
console.log('auth controller - $scope.login - username, password:', username, password);
        UserAuthentication.login(username, password).success(function(data) {
console.log('data:', data);
          Authentication.isLogged = true;
          Authentication.user = data.user.username;
          Authentication.userRole = data.user.role;
          $window.sessionStorage.token = data.token;
          $window.sessionStorage.user = data.user.username; // to fetch the user details on refresh
          $window.sessionStorage.userRole = data.user.role; // to fetch the user details on refresh
          $location.path('/'); // redirect to home page
        }).error(function(status) {
          console.error('something went wrong... status:', status);
        });
      } else {
        console.error('invalid credentials');
      }
    };
  }
);

/*
'use strict';

angular.module('AuthCtrl', []).controller('AuthController', function($scope, $location, Filter, Person) {

  //$scope.signedIn = false;
  $scope.filters = {};


  $scope.startup = function() {
  	console.log('auth controller - startup() called ...');
    $scope.filters.search = null;
  };

  $scope.search = function() {
console.info('searching', $scope.filters.search.term);
console.info('Fiter.set({ search: { term:', $scope.filters.search.term, ' } })');
    Filter.set({ search: { term: $scope.filters.search.term } });
  	//var what = Filter.get().search;
    //console.info('searching', what);
  };

  $scope.signup = function() {
    console.info('signup');
    $location.path('/users/signup');
  };

  $scope.signin = function() {
    console.info('signin');
    $scope.signedIn = true;
    $scope.username = 'pippo';
    $location.path('/users/signin');
  };
  
  $scope.signout = function() {
    console.info('signout');
    $scope.username = null;
    $scope.signedIn = false;
    $location.path('/');
  };
  
  $scope.startup();
});

*/