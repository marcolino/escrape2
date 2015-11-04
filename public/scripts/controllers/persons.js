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
      url = '/images/' + 'person-showcase-default.png';
    }
    return encodeURIComponent(url);
  };

  $scope.startup();  

});