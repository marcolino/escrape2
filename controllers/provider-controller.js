var
  mongoose = require('mongoose'), // mongo abstraction
  cheerio = require('cheerio'), // to parse fetched DOM data
  async = require("async"), // to call many async functions in a loop
  network = require('./network-controller'), // network handling
  config = require('../config') // global configuration
;
var exports = {};
var internals = {};
        
// use LOG() to log only when debugging
var LOG = config.debug ? console.log.bind(console) : function() {};

exports.getAll = function(req, res, next) { // GET all providers
  internals.getAll(function(err, providers) {
    if (err) {
      console.error('Error retrieving providers:', err);
      res.json({ error: err });
    } else {
      LOG('providers.getAll: ' + providers);
      res.json(providers);
    }   
  });
}

exports.syncPlaces = function(req, res) { // sync persons
  // ... parsePlaces($, provider, config);

  function parsePlaces($, provider, config) {
    var val = {};
    if (provider.key === 'SGI') {
      $(provider.listCategories[config.category].selectors.category + ' > ul > li > a').each(function() {
        var region = $(this).text();
        var city = $(this).next('ul').find('li a').map(function() {
          return $(this).text();
        }).get();
        val[region] = city;
      });
    }
    return val;
  }
};

exports.syncPersons = function(req, res) { // sync persons
  var persons = [];

  internals.getAll({ type: 'persons', mode: (config.mode ? 'fake' : 'normal'), /*key: 'SGI'*/ }, function(err, providers) { // GET all providers
    if (err) {
      console.error('Error retrieving providers:', err);
      res.json({ error: err });
    } else {

      /*
       * providers are expected to publish a main page containing
       * a list with each person link, pointing to each person detail page
       */
    
      // loop to get list page from all providers
      async.each(
        providers, // 1st param in async.each() is the array of items
        function(provider, callbackOuter) { // 2nd param is the function that each item is passed to
          LOG('*** provider:', provider.key);
          var url = internals.buildUrl(provider, config);
LOG('url:', url);
          network.sfetch(
            url,
            provider,
            function(err) { // error
              console.error('Error syncing provider', provider.key + ':', err);
              res.json({ error: err });
            },
            function(contents) { // success
LOG('url', url, 'contents:', contents);
LOG('url', url, 'contents arrived, lenght is', contents.length);
              if (!contents) {
                console.warn('Error syncing provider', provider.key + ':', 'empty contents', '-', 'skipping');
                return callbackOuter(); // skip this outer loop
              }
              $ = cheerio.load(contents);
    
              // loop to get each element url (person url)
              var list = internals.parseList($, provider);
LOG('list of provider', provider.key, 'is long', list.length);
              async.each(
                list, // 1st param in async.each() is the array of items
                function(element, callbackInner) { // 2nd param is the function that each item is passed to
                  var person = {};
                  person.url = internals.parseUrl(element, provider, config);
                  LOG(provider.key, '-', 'person.url:', person.url);
                  person.key = internals.parseKey(element, provider);
                  network.sfetch(
                    person.url,
                    provider,
                    function(err) { // error
                      console.warn('Error syncing provider', provider.key + ',', 'person', person.key + ':', err, '-', 'skipping');
                      return callbackInner(); // skip this iner loop
                    },
                    function(contents) {
                      if (!contents) {
                        console.warn('Error syncing provider', provider.key + ',', 'person', person.key + ':', 'empty contents', '-', 'skipping');
                        return callbackInner(); // skip this inner loop
                      }
                      $ = cheerio.load(contents);
                      person.name = internals.parseName($, provider);
                      person.zone = internals.parseZone($, provider);
                      person.description = internals.parseDescription($, provider);
                      person.phone = internals.parsePhone($, provider);
                      person.photos = internals.parsePhotos($, provider);
                      person.nationality = internals.detectNationality(person, provider, config);
                      persons.push(person); // add this person to persons list

                      // TODO: save this person to database

                      callbackInner();
                    }
                  );
                },
                function(err) { // 3rd param is the function to call when everything's done (inner callback)
                  if (err) {
                    console.error('Error in the final internal async callback:', err, '\n',
                      'One of the iterations produced an error.\n',
                      'Skipping this iteration.'
                    );
                    return;
                  }
                  // all tasks are successfully done now
                  callbackOuter();
                }
              );
            }
          );
        },
        function(err) { // 3rd param is the function to call when everything's done (outer callback)
          if (err) {
            console.error('Error in the final external async callback:', err, '\n',
              'One of the iterations produced an error.\n',
              'All processing will now stop.'
            );
            return res.json(-1);
          }
          // all tasks are successfully done now
          LOG('---------------\n', persons, '\n---------------')
          res.json(persons.length);
        }
      );
    }
  });
};

