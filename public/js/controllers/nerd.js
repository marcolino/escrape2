angular.module('NerdCtrl', []).controller('NerdController', function($scope, Nerd) {
  Nerd.get(function(response) {
    $scope.persons = response;
  });
  $scope.showcaseUrls = [];

  $scope.getShowcaseLocalUrl = function(person) {
console.log('getShowcaseLocalUrl()', person);
    return '/images/' + person.providerKey + '/' + person.key + '/' + person.showcaseBasename;
/*
  	Nerd.getImages(person, function(err, images) {
      console.log('images:', images);
      if (err) { // error retrieving images for this person, use dummy image
        // TODO: use dummy image...
        $scope.showcaseUrls[person._id] = '/assets/images/' + 'dummy.jpg';
      }
      // filter showcase image
      var imageShowcase = images.filter(function(image) {
        return image.showcase === true;
      });
      $scope.showcaseUrls[person._id] = '/images/' + person.providerKey + '/' + person.key + '/' + imageShowcase.basename;
    });
*/
  }

  $scope.tagline = 'Nothing beats a pocket protector!';
});