'use strict';

angular.module('FilterService', []).factory('Filter', function() {
  var filtersEmpty = {
    search: {
      term: null,
    }
  };
  var filters = filtersEmpty;

  return {
    //filters: filters, // to be better watched...

    init: function() { // initialize filters
      filters = filtersEmpty; // TODO: load from cookies, if user is authenticated...
    },

    reset: function() { // reset filters
      filters = filtersEmpty;
    },

    get: function() { // get filters contents
      return filters;
    },

    set: function(obj) { // set filters contents
      for (var prop in obj) {
         filters[prop] = obj[prop];
      }
      //console.warn('Filter.set(obj) - new filters:', filters);
    },
  };
});