exports.syncComments = function(req, res) { // sync comments
  // TODO
};

// TODO: in a different module ('globals') ?
exports.status = function(req, res) { // get providers status
  mongoose.model('Globals').find({ 'key': 'status-current' }, function(err, currentStatus) {
    if (err) {
      console.error('Error retrieving current status:', err);
      res.json({ error: err });
    } else {
      console.log('current status: ' + currentStatus);
      res.json(currentStatus);
    }   
  });
};

exports.testDetectNationality = function(req, res) { // test detect nationality
  internals.getAll({ type: 'persons', }, function(err, providers) { // get all providers
    if (err) {
      console.error('Error retrieving providers:', err);
      res.json({ error: err });
    } else {
      var person = {};  
      person.url = 'http://www.example.com';
      person.key = 'test-key';
      person.name = 'Isabel Russa';
      person.zone = 'Corso Francia';
      person.description = 'Viene dalla Argentina, ha 32 anni, è ricercatrice biologica';
      person.phone = '3333333333';

      res.json(
        internals.detectNationality(person, providers[0], config)
      );
    }
  });
}

internals.getAll = function(filter, result) { // get all providers
  mongoose.model('Provider').find(filter, function(err, providers) {
    result(err, providers);
  });
}

internals.buildUrl = function(provider, config) {
  var val;
  if (provider.key === 'SGI') {
    //val = (config.mode ==='fake' ? provider.urlFake : provider.url) + provider.listCategories[config.category].path + config.city;
    val = provider.url + provider.categories[config.category].path + config.city;
  }
  if (provider.key === 'TOE') {
    //val = (config.mode === 'fake' ? provider.urlFake : provider.url) + provider.listCategories[config.category].path;
    val = provider.url + provider.categories[config.category].path;
  }
  if (provider.key === 'FORBES') {
    val = provider.url + provider.categories[config.category].path;
  }
  LOG('buildUrl()', '-', provider.key, '-', 'provider url:', val);
  return val;
}

internals.parseList = function($, provider) {
  var val = [];
  if (provider.key === 'SGI') {
    val = $(provider.selectors.listElements).each(function (index, element) {
      val.push($(element).attr('href'));
    });
  }
  if (provider.key === 'TOE') {
    $(provider.selectors.listElements).find('div > div > a').each(function (index, element) {
      val.push($(element).attr('href'));
    });
    LOG('parseList()', '-', provider.key, '-', 'details list:', val);
  }
  if (provider.key === 'FORBES') {
LOG('parseList()', '-', provider.key, '-', 'elements:', $(provider.selectors.elements));
    val = $(provider.selectors.elements).each(function (index, element) {
      val.push($(element).attr('href'));
    });
    LOG('parseList()', '-', provider.key, '-', 'elements list:', val);
  }
  return val;
}

internals.parseKey = function($, provider) {
  var val;
  if (provider.key === 'SGI') {
    val = $.attribs.href.substr($.attribs.href.lastIndexOf('/') + 1);
  }
  if (provider.key === 'TOE') {
    val = $.match(/id=(.*)$/)[1]; // TODO: split, to avoid error in case of non-match...
  }
  LOG('parseKey()', '-', provider.key, '-', 'key:', val);
  return val;
}

