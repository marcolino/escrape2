'use strict';

angular.module('PersonCtrl', []).controller('PersonController', function($rootScope, $scope, $location, $routeParams, $window, Person, Filter, Review) {

  $scope.rating = 3;
  $scope.ratingFunction = function(rating) {
    console.log('reachFunction():', rating);
  };

  $scope.sections = {
    'data': {
      visible: true,
    },
    'slider': {
      visible: true,
    },
    'footprints': {
      visible: true,
    },
    'carousel': {
      visible: false,
    },
  };

  $scope.panels = {
    'reviews': {
      name: 'Reviews',
      active: true,
      posts: [],
      topics: [],
      loaded: false,
    },
    'photostracks': {
      name: 'Photos Tracks',
      active: false,
      data: [ ],
      loaded: false,
    },
    'phonetracks': {
      rating: 77,
      name: 'Phone Tracks',
      active: false,
      results: [ ],
      loaded: false,
    },
  };

  $scope.$watch(function() { return Filter.get(); }, function(newValue, oldValue) {
    if (newValue !== oldValue) { // filter did change, re-load persons
      if ($location.path() !== '/persons') { // go to /persons, if not already there
        $location.path('/persons');
      }
      $scope.loadPersons();
    }
  }, true); // last parameter is for object deep watch

  $scope.loadPersons = function() {
var t = console.time('loadPersons'); // TODO: development only
    Person.getAll(Filter.get()/*$scope.filter*/, function(response) {
console.timeEnd('loadPersons');
      $scope.persons = response;
    });
  };

  $scope.loadPerson = function(id) {
    if (!id) { // if not set, get id from command line parameter
      id = $routeParams.id;
    }
var t = console.time('loadPerson'); // TODO: development only
    Person.getById(id, function(response) {
console.timeEnd('loadPerson');
      $scope.person = response;

      $scope.personName = $scope.showPersonName($scope.person);
      $scope.personKey = $scope.showPersonKey($scope.person);
      $scope.personDateOfFirstSync = $scope.showPersonDateOfFirstSync($scope.person);
      $scope.personPhone = $scope.showPersonPhone($scope.person);

      $scope.loadReviewPosts($scope.person.phone);
      $scope.loadPhonetracksResults($scope.person.phone);
    });
  };

  $scope.loadReviewPosts = function(phone) {
    if (!phone) {
      return;
    }
var t = console.time('loadReviews'); // TODO: development only
    Review.getPostsByPhone(phone, function(response) {
      //console.info('reviews data:', response);

      $scope.panels.reviews.posts = response;

      // extract topics from reviews (posts)
      $scope.panels.reviews.topics = {};
      for (var p = 0; p < response.length; p++) {
        var topicKey = (
          response[p].topic.section + '-' +
          response[p].topic.title + '-' +
          response[p].topic.dateOfCreation + '-' +
          response[p].topic.author.name).replace(/[^0-9a-zA-Z-]+/g, '-');
        //topicKey = topicKey.replace(/[^0-9a-zA-Z-]+/g, '-');
        response[p].topicKey = topicKey;
        if (!(topicKey in $scope.panels.reviews.topics)) { // new topic key
          $scope.panels.reviews.topics[topicKey] = response[p].topic;
          $scope.panels.reviews.topics[topicKey].postsCount = 1;
        } else { // topic key already present, just increment posts count
          $scope.panels.reviews.topics[topicKey].postsCount++;
        }
      }
    });
  };

  $scope.loadPhonetracksResults = function(phone) {
    /*
    if (!phone) {
      return;
    }
    */
    /*
    Review.getPhonetracksPhone(phone, function(response) {
      console.log('loadPhonetracksResults() - phone:', phone);
    });
    */
  };

  $scope.listAliasGroups = function() { // debug only method
    Person.listAliasGroups(function(response) {
      $scope.aliasGroups = response;
    });
  };

  $scope.getPersonShowcaseUrl = function(person) {
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

  $scope.getImageShowcaseUrl = function(image) {
    var url;
    url = '/images' + '/' + image.personKey + '/showcase' + '/' + image.basename;
    //console.log('getImageShowcaseUrl():', encodeURIComponent(url));
    return encodeURIComponent(url);
  };

  $scope.getImageFullsizeUrl = function(image) {
    var url;
    url = '/images' + '/' + image.personKey + '/full' + '/' + image.basename;
    //console.log('getImageFullsizeUrl():', encodeURIComponent(url));
    return encodeURIComponent(url);
  };

  $scope.thumbsUp = function() {
    if (!$rootScope.isLogged) {
      $window.alert('Please note that, since you are not logged in, this action will persist only in this session');
      // TODO: ...
    }
  };

  // hide person (remove from scope)
  $scope.hide = function(person) {
    for (var i = 0, len = $scope.persons.length; i < len; ++i) {
      if ($scope.persons[i].key === person.key) {
        $scope.persons.splice(i, 1); // remove person from $scope (to avoid to repeat loadPersons())
        break; // there is one person with that key: once found, bail out
      }
    }   

    // serialize hide value
    // TODO: check user is logged, before...
console.log('$rootScope.user:', $rootScope.user);
    Person.updatePersonUserData(person.key, $rootScope.user, {hide: true})
      .success(function(res) {
        console.info(' +++ hide value stored');
      })
      .error(function(err) {
        console.error(' +++ hide value NOT stored:', err);
      })
    ;
  };

  // open person's page
  $scope.personOpen = function(person) {
    $location.url('/person' + '/' + '?id=' + person._id);
  };

  $scope.carouselOpen = function(index) {
    $scope.sections.data.visible = false;
    $scope.sections.slider.visible = false;
    $scope.sections.footprints.visible = false;
    $scope.sections.carousel.visible = true;
    for (var i = 0; i < $scope.person.images.length; i++) {
      $scope.person.images[i].active = (i === index);
    }
  };

  $scope.carouselClose = function() {
    $scope.sections.data.visible = true;
    $scope.sections.slider.visible = true;
    $scope.sections.footprints.visible = true;
    $scope.sections.carousel.visible = false;
    for (var i = 0; i < $scope.person.images.length; i++) {
      $scope.person.images[i].active = false;
    }
  };

  $scope.showPersonName = function(person) {
    var name = person.name;
    return name;
  };

  $scope.showPersonKey = function(person) {
    var key = person.key;
    return key;
  };

  $scope.showPersonDateOfFirstSync = function(person) {
    //var date = person.dateOfFirstSync;
    var date = new Date(person.dateOfFirstSync);
    var today = new Date();
    var elapsedDays = Date.daysBetween(date, today);
    var elapsedTime;
    if (elapsedDays < 1) {
      elapsedTime = 'today';
    } else
    if (elapsedDays < 2) {
      elapsedTime = 'yesterday';
    } else
    if (elapsedDays < 30) {
      elapsedTime = elapsedDays + ' days ago';
    } else
    if (elapsedDays < (30 * 2)) {
      elapsedTime = Math.floor(elapsedDays / 30) + ' month ago';
    } else
    if (elapsedDays < 365) {
      elapsedTime = Math.floor(elapsedDays / 30) + ' months ago';
    } else
    if (elapsedDays < (365 * 2)) {
      elapsedTime = Math.floor(elapsedDays / 365) + ' year ago';
    } else
      elapsedTime = Math.floor(elapsedDays / 365) + ' years ago';
    return elapsedTime;
  };

  $scope.showPersonPhone = function(person) {
    var phone = person.phone;
    if (!phone || phone === '-1') {
      return 'no phone number';
    } else {
      return phone;
    }
  };
});

Date.daysBetween = function(date1, date2) {
  // get one day in milliseconds
  var one_day = 1000 * 60 * 60 * 24;

  // convert both dates to milliseconds
  var date1_ms = date1.getTime();
  var date2_ms = date2.getTime();

  // calculate the difference in milliseconds
  var difference_ms = date2_ms - date1_ms;
    
  // convert back to days and return
  return Math.round(difference_ms / one_day); 
};