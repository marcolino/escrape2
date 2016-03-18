'use strict';

angular.module('ViewDirectives', [])

  .directive('starRating', function() {
    return {
      restrict: 'A',
      template:
        '<ul class="rating">' +
        '  <li ng-repeat="star in stars" ng-class="star" ng-click="toggle($index)">' +
        '    \u2605' +
        '  </li>' +
        '</ul>',
      scope : {
        ratingValue: '=',
        max: '=',
        readonly: '=',
        onRatingSelected: '&'
      },
      link: function(scope, elem, attrs) {
        var updateStars = function() {
          scope.stars = [];
          for (var i = 0; i < scope.max; i++) {
            scope.stars.push({
              filled: i < scope.ratingValue
            });
          }
        };
        scope.toggle = function(index) {
          if (!scope.readonly) {
            scope.ratingValue = index + 1;
            scope.onRatingSelected({
              rating: index + 1
            });
          }
        };
        scope.$watch('ratingValue',
          function(oldVal, newVal) {
            if (newVal) {
              updateStars();
            }
          }
        );
      }
    };
  })

  .directive('html2text', function() {
    return {
      restrict: 'A',
      require: '?ngModel',
      link: function (scope, element, attrs, ngModel) {
console.info('ngModel:', ngModel);
        if (!ngModel) {
          return;
        }

        ngModel.$parsers.unshift(function(value) {
console.info('ngModel value:', value);
          return value.replace(new RegExp('\n', 'g'), '<br />');
        });

        ngModel.$formatters.unshift(function(value) {
console.info('ngModel value:', value);
          if (value) {
            return value.replace(new RegExp('<br />', 'g'), '\n');
          }
          return undefined;
        });
      }
    };
  })

  .filter('br2newline', function() {
    return function(text) {
      console.log('TEXT:', text);
      return text
        .replace(/&/g, '&amp;')
        .replace(/>/g, '&gt;')
        .replace(/</g, '&lt;');
    };
  })

;