internals.parseUrl = function($, provider, config) {
  var val;
  if (provider.key === 'SGI') {
    var key = $.attribs.href;
    val = (config.mode === 'fake' ? provider.urlFake : provider.url) + provider.listCategories[config.category].path + key;
  }
  if (provider.key === 'TOE') {
    var key = $.match(/id=(.*)$/);
    if (key) {
      val = (config.mode === 'fake' ? provider.urlFake : provider.url) + '/annuncio?id=' + key[1];
} else { // TODO: DEBUGGING...
console.error('parseUrl()', '-', provider.key, '-', 'EMPTY DETAILS URL: $ does not match /id=(.*)$/ pattern !!!!!', '$:', $);
    }
  }
  LOG('parseUrl()', '-', provider.key, '-', 'url:', val);
  return val;
}

internals.parseName = function($, provider) {
  var val;
  if (provider.key === 'SGI') {
    val = $(provider.selectors.element.name).text();
    val = val.trim();
  }
  if (provider.key === 'TOE') {
    val = $(provider.selectors.element.name).text();
  //val = val.match(/^([^a-z]+)/)[1].trim(); // keep only leading not lower case
    val = val.match(/^([\w]+)/)[1].trim(); // keep only word character from start to first non word character
  }
  LOG('parseName()', '-', provider.key, '-', 'name:', val);
  return val;
}

internals.parseZone = function($, provider) {
  var val;
  val = $(provider.selectors.element.zone).text();
  LOG('parseZone()', '-', provider.key, '-', 'zone:', val);
  return val;
}

internals.parseDescription = function($, provider) { 
  var val = $(provider.selectors.element.description).text();
  if (val) {
    val.
      replace(/<br>.*$/, ''). // remove trailing fixed part
      replace(/\r+/, ''). // remove CRs
      replace(/\n+/, '\n') // remove multiple LFs
  }
  LOG('parseDescription()', '-', provider.key, '-', 'description:', val ? val.substr(0, 32) : null);
  return val;
}

internals.parsePhone = function($, provider) {
  var val = $(provider.selectors.element.phone).text();
  if (val) {
    val.
      replace(/[^\d]/, '')
  }
  LOG('parsePhone()', '-', provider.key, '-', 'phone:', val);
  return val;
}

internals.parsePhotos = function($, provider) {
  var val = [];
  // loop to get each photo
  $(provider.selectors.element.photos).each(function(i, elem) {
    var href = elem.attribs.href;
    if (href) {
      href.
        replace(/(\.\.\/)+/, ''). // remove relative paths
        replace(/\?.*$/, '') // remove query string
      val.push(href);
    }
  });
  //LOG('parsePhotos()', '-', provider.key, '-', 'photos:', val);
  return val;
}

