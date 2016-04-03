'use strict';

angular.module('PersonCtrl', []).controller('PersonController', function($rootScope, $scope, $location, $routeParams, $window, $uibModal, Person, Filter, Review, TracesPhone) {

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

  $scope.footprints = {
    'reviews': {
      name: 'Reviews',
      active: false,
      topics: [],
      items: [], // NO, under topics...
      itemsLoaded: [], // NO, under topics...
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
console.info('$scope.footprints.reviews.itemsLoaded[topicIndex]:', $scope.footprints.reviews.itemsLoaded[topicIndex]);
    if (typeof $scope.footprints.reviews.itemsLoaded[topicIndex] === 'undefined') {
console.info('$scope.footprints.reviews.itemsLoaded[topicIndex] is undefined, loading topic index', topicIndex, 'posts...');
//$scope.footprints.reviews.items[topicIndex] = 'ok';
      $scope.loadReviewTopicPosts($scope.footprints.reviews.topics[topicIndex].key);
    } else {
console.info('$scope.footprints.reviews.itemsLoaded[topicIndex] already loaded');      
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
        name: $scope.showPersonName($scope.person),
        dateOfFirstSync: $scope.showPersonDateOfFirstSync($scope.person),
        phone: $scope.showPersonPhone($scope.person),

        nationality: $scope.showPersonNationality($scope.person),
        providers: $scope.showPersonProviders($scope.person),
        addressZone: $scope.showPersonAddressZone($scope.person),
        category: $scope.showPersonCategory($scope.person),
        description: $scope.showPersonDescription($scope.person),
        key: $scope.showPersonKey($scope.person),
      };

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
      $scope.footprints.reviews.topics = response;
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

      $scope.footprints.reviews.items = response;
    });
  };
*/

  $scope.loadReviewTopicPosts = function(topicIndex) {
    Review.getPostsByTopic(topicIndex, function(response) {
console.info('+++++++++++++++ loadReviewTopicPosts(', topicIndex, ') reviews posts:', response);
      $scope.footprints.reviews.items[topicIndex] = response;
      $scope.footprints.reviews.itemsLoaded[topicIndex] = true;
console.info('$scope.footprints.reviews.itemsLoaded[topicIndex] shoud be true:', typeof $scope.footprints.reviews.itemsLoaded[topicIndex]);
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
      $scope.footprints.phonetraces.items = traces;
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

  $scope.showPersonNationality = function(person) {
    var nationality = getCountryName(person.nationality);
    return nationality;
  };

  $scope.showPersonProviders = function(person) {
    var providers = [];
    var provider = {};
    provider.key = person.key.substr(0, person.key.indexOf('/')).toLowerCase();
    provider.url = 'http://www.torinoerotica.com'; // TODO !!! (get providers on load...)
    provider.logoSrc = '/images/providers/' + provider.key + '.png';
    providers.push(provider);
    return providers;
  };

  $scope.showPersonAddressZone = function(person) {
    var addressZone = person.addressZone;
    return addressZone;
  };

  $scope.showPersonCategory = function(person) {
    var category = person.category;
    return category;
  };

  $scope.hostname = function(uri) {
    var a = document.createElement('a');
    a.href = uri;
    return a.hostname.replace(/^www\./i, '');
  };
  
/*
  $scope.openModalUrl = function(url) {
    var modalInstance = $uibModal.open({
      templateUrl: url,
      //resolve: {
      //  items: function () {
      //    return $scope.items;
      //  }
      //}
    });
  };
*/
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

var isoCountries = {
  'AF' : 'Afghanistan',
  'AX' : 'Aland Islands',
  'AL' : 'Albania',
  'DZ' : 'Algeria',
  'AS' : 'American Samoa',
  'AD' : 'Andorra',
  'AO' : 'Angola',
  'AI' : 'Anguilla',
  'AQ' : 'Antarctica',
  'AG' : 'Antigua And Barbuda',
  'AR' : 'Argentina',
  'AM' : 'Armenia',
  'AW' : 'Aruba',
  'AU' : 'Australia',
  'AT' : 'Austria',
  'AZ' : 'Azerbaijan',
  'BS' : 'Bahamas',
  'BH' : 'Bahrain',
  'BD' : 'Bangladesh',
  'BB' : 'Barbados',
  'BY' : 'Belarus',
  'BE' : 'Belgium',
  'BZ' : 'Belize',
  'BJ' : 'Benin',
  'BM' : 'Bermuda',
  'BT' : 'Bhutan',
  'BO' : 'Bolivia',
  'BA' : 'Bosnia And Herzegovina',
  'BW' : 'Botswana',
  'BV' : 'Bouvet Island',
  'BR' : 'Brazil',
  'IO' : 'British Indian Ocean Territory',
  'BN' : 'Brunei Darussalam',
  'BG' : 'Bulgaria',
  'BF' : 'Burkina Faso',
  'BI' : 'Burundi',
  'KH' : 'Cambodia',
  'CM' : 'Cameroon',
  'CA' : 'Canada',
  'CV' : 'Cape Verde',
  'KY' : 'Cayman Islands',
  'CF' : 'Central African Republic',
  'TD' : 'Chad',
  'CL' : 'Chile',
  'CN' : 'China',
  'CX' : 'Christmas Island',
  'CC' : 'Cocos (Keeling) Islands',
  'CO' : 'Colombia',
  'KM' : 'Comoros',
  'CG' : 'Congo',
  'CD' : 'Congo, Democratic Republic',
  'CK' : 'Cook Islands',
  'CR' : 'Costa Rica',
  'CI' : 'Cote D\'Ivoire',
  'HR' : 'Croatia',
  'CU' : 'Cuba',
  'CY' : 'Cyprus',
  'CZ' : 'Czech Republic',
  'DK' : 'Denmark',
  'DJ' : 'Djibouti',
  'DM' : 'Dominica',
  'DO' : 'Dominican Republic',
  'EC' : 'Ecuador',
  'EG' : 'Egypt',
  'SV' : 'El Salvador',
  'GQ' : 'Equatorial Guinea',
  'ER' : 'Eritrea',
  'EE' : 'Estonia',
  'ET' : 'Ethiopia',
  'FK' : 'Falkland Islands (Malvinas)',
  'FO' : 'Faroe Islands',
  'FJ' : 'Fiji',
  'FI' : 'Finland',
  'FR' : 'France',
  'GF' : 'French Guiana',
  'PF' : 'French Polynesia',
  'TF' : 'French Southern Territories',
  'GA' : 'Gabon',
  'GM' : 'Gambia',
  'GE' : 'Georgia',
  'DE' : 'Germany',
  'GH' : 'Ghana',
  'GI' : 'Gibraltar',
  'GR' : 'Greece',
  'GL' : 'Greenland',
  'GD' : 'Grenada',
  'GP' : 'Guadeloupe',
  'GU' : 'Guam',
  'GT' : 'Guatemala',
  'GG' : 'Guernsey',
  'GN' : 'Guinea',
  'GW' : 'Guinea-Bissau',
  'GY' : 'Guyana',
  'HT' : 'Haiti',
  'HM' : 'Heard Island & Mcdonald Islands',
  'VA' : 'Holy See (Vatican City State)',
  'HN' : 'Honduras',
  'HK' : 'Hong Kong',
  'HU' : 'Hungary',
  'IS' : 'Iceland',
  'IN' : 'India',
  'ID' : 'Indonesia',
  'IR' : 'Iran, Islamic Republic Of',
  'IQ' : 'Iraq',
  'IE' : 'Ireland',
  'IM' : 'Isle Of Man',
  'IL' : 'Israel',
  'IT' : 'Italy',
  'JM' : 'Jamaica',
  'JP' : 'Japan',
  'JE' : 'Jersey',
  'JO' : 'Jordan',
  'KZ' : 'Kazakhstan',
  'KE' : 'Kenya',
  'KI' : 'Kiribati',
  'KR' : 'Korea',
  'KW' : 'Kuwait',
  'KG' : 'Kyrgyzstan',
  'LA' : 'Lao People\'s Democratic Republic',
  'LV' : 'Latvia',
  'LB' : 'Lebanon',
  'LS' : 'Lesotho',
  'LR' : 'Liberia',
  'LY' : 'Libyan Arab Jamahiriya',
  'LI' : 'Liechtenstein',
  'LT' : 'Lithuania',
  'LU' : 'Luxembourg',
  'MO' : 'Macao',
  'MK' : 'Macedonia',
  'MG' : 'Madagascar',
  'MW' : 'Malawi',
  'MY' : 'Malaysia',
  'MV' : 'Maldives',
  'ML' : 'Mali',
  'MT' : 'Malta',
  'MH' : 'Marshall Islands',
  'MQ' : 'Martinique',
  'MR' : 'Mauritania',
  'MU' : 'Mauritius',
  'YT' : 'Mayotte',
  'MX' : 'Mexico',
  'FM' : 'Micronesia, Federated States Of',
  'MD' : 'Moldova',
  'MC' : 'Monaco',
  'MN' : 'Mongolia',
  'ME' : 'Montenegro',
  'MS' : 'Montserrat',
  'MA' : 'Morocco',
  'MZ' : 'Mozambique',
  'MM' : 'Myanmar',
  'NA' : 'Namibia',
  'NR' : 'Nauru',
  'NP' : 'Nepal',
  'NL' : 'Netherlands',
  'AN' : 'Netherlands Antilles',
  'NC' : 'New Caledonia',
  'NZ' : 'New Zealand',
  'NI' : 'Nicaragua',
  'NE' : 'Niger',
  'NG' : 'Nigeria',
  'NU' : 'Niue',
  'NF' : 'Norfolk Island',
  'MP' : 'Northern Mariana Islands',
  'NO' : 'Norway',
  'OM' : 'Oman',
  'PK' : 'Pakistan',
  'PW' : 'Palau',
  'PS' : 'Palestinian Territory, Occupied',
  'PA' : 'Panama',
  'PG' : 'Papua New Guinea',
  'PY' : 'Paraguay',
  'PE' : 'Peru',
  'PH' : 'Philippines',
  'PN' : 'Pitcairn',
  'PL' : 'Poland',
  'PT' : 'Portugal',
  'PR' : 'Puerto Rico',
  'QA' : 'Qatar',
  'RE' : 'Reunion',
  'RO' : 'Romania',
  'RU' : 'Russian Federation',
  'RW' : 'Rwanda',
  'BL' : 'Saint Barthelemy',
  'SH' : 'Saint Helena',
  'KN' : 'Saint Kitts And Nevis',
  'LC' : 'Saint Lucia',
  'MF' : 'Saint Martin',
  'PM' : 'Saint Pierre And Miquelon',
  'VC' : 'Saint Vincent And Grenadines',
  'WS' : 'Samoa',
  'SM' : 'San Marino',
  'ST' : 'Sao Tome And Principe',
  'SA' : 'Saudi Arabia',
  'SN' : 'Senegal',
  'RS' : 'Serbia',
  'SC' : 'Seychelles',
  'SL' : 'Sierra Leone',
  'SG' : 'Singapore',
  'SK' : 'Slovakia',
  'SI' : 'Slovenia',
  'SB' : 'Solomon Islands',
  'SO' : 'Somalia',
  'ZA' : 'South Africa',
  'GS' : 'South Georgia And Sandwich Isl.',
  'ES' : 'Spain',
  'LK' : 'Sri Lanka',
  'SD' : 'Sudan',
  'SR' : 'Suriname',
  'SJ' : 'Svalbard And Jan Mayen',
  'SZ' : 'Swaziland',
  'SE' : 'Sweden',
  'CH' : 'Switzerland',
  'SY' : 'Syrian Arab Republic',
  'TW' : 'Taiwan',
  'TJ' : 'Tajikistan',
  'TZ' : 'Tanzania',
  'TH' : 'Thailand',
  'TL' : 'Timor-Leste',
  'TG' : 'Togo',
  'TK' : 'Tokelau',
  'TO' : 'Tonga',
  'TT' : 'Trinidad And Tobago',
  'TN' : 'Tunisia',
  'TR' : 'Turkey',
  'TM' : 'Turkmenistan',
  'TC' : 'Turks And Caicos Islands',
  'TV' : 'Tuvalu',
  'UG' : 'Uganda',
  'UA' : 'Ukraine',
  'AE' : 'United Arab Emirates',
  'GB' : 'United Kingdom',
  'US' : 'United States',
  'UM' : 'United States Outlying Islands',
  'UY' : 'Uruguay',
  'UZ' : 'Uzbekistan',
  'VU' : 'Vanuatu',
  'VE' : 'Venezuela',
  'VN' : 'Viet Nam',
  'VG' : 'Virgin Islands, British',
  'VI' : 'Virgin Islands, U.S.',
  'WF' : 'Wallis And Futuna',
  'EH' : 'Western Sahara',
  'YE' : 'Yemen',
  'ZM' : 'Zambia',
  'ZW' : 'Zimbabwe'
};

function getCountryName(countryCode) {
  if (typeof countryCode !== 'undefined' && countryCode !== null) {
    if (isoCountries.hasOwnProperty(countryCode.toUpperCase())) {
      return isoCountries[countryCode.toUpperCase()];
    } else {
      return countryCode;
    }
  } else {
    return 'unknown';
  }
}