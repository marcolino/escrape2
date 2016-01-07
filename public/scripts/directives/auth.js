'use strict';

angular.module('Directives', [])

  .directive('existsUsername', function($http) {  
    return {
      require: 'ngModel',
      link: function(scope, elem, attrs, ctrl) {
console.log('existsUsername');
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
          $http.post('/auth/existsUsername', { username: value })
            // TODO: unify the values expected to be returned by '/auth/allowableUsername'... currently returns object when user is found, null otherwise
            .success(function(result) {
console.error(' --- existsUsername - success - result:', result);
              scope.busy = false;
              /* TODOOOOOOOOOOOOOOO
              if (result.isTaken) {
                ctrl.$setValidity('isTaken', false);
              } else */
              if (result.invalidChars) {
                ctrl.$setValidity('invalidChars', false);
              }
              if (result.isTaken) {
                ctrl.$setValidity('isTaken', false);
              }
            })
            .error(function(err) {
              // should not happen...
console.error(' --- existsUsername - error:', err);
              // do not $setValidity al all...
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

  .directive('allowablePassword', function($http) {  
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
          $http.post('/auth/allowablePassword', { password: value })
            // TODO: unify the values expected to be returned by '/auth/validateUser'... currently returns object when user is found, null otherwise
            .success(function(result) {
console.error(' --- allowablePassword - success - result:', result);
              scope.busy = false;
              if (result.tooEasy) {
                ctrl.$setValidity('tooEasy', false);
              }
            })
            .error(function(err) {
              // should not happen...
console.error(' --- allowablePassword - error:', err);
              // do not $setValidity al all...
            })
          ;
        });
      }
    };
  })

;