'use strict';

angular.module('PersonCtrl', []).controller('PersonController', function($rootScope, $scope, Person, Filter) {

  //$scope.filter = {}; // TODO: set filter based on user's settins...

  $scope.$watch(function() { return Filter.get(); }, function(newValue, oldValue) {
    //console.log('persons WATCH:', newValue);
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
//console.log('calling $scope.listAliasGroups...');
    Person.listAliasGroups(function(response) {
      $scope.aliasGroups = response;
//console.log('$scope.aliasGroups:', $scope.aliasGroups);
    });
  };

  $scope.getShowcaseUrl = function(person) {
    var url;
    if (person.showcaseBasename) {
      url = '/images' + '/' + person.showcaseBasename;
//url = 'images/SGI/adv449/320x-00abf569ace95af648d9e0189cc551e7.jpg';
    } else { // no showcase url for this person: use default person showcase url
      url = '/images' + '/' + 'person-showcase-default.png';
    }
    return encodeURIComponent(url);
  };


  //$scope.load();  

});