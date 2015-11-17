'use strict';

angular.module('FilterService', []).factory('Filter', [ function() {
  var filters = {};

  return {
    init: function() { // initialize filters
      //filters = {};
      filters.search = {};
      // TODO: load from cookies, if user is authenticated...
    },

    reset: function() { // reset filters
      filters.search = {};
    },

    get: function() { // get filters contents
      return filters;
    },

    set: function(search) { // set filters contents
      filters.search = search;
      return filters;
    },
  };
}]);