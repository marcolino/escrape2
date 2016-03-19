'use strict';

angular.module('PersonCtrl', []).controller('PersonController', function($rootScope, $scope, $location, $routeParams, $window, Person, Filter, Review, TracesPhone) {

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
      active: false,
      topics: [],
      items: [],
      itemsLoaded: [],
      loaded: false,
    },
    'phototraces': {
      name: 'Photos Traces',
      active: false,
      items: [],
      loaded: false,
    },
    'phonetraces': {
      rating: 77,
      name: 'Phone Traces',
      active: false,
      items: [],
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

  $scope.panelTopicToggled = function(topicIndex) {
    console.log('panel topic', topicIndex, 'toggled');
console.info('$scope.panels.reviews.itemsLoaded[topicIndex]:', $scope.panels.reviews.itemsLoaded[topicIndex]);
    if (typeof $scope.panels.reviews.itemsLoaded[topicIndex] === 'undefined') {
console.info('$scope.panels.reviews.itemsLoaded[topicIndex] is undefined, loading topic index', topicIndex, 'posts...');
//$scope.panels.reviews.items[topicIndex] = 'ok';
      $scope.loadReviewTopicPosts($scope.panels.reviews.topics[topicIndex].key);
    } else {
console.info('$scope.panels.reviews.itemsLoaded[topicIndex] already loaded');      
    }
  };

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

      $scope.personShow = {
        //...
        nationality: 'russa', // $scope.showPersonNationality($scope.person);
      };
      $scope.personName = $scope.showPersonName($scope.person);
      $scope.personKey = $scope.showPersonKey($scope.person);
      $scope.personDateOfFirstSync = $scope.showPersonDateOfFirstSync($scope.person);
      $scope.personPhone = $scope.showPersonPhone($scope.person);
      $scope.personDescription = $scope.showPersonDescription($scope.person);
      $scope.personNationality = 'russa'; // $scope.showPersonNationality($scope.person);

      $scope.loadReviewTopics($scope.person);
      //$scope.loadReviewTopicPosts($scope.person);
      $scope.loadPhoneTraces($scope.person);
    });
  };

  $scope.loadReviewTopics = function(person) {
    var phone = person.phone;
    if (!phone) {
      return;
    }
    Review.getTopicsByPhone(phone, function(response) {
console.info('loadReviewTopics() reviews topics:', response);
      $scope.panels.reviews.topics = response;
    });
  };

/*
  $scope.loadReviewPosts = function(person) {
    var phone = person.phone;
    if (!phone) {
      return;
    }
    Review.getPostsByPhone(phone, function(response) {

console.info('loadReviewPosts() reviews posts:', response);

      $scope.panels.reviews.items = response;
    });
  };
*/

  $scope.loadReviewTopicPosts = function(topicIndex) {
    Review.getPostsByTopic(topicIndex, function(response) {
console.info('+++++++++++++++ loadReviewTopicPosts(', topicIndex, ') reviews posts:', response);
      $scope.panels.reviews.items[topicIndex] = response;
      $scope.panels.reviews.itemsLoaded[topicIndex] = true;
console.info('$scope.panels.reviews.itemsLoaded[topicIndex] shoud be true:', typeof $scope.panels.reviews.itemsLoaded[topicIndex]);
    });
  };

  $scope.loadPhoneTraces = function(person) {
    var phone = person.phone;
    if (!phone) {
      return;
    }
    TracesPhone.getTracesByPhone(phone, function(response) {
      //console.log('loadPhoneTracesResults() - response:', response);

      var traces = $scope.hightlightPhoneTraces(person, response);
      $scope.panels.phonetraces.items = traces;
    });
  };

  // highlight person name in phone traces title and description fields
  $scope.hightlightPhoneTraces = function(person, traces) {
    var i, e, tracesLen, searchLen;
    for (i = 0, tracesLen = traces.length; i < tracesLen; i++) {
      //var RE = new RegExp('\b' + '(' + person.name + ')' + '\b', 'mig');
      var RE = new RegExp('(' + person.name + ')', 'mig');
      var searchFields = [ 'title', 'description' ];
      for (e = 0, searchLen = searchFields.length; e < searchLen; e++) {
        traces[i][searchFields[e]] = highlight(traces[i][searchFields[e]], RE);
      }
    }
    return traces;

    function highlight(value, re) {
      value = value.replace(re, function(match, capture) {
        return '<span class="hightlight">&nbsp;' + match + '&nbsp;</span>';
      });
      return value;
    }
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
    var openInSameTab = false; // if opening in same tab, when going back, position is not retained... :-(
    if (openInSameTab) {
      $location.url('/person' + '/' + '?id=' + person._id); // in same tab
    } else {
      $window.open('/person' + '/' + '?id=' + person._id); // in new tab
    }
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

  $scope.showPersonDescription = function(person) {
    var description = person.description;
    return description;
  };

  $scope.hostname = function(uri) {
    var a = document.createElement('a');
    a.href = uri;
    return a.hostname.replace(/^www\./i, '');
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