internals.detectNationality = function(person, provider, config) {
  var fields = [
    person.name,
    person.description,
  ];
  var
    language = provider.language,
    category = config.category
  ;

  var nationalityPatterns = [
    {
      'it': [
        {
          'women': [
            { 'alban(ia|ese)': 'al' },
            { 'argentina': 'ar' },
            { 'australi(a|ana)': 'au' },
            { 'barbados': 'bb' },
            { 'belg(a|io)': 'be' },
            { 'bolivi(a|ana)': 'bo' },
            { 'bosni(a|aca)': 'ba' },
            { 'brasil(e|iana)': 'br' },
            { 'bulgar(a|ia)': 'bu' },
            { 'canad(a|ese)': 'ca' },
            { 'capo\s*verd(e|iana)': 'cv' },
            { 'ch?il(e|ena)': 'cl' },
            { 'ch?in(a|ese)': 'cn' },
            { 'orient(e|ale)': 'asia' },
            { 'colombi(a|ana)': 'co' },
            { 'costa\s*ric(a|he..)': 'cr' },
            { 'croa([tz]ia|ta)': 'hr' },
            { 'cub(a|ana)': 'cu' },
            { 'c(zech|eca)': 'cz' },
            { 'dan(imarca|ese)': 'dk' },
            { 'dominic(a|ana)': 'do' },
            { 'ecuador(e..)?': 'ec' },
            { 'eston(ia|e)': 'ee' },
            { 'finland(ia|ese)': 'fi' },
            { 'franc(ia|ese|esina)': 'fr' },
            { '(germania|tedesc(a|ina))': 'de' },
            { '(gran bretagna|ing(hilterra|les(e|ina)))': 'en' },
            { 'grec(a|ia)': 'gr' },
            { 'greanad(a|iana)': 'gd' },
            { 'guatemal(a|teca)': 'gt' },
            { 'hait(i|iana)': 'ht' },
            { 'h?ondur(as|e(...)?)': 'hn' },
            { 'ungher(ia|ese)': 'hu' },
            { 'island(a|ese)': 'is' },
            { 'indi(a|ana)': 'in' },
            { 'indonesi(a|ana)': 'id' },
            { 'irland(a|ese)': 'ie' },
            { 'israel(e|iana)': 'ie' },
            { 'italian(a|issima)': 'it' },
            { '(j|gi)amaic(a|ana)': 'jm' },
            { '(japan)|(giappon(e|ese))': 'jp' },
            { 'ken[iy](a|ana)': 'ke' },
            { 'core(a|ana)': 'kr' },
            { 'lituan(a|ia)': 'lt' },
            { 'liban(o|ese)': 'lb' },
            { 'letton(ia|e)': 'lv' },
            { 'lussemburg(o|hese)': 'lu' },
            { 'macedon(ia|e)': 'mk' },
            { 'malta': 'mt' },
            { 'me(x|ss)ic(o|ana)': 'mx' },
            { 'moldov(a|iana)': 'md' },
            { 'monaco': 'mc' },
            { 'mongol(ia|a)': 'mn' },
            { 'montenegr(o|ina)': 'me' },
            { 'm([ao]rocco)|(arocchina)': 'ma' },
            { 'oland(a|ese)': 'nl' },
            { '(neo|nuova)[\s-]?zeland(a|ese)': 'nz' },
            { 'nicaragu(a|e...)': 'ni' },
            { 'niger': 'ne' },
            { 'nigeri(a|ana)': 'ng' },
            { 'norveg(ia|ese)': 'no' },
            { 'pa(k|ch)istan(a)?': 'pk' },
            { 'panam(a|ense)': 'pa' },
            { 'paragua(y|iana)': 'py' },
            { 'peru(viana)?': 'pe' },
            { '(ph|f)ilippin(e|a)': 'ph' },
            { 'pol(onia|acca)': 'pl' },
            { 'portoric(o|ana)': 'pr' },
            { 'portog(allo|hese)': 'pt' },
            { 'r(omania|(o|u)mena)': 'ro' },
            { 'd[ae]ll[\s\']est': 'ro' },
            { 'russ(i)?a': 'ru' },
            { 'san[\s-]?marin(o|ese)': 'sm' },
            { 'arab(i)?a': 'sa' },
            { 'senegal(ese)?': 'sn' },
            { 'serb(i)?a': 'rs' },
            { 'se[yi]chelles': 'sc' },
            { 'sierra[\s-]?leone': 'sl' },
            { 'singapore': 'sg' },
            { 'slovacch(i)?a': 'sk' },
            { 'sloven(i)?a': 'si' },
            { 'somal(i)?a': 'so' },
            { 'spagn(a)': 'es' }, // "spagnola" ignored on purpose, since often it's not a nationality...
            { 'sve(zia|dese)': 'se' },
            { 'svizzera': 'ch' },
            { 's[yi]ria(na)?': 'sy' },
            { 'taiwan(ese)?': 'tw' },
            { 't(h)?ai(land(ia|ese)?)?': 'th' },
            { 'trinidad': 'tt' },
            { 'tunisi(a|ina)': 'tn' },
            { 'turc(hia|a)': 'tr' },
            { 'u[kc]raina': 'ua' },
            { 'urugua([yi])|(gia)|([yi]ana)': 'uy' },
            { 'america(na)?': 'us' },
            { 'venezuela(na)?': 've' },
            { 'vietnam(ita)?': 'vn' },
            { 'asia(tica)?': 'asia' },
            { 'africa(na)?': 'africa' },
            { 'america[\s-]?centrale': 'central-america' },
            { 'caraibi(ca)?': 'caribbean' },
            { 'nord[\s-]?america(na)?': 'north-america' },
            { 'europa[\s-]+orientale]': 'eastern-europe' },
            { 'europea': 'europe' },
            { 'orient[e|(ale)]': 'asia' },
            { 'medio[\s-]?orientale': 'middle-east' },
            { 'oceania': 'oceania' },
            { 'sud[\s-]?america(na)?': 'south-america' },
          ],
        },
      ],
    },
  ];

  var negativeLookbehinds = [
    {
      'it': [
        {
          'women': [
            'alla',
            'amica',
            'autostrada',
            'area',
            'belvedere',
            'borgata',
            'borgo',
            'calata',
            'campo',
            'carraia',
            'cascina',
            'circonvallazione',
            'circumvallazione',
            'contrada',
            'c\.so',
            'corso',
            'cso',
            'diramazione',
            'frazione',
            'isola',
            'largo',
            'lido',
            'litoranea',
            'loc\.',
            'località',
            'lungo',
            'masseria',
            'molo',
            'parallela',
            'parco',
            'passaggio',
            'passo',
            'p\.za',
            'p\.zza',
            'piazza',
            'piazzale',
            'piazzetta',
            'ponte',
            'quartiere',
            'regione',
            'rione',
            'rio',
            'riva',
            'riviera',
            'rondò',
            'rotonda',
            'salita',
            'scalinata',
            'sentiero',
            'sopraelevata',
            'sottopassaggio',
            'sottopasso',
            'spiazzo',
            'strada',
            'stradone',
            'stretto',
            'svincolo',
            'superstrada',
            'tangenziale',
            'traforo',
            'traversa',
            'v\.',
            'via',
            'viale',
            'vicolo',
            'viottolo',
            'zona',
          ]
        },
      ],
    },
  ];

  return parseNationalityPatterns();
  
  function parseNationalityPatterns() {
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      for (var j = 0; j < nationalityPatterns.length; j++) {
        var patternObj = nationalityPatterns[j];
        for (var lang in patternObj) {
          if (lang === language) {
            var langPatterns = patternObj[lang];
            for (var k = 0; k < langPatterns.length; k++) {
              var langPatternObj = langPatterns[k];
              for (var cat in langPatternObj) {
                if (cat === category) {
                  var catPatterns = langPatternObj[cat];
                  for (var m = 0; m < catPatterns.length; m++) {
                    var catPatternObj = catPatterns[m];
                    for (var catPattern in catPatternObj) {
                      country = catPatternObj[catPattern];
                      var regexLangPattern = new RegExp('\\b' + catPattern + '\\b', 'gi');
                      if (field.match(regexLangPattern)) { // country pattern matched
                        // check for eventual negative look-behinds
                        if (parseNegativeLookbehinds(field, catPattern)) {
                          // negative lookbehind pattern found:
                          // break category patterns loop
                          // and go on with other patterns
                          break;
                        } else {
                          // negative lookbehind pattern not found:
                          // country really matched, result is found
                          return country;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return undefined;
  }

  function parseNegativeLookbehinds(field, catPattern) {
    for (var i = 0; i < negativeLookbehinds.length; i++) {
      var negativeLookbehindObj = negativeLookbehinds[i];
      for (var lang in negativeLookbehindObj) {
        if (lang === language) {
          var negativeLookbehindPatterns = negativeLookbehindObj[lang];
          for (var j = 0; j < negativeLookbehindPatterns.length; j++) {
            var negativeLookbehindObj = negativeLookbehindPatterns[j];
            for (var cat in negativeLookbehindObj) {
              if (cat === category) {
                var catPatterns = negativeLookbehindObj[cat];
                for (var k = 0; k < catPatterns.length; k++) {
                  var negativeLookbehind = catPatterns[k];
                  var regexNegativeLookbehind = new RegExp('\\b' + negativeLookbehind + '\\s+' + catPattern + '\\b', 'gi');
                  if (field.match(regexNegativeLookbehind)) {
                    // negative lookbehind pattern matched
                    return true;
                  }
                }
              }
            }
          }
        }
      }
    }
    return false;
  }
}

module.exports = exports;