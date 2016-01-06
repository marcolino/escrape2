'use strict';

angular.module('Directives', [])

  .directive('uniqueUsername', function($http) {  
    return {
      require: 'ngModel',
      link: function(scope, elem, attrs, ctrl) {
        scope.busy = false;
        scope.$watch(attrs.ngModel, function(value) {
  
          // hide old error messages
          ctrl.$setValidity('isTaken', true);
          ctrl.$setValidity('invalidChars', true);
  
          if (!value) { // chech username is not empty
            return;
          }
  
          // show spinner
          scope.busy = true;
  
          // send request to server
          $http.post('/auth/validateUsername', { username: value })
            // TODO: unify the values expected to be returned by '/auth/validateUsername'... currently returns object when user is found, null otherwise
            .success(function(data) {
console.error(' --- uniqueUsername - success - data:', data);
              scope.busy = false;
              if (data.validity.isTaken) {
                ctrl.$setValidity('isTaken', false);
              } else if (data.validity.invalidChars) {
                ctrl.$setValidity('invalidChars', false);
              }
            })
            .error(function(data) {
              // should not happen...
console.error(' --- uniqueUsername - error - data:', data);
            })
          ;
        });
      }
    };
  })

  .directive("matchesPassword", function() {
    return {
      require: "ngModel",
      scope: {
        matchesPassword: '='
      },
      link: function(scope, elem, attrs, ctrl) {
console.log('matches-password');
        scope.$watch(function() {
          var combined;
          if (scope.matchesPassword || ctrl.$viewValue) {
            combined = scope.matchesPassword + '_' + ctrl.$viewValue; 
          }                    
          return combined;
        }, function(value) {
          if (value) {
            ctrl.$parsers.unshift(function(viewValue) {
              var origin = scope.matchesPassword.$viewValue;
              if (origin !== viewValue) {
console.log('matches-password FALSE origin', origin, 'viewValue:', viewValue);
                ctrl.$setValidity("matchesPassword", false);
                return undefined;
              } else {
console.log('matches-password TRUE');
                ctrl.$setValidity("matchesPassword", true);
                return viewValue;
              }
            });
          }
        });
      }
    };
  })

  .directive('accepablePassword', function($http) {  
    return {
      require: 'ngModel',
      link: function(scope, elem, attrs, ctrl) {
        scope.$watch(attrs.ngModel, function(value) {
  
          // hide old error messages
          //ctrl.$setValidity('empty', true);
          ctrl.$setValidity('tooEasy', true);
  
          if (!value) { // chech password is not empty
            return;
            //return ctrl.$setValidity('empty', false);
          }

          // show spinner
          scope.busy = true;
  
          // send request to server
          $http.post('/auth/validatePassword', { password: value })
            // TODO: unify the values expected to be returned by '/auth/validateUsername'... currently returns object when user is found, null otherwise
            .success(function(data) {
console.error(' --- acceptablePassword - success - data:', data);
              scope.busy = false;
              if (data.validity.tooEasy) {
                ctrl.$setValidity('tooEasy', false);
              }
            })
            .error(function(data) {
              // should not happen...
console.error(' --- acceptablePassword - error - data:', data);
            })
          ;
        });
      }
    };
  })

;