'use strict';

angular.module('PersonCtrl', []).controller('PersonController', function($rootScope, $scope, Person, Filter) {

  //$scope.filter = {}; // TODO: set filter based on user's settins...

  $scope.$watch(function() { return Filter.get(); }, function(newValue, oldValue) {
    //console.log('persons WATCH:', newValue);
    if (newValue !== oldValue) { // filter did change, re-load persons
      $scope.load();
    }
  }, true); // last parameter is for object deep watch

  $scope.load = function() {
    Person.getAll(Filter.get()/*$scope.filter*/, function(response) {
      $scope.persons = response;
    });
  };

  $scope.getShowcaseUrl = function(person) {
    var url;
    if (person.showcaseUrl) {
      url = '/images/' + '/' + person.showcaseUrl;
    } else { // no showcase url for this person: use default person showcase url
      url = '/images/' + 'person-showcase-default.png';
    }
    return encodeURIComponent(url);
  };

  $scope.load();  

});