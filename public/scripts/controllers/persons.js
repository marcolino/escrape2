'use strict';

angular.module('PersonCtrl', []).controller('PersonController', function($rootScope, $scope, Person, Filter) {

  //$scope.filter = {}; // TODO: set filter based on user's settins...

  $scope.$watch(function() { return Filter.get(); }, function(newValue, oldValue) {
    if (newValue !== oldValue) { // filter did change, re-load persons
      $scope.loadPersons();
    }
  }, true); // last parameter is for object deep watch

  $scope.loadPersons = function() {
var t = console.time('a'); // TODO: development only
    Person.getAll(Filter.get()/*$scope.filter*/, function(response) {
console.log('controller/persons loadPersons - Person.getAll elapsed time:'); console.timeEnd('a');
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

  // hide person (remove from scope)
  $scope.hide = function(person) {
    //console.log('hiding person', person.key);
    //console.log($scope.persons);
    for (var i = 0, len = $scope.persons.length; i < len; ++i) {
      if ($scope.persons[i].key === person.key) {
        $scope.persons.splice(i, 1);
        break;
      }
    }

  };

/*
  function toObject(arr, key) {
    var o = {};
    for (var i = 0, len = arr.length; i < len; ++i) {
      o[arr[i][key]] = arr[i];
    }
    return o;
  }
*/

});