'use strict';

angular.module('PersonCtrl', []).controller('PersonController', function($rootScope, $scope, Person) {

  $scope.startup = function() {
    Person.get(function(response) {
      $scope.persons = response;
    });
  };

  $scope.getShowcaseUrl = function(person) {
    var url;
    if (person.showcaseUrl) {
      url = '/images/' + '/' + person.showcaseUrl;
    } else { // no showcase url for this persin: use default person showcase url
      url = '/images/' + 'person-showcase-default.png';
    }
    return encodeURIComponent(url);
  };

  $scope.startup();  

});