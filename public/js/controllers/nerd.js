angular.module('NerdCtrl', []).controller('NerdController', function($scope, Nerd) {
  Nerd.get(function(response) {
    $scope.persons = response;
  });
  $scope.tagline = 'Nothing beats a pocket protector!';
});