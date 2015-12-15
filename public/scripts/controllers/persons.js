'use strict';

angular.module('PersonCtrl', []).controller('PersonController', function($rootScope, $scope, Person, Filter) {

  //$scope.filter = {}; // TODO: set filter based on user's settins...

  $scope.$watch(function() { return Filter.get(); }, function(newValue, oldValue) {
    if (newValue !== oldValue) { // filter did change, re-load persons
      $scope.loadPersons();
    }
  }, true); // last parameter is for object deep watch

  $scope.loadPersons = function() {
    Person.getAll(Filter.get()/*$scope.filter*/, function(response) {
      $scope.persons = response;
    });
  };

  $scope.listAliasGroups = function() { // debug only method
    Person.listAliasGroups(function(response) {
      $scope.aliasGroups = response;
    });
  };

  $scope.getShowcaseUrl = function(person) {
    var url;
    if (person.showcaseBasename) {
      //console.log('person.showcaseBasename:', person.showcaseBasename);
      url = '/images' + '/' + person.key + '/showcase' + '/' + person.showcaseBasename;
    } else { // no showcase url for this person: use default person showcase url
      //console.log('person.showcaseBasename is EMPTY', person);
      url = '/images' + '/' + 'person-showcase-default.png';
    }
    return encodeURIComponent(url);
  };


  //$scope.load();  

});