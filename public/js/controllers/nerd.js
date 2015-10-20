angular.module('NerdCtrl', []).controller('NerdController', function($scope, Nerd) {
  $scope.persons = Nerd.get();
  $scope.tagline = 'Nothing beats a pocket protector!';
});