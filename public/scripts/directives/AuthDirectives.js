'use strict';

angular.module('AuthDirectives', [])

  .directive('existsUsername', function($http) {  
    return {
      require: 'ngModel',
      link: function(scope, elem, attrs, ctrl) {
        scope.busy = false;
        scope.$watch(attrs.ngModel, function(value) {

          // hide old error messages
          ctrl.$setValidity('isTaken', true);
          ctrl.$setValidity('invalidChars', true);

          if (!value) { // check username is not empty
            return;
          }

          // send request to server
          scope.busy = true; // show spinner
          $http.post('/auth/existsUsername', { username: value })
            .success(function(result) {
              scope.busy = false;
              if (result.invalidChars) {
                ctrl.$setValidity('invalidChars', false);
              }
              if (result.isTaken) {
                ctrl.$setValidity('isTaken', false);
              }
            })
            .error(function(err) { // should not happen
              console.error('/auth/existsUsername error:', err);
              // do not $setValidity al all
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
        scope.$watch(function() {
          if (scope.matchesPassword || ctrl.$viewValue) {
            return ctrl.$viewValue;
          }
          return undefined;
        }, function(value) {
          if (value) {
            ctrl.$parsers.unshift(function(viewValue) {
              var origin = scope.matchesPassword.$viewValue;
              if (origin !== viewValue) {
                ctrl.$setValidity("matchesPassword", false);
                return undefined;
              } else {
                ctrl.$setValidity("matchesPassword", true);
                return viewValue;
              }
            });
          }
        });
      }
    };
  })

  .directive('allowablePassword', function($http) {  
    return {
      require: 'ngModel',
      link: function(scope, elem, attrs, ctrl) {
        scope.$watch(attrs.ngModel, function(value) {

          // hide old error messages
          ctrl.$setValidity('tooEasy', true);

          if (!value) { // chech password is not empty
            return;
          }

          // send request to server
          scope.busy = true; // show spinner
          $http.post('/auth/allowablePassword', { password: value })
            .success(function(result) {
              scope.busy = false;
              if (result.tooEasy) {
                ctrl.$setValidity('tooEasy', false);
              }
            })
            .error(function(err) { // should not happen
              console.error('/auth/allowablePassword error:', err);
              // do not $setValidity al all
            })
          ;
        });
      }
    };
  })

;