var mongoose = require('mongoose') // mongo abstraction
  , cheerio = require('cheerio') // to parse fetched DOM data
  , async = require("async") // to call many async functions in a loop
  , network = require('./network-controller') // network handling
  , config = require('../config'); // global configuration
var Provider = require('../models/provider') // model of provider
  , Person = require('../models/person'); // model of person

mongoose.connection.on('open', function () {
  // create providers
  createProviders(config.providers, function(err, result) {
    if (err) {
      return console.error('Error creating providers:', err);
    }
  });
});

exports.getAll = function(req, res, next) { // GET all providers
  getAll(function(err, providers) {
    if (err) {
      console.error('Error retrieving providers:', err);
      res.json({ error: err });
    } else {
      res.json(providers);
    }   
  });
};

exports.syncPersons = function(req, res) { // sync persons
  var persons = [];

  getAll({ type: 'persons', mode: config.mode, /*key: 'SGI'*/ }, function(err, providers) { // GET all providers
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
          console.log('===', 'provider:', provider.key);
          var url = buildUrl(provider, config); // TODO: => buildListUrl()
          console.log('url:', url);
          network.fetchThrottlingStubbornlyRetryingSecurely(
            url,
            provider,
            function(err) { // error
              console.error('Error syncing provider', provider.key + ':', err);
              res.json({ error: err }); // TODO: res.json(err)  >> res.json{ error: err }) GLOBALY...
            },
            function(contents) { // success
              console.log('url', url, 'contents lenght is', contents.length);
              if (!contents) {
                console.warn('Error syncing provider', provider.key + ':', 'empty contents', '-', 'skipping');
                return callbackOuter(); // skip this outer loop
              }
              $ = cheerio.load(contents);

              var list = getList(provider, $);
              console.log('list of provider', provider.key, 'is long', list.length);

              async.each(
                list, // 1st param is the array of items
                function(element, callbackInner) { // 2nd param is the function that each item is passed to
                  //var person = {};
                  var person = new Person();

                  person.url = element.url;
                  if (!person.url) {
                    console.warn('Error syncing provider', provider.key + ',', 'person with no url', ', skipping');
                    return callbackInner(); // skip this inner loop
                  }
                  person.key = element.key;
                  if (!person.key) {
                    console.warn('Error syncing provider', provider.key + ',', 'person with no key', ', skipping');
                    return callbackInner(); // skip this inner loop
                  }
                  var detailsUrl = buildDetailsUrl(provider, person, config);
                  console.log('details url:', detailsUrl);
                  network.fetchThrottlingStubbornlyRetryingSecurely(
                    detailsUrl,
                    provider,
                    function(err) {
                      console.warn('Error syncing provider', provider.key + ',', 'person', person.key + ':', err, '-', 'skipping');
                      return callbackInner(); // skip this inner loop
                    },
                    function(contents) {
                      if (!contents) {
                        console.warn('Error syncing provider', provider.key + ',', 'person', person.key + ':', 'empty contents', '-', 'skipping');
                        return callbackInner(); // skip this inner loop
                      }
                      $ = cheerio.load(contents);
                      person.name = getDetailsName($, provider);
                      person.zone = getDetailsZone($, provider);
                      person.description = getDetailsDescription($, provider);
                      person.phone = getDetailsPhone($, provider);
                      person.photos = getDetailsPhotos($, provider);
                      person.nationality = detectNationality(person, provider, config);

                      console.log('person:', person, '\n------------------');

                      // TODO: we don't need persons, just their count (possibly...)
                      persons.push(person); // add this person to persons list

                      // save this person to database //
                      //var p = new Person({ name: person.name });
                      person.save(function (err) {
                        if (err) {
                          console.warn('Error saving person', person.name + ':', err, '-', 'skipping');
                        }
                        // person saved
                        console.log('person', person.name, 'saved');
                      })
                      //////////////////////////////////

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
          //console.log('===\n', persons, '\n===')
          res.json(persons.length);
        }
      );
    }
  });
};

exports.syncComments = function(req, res) { // sync comments
  // TODO
};

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

// TODO: in a different module ('globals') ?
exports.status = function(req, res) { // get providers status
  Provider('Globals').find({ 'key': 'status-current' }, function(err, currentStatus) {
    if (err) {
      console.error('Error retrieving current status:', err);
      res.json({ error: err });
    } else {
      console.console.log('current status: ' + currentStatus);
      res.json(currentStatus);
    }   
  });
};

exports.testDetectNationality = function(req, res) { // test detect nationality
  getAll({ type: 'persons', }, function(err, providers) { // get all providers
    if (err) {
      console.error('Error retrieving providers:', err);
      res.json({ error: err });
    } else {
      var person = {};  
      person.url = 'http://www.example.com';
      person.key = 'test-key';
      person.name = undefined; //'Isabel Russa';
      person.zone = 'Corso Francia';
      person.description = 'Viene dalla Argentina, ha 32 anni, è ricercatrice biologica';
      person.phone = '3333333333';

      res.json(
        detectNationality(person, providers[1], config)
      );
    }
  });
};

var collectionExists = function(collectionName, callback) {
  getAll(function(err, providers) {
    if (err) {
      return callback(false);
    } else {
      callback(providers.length > 0);
    }   
  });
};

var createProviders = function(providers, callback) {
  // populate model (remove ad create)
  collectionExists('Provider', function(exists) {
    if (exists) {
      if (config.env === 'development') {
        console.log('Provider collection exists, environment is development, re-creating providers');
        remove(function(err) {
          create(providers, function(err) {
            callback(err);
          });
        });
      }
    } else {
      console.log('Provider collection does not exist, creating providers');
      create(providers, function(err) {
        callback(err);
      });
    }
  });

  // remove Provider collection
  function remove(callback) {
    Provider.remove({}, function(err) {
      if (err) {
        return callback(err);
      }
      callback(null);
    });
  }

  // create Provider collection
  function create(providers, callback) {
    Provider.create(providers, function(err, provider) {
      if (err) {
        return callback(err);
      }
      callback(null, provider);
    });
  }
};

var getAll = function(filter, result) { // get all providers
  Provider.find(filter, function(err, providers) {
    result(err, providers);
  });
};

var getList = function(provider, $) {
  var val = [];
  if (provider.key === 'SGI') {
console.log('SGI getList');
    $('a[OnClick="get_position();"]').each(function(index, element) {
      var url = $(element).attr('href');
      var key = url; // TODO: parse 'adv2787' from 'annuncio/adv2787' ...
      val.push({ key: key, url: url });
    });
  }
  if (provider.key === 'TOE') {
    $('div[id="row-viewmode"] > div > div[class~="/pi-img-shadow"]').each(function(index, element) {
      var url = $(element).attr('href');
      var key = '...';
      val.push({ key: key, url: url });
    });      
  }
  if (provider.key === 'FORBES') {
    $('h2 > span[id="2015"]').parent().next('div').find('ol > li > a:not([class])').each(function(index, element) {
      var url = $(element).attr('href');
      var key = $(element).attr('title');
      val.push({ key: key, url: url });
    });
  }
  return val;
};

var getDetailsName = function($, provider) {
  var val = '', element;
  if (provider.key === 'SGI') {
    element = $('td[id="ctl00_content_CellaNome"]');
    if (element) {
      val = $(element).text();
    }
  }
  if (provider.key === 'TOE') {
    element = $('h1[class~="titolo"]');
    if (element) {
      val = $(element).text();
    }
  }
  if (provider.key === 'FORBES') {
    element = $('h1[id="firstHeading"]').each(function(index, element) {
      val = $(element).text();
    });
  }
  return val;
};

var getDetailsZone = function($, provider) {
  var val = '', element;
  if (provider.key === 'SGI') {
    element = $('td[id="ctl00_content_CellaZona"]');
    if (element) {
      val = $(element).text();
    }
  }
  if (provider.key === 'TOE') {
    element = $('a > span > i[class="icon-location"]');
    if (element) {
      val = $(element).text();
    }
  }
  if (provider.key === 'FORBES') {
    val = '';
  }
  return val;
};

var getDetailsDescription = function($, provider) {
  var val = '', element;
  if (provider.key === 'SGI') {
    element = $('td[id="ctl00_content_CellaDescrizione"]');
    if (element) {
      val = $(element).text();
    }
  }
  if (provider.key === 'TOE') {
    element = $('p[class="annuncio"]');
    if (element) {
      val = $(element).text();
    }      
  }
  if (provider.key === 'FORBES') {
    element = $('table[class="sinottico"]').next('p');
    val = $(element).text();
  }
  return val;
};

var getDetailsPhone = function($, provider) {
  var val = '', element;
  if (provider.key === 'SGI') {
    element = $('td[id="ctl00_content_CellaTelefono"]');
    if (element) {
      val = $(element).text();
    }
  }
  if (provider.key === 'TOE') {
    element = $('span[title^="Telefono"]');
    if (element) {
      val = $(element).text();
    }
  }
  if (provider.key === 'FORBES') {
    val = '333.33333333';
  }
  return val;
};

var getDetailsPhotos = function($, provider) {
  var val = [], src;
  if (provider.key === 'SGI') {
    $('a[rel="group"][class="fancybox"]').each(function(index, element) {
      src = $(element).attr('src');
      val.push(src);
    });
  }
  if (provider.key === 'TOE') {
    $('div[id="links"] > a').each(function(index, element) {
      src = $(element).attr('src');
      val.push(src);
    });
  }
  if (provider.key === 'FORBES') {
    $('table[class="sinottico"]').find('tr').eq(1).find('a > img').each(function(index, element) {
      src = $(element).attr('src');
      val.push(src);
    });
  }
  return val;
};

var buildUrl = function(provider, config) {
  var val;
  if (provider.key === 'SGI') {
    val = provider.url + provider.categories[config.category].path + config.city;
  }
  if (provider.key === 'TOE') {
    val = provider.url + provider.categories[config.category].path;
  }
  if (provider.key === 'FORBES') {
    val = provider.url + provider.categories[config.category].path;
  }
  return val;
};

var buildDetailsUrl = function(provider, person, config) {
  var val;
  if (provider.key === 'SGI') {
    val = provider.url + provider[config.category].path + person.url;
  }
  if (provider.key === 'TOE') {
    val = provider.url + person.url;
  }
  if (provider.key === 'FORBES') {
    val = provider.url + person.url;
  }
//console.log('DETAILS URL:', val);
  return val;
};

var parseList = function($, provider) {
  var val = [];
  if (provider.key === 'SGI') {
    val = $(provider.selectors.listElements).each(function(index, element) {
      val.push($(element).attr('href'));
    });
  }
  if (provider.key === 'TOE') {
    val = $(provider.selectors.listElements).each(function(index, element) {
      val.push($(element).attr('href'));
    });
    console.log('parseList()', '-', provider.key, '-', 'details list:', val);
  }
  if (provider.key === 'NOOOFORBES') {
    $('h2 > span[id="2015"]').parent().next('div').find('ol > li > a').each(function(index, element) {
      if (!$(element).attr('class')) {
        var key = $(element).attr('title');
        var url = $(element).attr('href');
        val.push({ key: key, url: url });
      }
    });
    console.log(provider.key, 'list:', val);
  }
  return val;
};

var parseKey = function($, provider) {
  var val;
  if (provider.key === 'SGI') {
    val = $.attribs.href.substr($.attribs.href.lastIndexOf('/') + 1);
  }
  if (provider.key === 'TOE') {
    val = $.match(/id=(.*)$/)[1]; // TODO: split, to avoid error in case of non-match...
  }
  console.log('parseKey()', '-', provider.key, '-', 'key:', val);
  return val;
};

var parseUrl = function($, provider, config) {
  var val, key;
  if (provider.key === 'SGI') {
    key = $.attribs.href;
    val = (config.mode === 'fake' ? provider.urlFake : provider.url) + provider.listCategories[config.category].path + key;
  }
  if (provider.key === 'TOE') {
    key = $.match(/id=(.*)$/);
    if (key) {
      val = (config.mode === 'fake' ? provider.urlFake : provider.url) + '/annuncio?id=' + key[1];
} else { // TODO: DEBUGGING...
console.error('parseUrl()', '-', provider.key, '-', 'EMPTY DETAILS URL: $ does not match /id=(.*)$/ pattern !!!!!', '$:', $);
    }
  }
  console.log('parseUrl()', '-', provider.key, '-', 'url:', val);
  return val;
};

var parseName = function($, provider) {
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
  console.log('parseName()', '-', provider.key, '-', 'name:', val);
  return val;
};

var parseZone = function($, provider) {
  var val;
  val = $(provider.selectors.element.zone).text();
  console.log('parseZone()', '-', provider.key, '-', 'zone:', val);
  return val;
};

var parseDescription = function($, provider) { 
  var val = $(provider.selectors.element.description).text();
  if (val) {
    val
      .replace(/<br>.*$/, '') // remove trailing fixed part
      .replace(/\r+/, '') // remove CRs
      .replace(/\n+/, '\n'); // remove multiple LFs
  }
  console.log('parseDescription()', '-', provider.key, '-', 'description:', val ? val.substr(0, 32) : null);
  return val;
};

var parsePhone = function($, provider) {
  var val = $(provider.selectors.element.phone).text();
  if (val) {
    val
      .replace(/[^\d]/, '');
  }
  console.log('parsePhone()', '-', provider.key, '-', 'phone:', val);
  return val;
};

var parsePhotos = function($, provider) {
  var val = [];
  // loop to get each photo
  $(provider.selectors.element.photos).each(function(i, elem) {
    var href = elem.attribs.href;
    if (href) {
      href
        .replace(/(\.\.\/)+/, '') // remove relative paths
        .replace(/\?.*$/, ''); // remove query string
      val.push(href);
    }
  });
  //console.log('parsePhotos()', '-', provider.key, '-', 'photos:', val);
  return val;
};

var detectNationality = function(person, provider, config) {
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
            { '(america(na)?|statunitense)': 'us' },
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
      if (!field) { continue; }
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
    return '';
  }

  function parseNegativeLookbehinds(field, catPattern) {
    for (var i = 0; i < negativeLookbehinds.length; i++) {
      var negativeLookbehindObj = negativeLookbehinds[i];
      for (var lang in negativeLookbehindObj) {
        if (lang === language) {
          var negativeLookbehindPatterns = negativeLookbehindObj[lang];
          for (var j = 0; j < negativeLookbehindPatterns.length; j++) {
            var negativeLookbehindPatternObj = negativeLookbehindPatterns[j];
            for (var cat in negativeLookbehindPatternObj) {
              if (cat === category) {
                var catPatterns = negativeLookbehindPatternObj[cat];
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
};

module.exports = exports;