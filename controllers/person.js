var mongoose = require('mongoose') // mongo abstraction
  , cheerio = require('cheerio') // to parse fetched DOM data
  , async = require('async') // to call many async functions in a loop
  , fs = require('fs') // file-system handling
  , _ = require('lodash') // lo-dash utilities
  , network = require('../controllers/network') // network handling
  , image = require('../controllers/image') // network handling
  , provider = require('./provider') // provider's controller
  , Person = require('../models/person') // model of person
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

/**
 * sync persons from providers
 */
exports.sync = function(req, res) { // sync persons
  var retrievedPersonsCount = 0;
  var syncStartDate = new Date(); // start of this sync date
  var resource;
  
  // return immedately, log progress to db
  var message = 'persons sync started';
  res.json(message);
  log.info(message);

  /**
   * get all providers
   *
   * providers are expected to publish a main page containing
   * a list with each person link, pointing to each person detail page
   */
  provider.getAll({ type: 'persons', mode: config.mode, key: /.*/ }, function(err, providers) {
    if (err) {
      return log.error('error getting providers: ', err);
    }

    // loop to get list page from all providers
    async.each(
      providers, // 1st param in async.each() is the array of items
      function(provider, callbackOuter) { // 2nd param is the function that each item is passed to
        //log.info('provider: ', provider.key);
        resource = {
          url: local.buildListUrl(provider, config),
          type: 'text',
          etag: null
        };
        log.info('list resource.url: ', resource.url);
        network.requestRetryAnonymous(
          resource,
          function(err) { // error
            log.warn(
              'error syncing provider ', provider.key, ': ',
              err, ', ', 'skipping'
            );
            return callbackOuter(); // skip this outer loop
          },
          function(contents) { // success
            //log.info('contents lenght is ', contents.length);
            if (!contents) {
              log.warn(
                'error syncing provider ', provider.key, ': ',
                'empty contents', ', ', 'skipping'
              );
              return callbackOuter(); // skip this outer loop
            }
            $ = cheerio.load(contents);
            var list = local.getList(provider, $);
            //list = list.slice(0, 1); // to debug: limit lists to one element
            //log.info('list:', list);
            async.each(
              list, // 1st param is the array of items
              function(element, callbackInner) { // 3nd param is the function that each item is passed to
                var person = {}; // create person object
                person.url = element.url;
                if (!person.url) {
                  log.warn(
                    'error syncing provider ', provider.key, ', ',
                    'person with no url', ', ', 'skipping'
                  );
                  return callbackInner(); // skip this inner loop
                }
                person.key = element.key;
                if (!person.key) {
                  log.warn(
                    'error syncing provider ', provider.key, ', ',
                    'person with no key', ', ', 'skipping'
                  );
                  return callbackInner(); // skip this inner loop
                }
                resource = {
                  url: local.buildDetailsUrl(provider, person, config),
                  type: 'text'
                  //etag: null,
                };
                network.requestRetryAnonymous(
                  resource,
                  function(err) {
                    log.warn(
                      'syncing person ', provider.key, '', person.key, ':',
                      err, ', ', 'skipping'
                    );
                    return callbackInner(); // skip this inner loop
                  },
                  function(contents) {
                    //console.log('content of page of person', person.key, 'is long', contents.length);
                    if (!contents) {
                      log.warn(
                        'syncing provider ', provider.key, ',',
                        'person ', person.key, ':',
                        'empty contents', ', ', 'skipping'
                      );
                      return callbackInner(); // skip this inner loop
                    }
                    $ = cheerio.load(contents);
                    person.name = local.getDetailsName($, provider);
                    if (!person.name) { // should not happen...
                      log.warn('person', person.key, 'name is empty');
                      return callbackOuter();
                    }
                    person.zone = local.getDetailsZone($, provider);
                    person.description = local.getDetailsDescription($, provider);
                    person.phone = local.getDetailsPhone($, provider);
                    person.nationality = local.detectNationality(person, provider, config);
                    person.providerKey = provider.key;
                    person.dateOfLastSync = new Date();
                    person._imageUrls = local.getDetailsImageUrls($, provider);
                    
                    // sync this person images
                    image.syncPersonImages(person, function(err, person) {
                      if (err) {
                        // ignore this person images error to continue with person save
                        log.warn('error in sync person images:', err);
                      }
//log.info('persons.sync, syncPersonImages returned, person.showcaseBasename is ', person.showcaseBasename);

                      // save this person to database
                      local.upsert(person, function(err) {
                        if (err) {
                          // ignore this person error to continue with other persons
//log.warn('can\'t upsert person person ', person.providerKey, ' ', person.key);
                        } else {
                          retrievedPersonsCount++;
                          log.info('person ', person.providerKey, ' ', person.key, ' sync\'d');
                        }
                        callbackInner(); // this person is done
                      });
                    });
                  }
                );
              },
              function(err) { // 4th param is the function to call when everything's done (inner callback)
                if (err) {
                  log.warn(
                    'some error in the final inner async callback:', err,
                    'one of the iterations produced an error: ', 'skipping this iteration'
                  );
                }
                callbackOuter(); // signal this inner loop is finished
                log.info('finished persons sync for provider ', provider.key);
              }
            );
          }
        );
      },
      function(err) { // 3rd param is the function to call when everything's done (outer callback)
        if (err) {
          return log.error(
            'some error in the final outer async callback:', err,
            'one of the iterations produced an error: ', 'all further processing will now stop'
          );
        }
        log.info('finished persons sync for all providers');

        // set activity status
        local.setActivityStatus(syncStartDate, function(err) {
          if (err) {
            return log.error('error setting activity status:', err);
          }
          log.info('persons sync finished: ', retrievedPersonsCount.toString(), ' persons found');
        });

      }
    );
  });
};

local.upsert = function(person, callback) {
  Person.findOne(
    { providerKey: person.providerKey, key: person.key }, // query
    function(err, doc) {
      if (err) {
        log.warn('could not find person ', person.name, ':', err, ', ', 'skipping');
        callback(err);
      } else {
        var isNew;
        if (doc) { // person did already exist
          isNew = false;
          doc.dateOfLastSync = person.dateOfLastSync;
_.merge(doc, person); // to set new fields... TODO: keep this? does this impacts on performance?
        } else { // person did not exist before
          isNew = true;
          doc = new Person();
          _.merge(doc, person);
        }
        doc.save(function(err) {
          if (err) {
            log.warn('could not save person ', doc.providerKey, ' ', doc.key, ':', err, ', ', 'skipping');
            return callback(err);
          }
          callback(null);
        });
      }
    }
  );
};

local.setActivityStatus = function(syncStartDate, callback) {
  local.presenceReset(function(err) {
    if (err) {
      return callback(err);
    }
    local.presenceSet(syncStartDate, callback);
  });
};

// set persons present flag to false
local.presenceReset = function(callback) {
  Person
    .update({}, { $set: { isPresent: false } }, { multi: true }, function(err, count) {
      if (err) {
        console.warn('Error resetting persons activity status:', err);
        return callback(err);
      }
      if (count.n <= 0) {
        console.warn('no person has been reset');
      } else {
        console.log(count.n + ' persons present flag reset');
      }
      callback(null);
    })
  ;
};

// set persons present flag according to date of last sync
local.presenceSet = function(syncStartDate, callback) {
  // set just sync'd persons as present
  //console.log('updating persons isPresent flag to true for persons with datOfLastSync $gte than', syncStartDate);
  Person
    .where('dateOfLastSync').gte(syncStartDate)
    .update({}, { $set: { isPresent: true } }, { multi: true }, function(err, count) {
      if (err) {
        console.warn('Error setting persons activity status:', err);
        return callback(err);
      }
      if (count.n <= 0) {
        console.warn('no person is present');
      } else {
        console.log(count.n + ' persons present flag asserted');
      }
      callback(null);
    })
  ;
};

local.getList = function(provider, $) {
  var val = [];
  if (provider.key === 'SGI') {
    $('a[OnClick="get_position();"]').each(function(index, element) {
      var url = $(element).attr('href');
      if (url.match(/annuncio\//)) {
        var key = url.replace(/annuncio\/(.*?)/, '$1');
        val.push({ key: key, url: url });
      }
    });
  }
  if (provider.key === 'TOE') {
    $('div[id="row-viewmode"]').find('div[class^="esclist-item"] > div > a').each(function(index, element) {
      var url = $(element).attr('href');
      if (url.match(/annuncio\?id=/)) {
        var key = url.replace(/\.\/annuncio\?id=(.*)/, '$1');
        val.push({ key: key, url: url });
      }
    });
  }
  if (provider.key === 'FORBES') {
    $('h2 > span[id="2015"]').parent().next('div').find('ol > li > a:not([class])').each(function(index, element) {
      var url = $(element).attr('href');
      var key = $(element).attr('title');
      val.push({ key: key, url: url });
    });
  }
  if (provider.key === 'TEST') {
    $('ol > li a').each(function(index, element) {
      var url = $(element).attr('href');
      var key = $(element).attr('title');
      val.push({ key: key, url: url });
    });
  }
  return val;
};

local.buildListUrl = function(provider, config) {
  var val;
  if (provider.key === 'SGI') {
    val = provider.url + provider.categories[config.category].path + '/' + config.city;
  }
  if (provider.key === 'TOE') {
    val = provider.url + provider.categories[config.category].path;
  }
  if (provider.key === 'FORBES') {
    val = provider.url + provider.categories[config.category].path;
  }
  if (provider.key === 'TEST') {
    val = provider.url + provider.categories[config.category].path;
  }
  return val;
};

local.buildDetailsUrl = function(provider, person, config) {
  var val;
  if (provider.key === 'SGI') {
    val = provider.url + provider.categories[config.category].path + '/' + person.url;
  }
  if (provider.key === 'TOE') {
    val = provider.url + '/' + person.url;
  }
  if (provider.key === 'FORBES') {
    val = provider.url + person.url;
  }
  if (provider.key === 'TEST') {
    val = provider.url + person.url;
  }
  return val;
};

local.getDetailsName = function($, provider) {
  var val, element;
  if (provider.key === 'SGI') {
    element = $('td[id="ctl00_content_CellaNome"]');
    if (element) {
      val = $(element).text();
    }
  }
  if (provider.key === 'TOE') {
    //element = $('h1[class~="titolo"]');
    element = $('span[class~="lead-20"] > span');
    if (element) {
      val = $(element).attr('title');
      if (val) {
        val = val.replace(/^Telefono Escort (.*?):.*$/, '$1');
      }
    }
  }
  if (provider.key === 'FORBES') {
    /*
    element = $('h1[id="firstHeading"]').each(function(index, element) {
      val = $(element).text();
    });
    */
    element = $('h1[id="firstHeading"]');
    if (element) {
      val = $(element).text();
    }
  }
  if (provider.key === 'TEST') {
    val = 'TEST name';
  }
  if (val) {
    val = val
      .replace(/\s+/g, ' ') // squeeze duplicated spaces
      .replace(/^\s+/, '') // remove leading spaces
      .replace(/\s+$/, ''); // remove trailing spaces
  }
  return val;
};

local.getDetailsZone = function($, provider) {
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
  if (provider.key === 'TEST') {
    val = '';
  }
  return val;
};

local.getDetailsDescription = function($, provider) {
  var val = '', element;
  if (provider.key === 'SGI') {
    element = $('td[id="ctl00_content_CellaDescrizione"]');
    if (element) {
      val = $(element).text();
      if (val) {
        val = val
          .replace(/<br>.*$/, '') // remove trailing fixed part
          .replace(/\r+/, '') // remove CRs
          .replace(/\n+/, '\n') // remove multiple LFs
        ;
      }
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
  if (provider.key === 'TEST') {
    val = 'TEST description';
  }
  return val;
};

local.getDetailsPhone = function($, provider) {
  var val = null, element;
  if (provider.key === 'SGI') {
    element = $('td[id="ctl00_content_CellaTelefono"]');
    if (element) {
      val = $(element).text();
    }
    if (
      (val === 'In arrivo dopo le vacanze !!') ||
      (val === 'Telefono momentaneamente non disponibile')
    ) {
      //person.unavailable = true; // TODO: set person's 'unavailble' field to true...
      val = null;
    }
    if (val) {
      val = val.replace(/[^\d]/, '');
    }
  }
  if (provider.key === 'TOE') {
    element = $('span[title^="Telefono"]');
    if (element) {
      val = $(element).text();
    }
    if (val === 'In arrivo dopo le vacanze !!') { // TODO: set it from TOE source...
      //person.unavailable = true; // TODO: set person's 'unavailble' field to true...
      val = null;
    }
    if (val) {
      val = val.replace(/[^\d]/, '');
    }
  }
  if (provider.key === 'FORBES') {
    val = '333.33333333';
  }
  if (provider.key === 'TEST') {
    val = '444.44444444';
  }
  return val;
};

local.getDetailsImageUrls = function($, provider) {
  var val = [];
  if (provider.key === 'SGI') {
    $('a[rel="group"][class="fancybox"]').each(function(index, element) {
      href = $(element).attr('href');
      if (href) {
        href = href
          .replace(/\.\.\//g, '')
          .replace(/\?t=.*/, '')
        ;
      }
      href = provider.url + '/' + href;
      val.push(href);
    });
  }
  if (provider.key === 'TOE') {
    $('div[id="links"]').find('a').each(function(index, element) {
      href = $(element).attr('href');
      href = provider.url + '/' + href;
      val.push(href);
    });
  }
  if (provider.key === 'FORBES') {
    $('table[class="sinottico"]').find('tr').eq(1).find('a > img').each(function(index, element) {
      href = 'http:' + $(element).attr('src'); // TODO: do not add 'http', make network.request work without schema...
      val.push(href);
    });
  }
  if (provider.key === 'TEST') {
    // no images for test
  }
  return val;
};

local.detectNationality = function(person, provider, config) {
  var fields = [
    person.name,
    person.description
  ];
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
            { 'sud[\s-]?america(na)?': 'south-america' }
          ]
        }
      ]
    }
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
            'zona'
          ]
        }
      ]
    }
  ];

  return parseNationalityPatterns();

  function parseNationalityPatterns() {
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (!field) { continue; }
      for (var j = 0; j < nationalityPatterns.length; j++) {
        var patternObj = nationalityPatterns[j];
        for (var lang in patternObj) {
          if (lang === provider.language) {
            var langPatterns = patternObj[lang];
            for (var k = 0; k < langPatterns.length; k++) {
              var langPatternObj = langPatterns[k];
              for (var cat in langPatternObj) {
                if (cat === config.category) {
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
    return null;
  }

  function parseNegativeLookbehinds(field, catPattern) {
    for (var i = 0; i < negativeLookbehinds.length; i++) {
      var negativeLookbehindObj = negativeLookbehinds[i];
      for (var lang in negativeLookbehindObj) {
        if (lang === provider.language) {
          var negativeLookbehindPatterns = negativeLookbehindObj[lang];
          for (var j = 0; j < negativeLookbehindPatterns.length; j++) {
            var negativeLookbehindPatternObj = negativeLookbehindPatterns[j];
            for (var cat in negativeLookbehindPatternObj) {
              if (cat === config.category) {
                var catPatterns = negativeLookbehindPatternObj[cat];
                for (var k = 0; k < catPatterns.length; k++) {
                  var negativeLookbehind = catPatterns[k];
                  var regexNegativeLookbehind =
                    new RegExp('\\b' + negativeLookbehind + '\\s+' + catPattern + '\\b', 'gi');
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

exports.getAll = function(req, res) { // get all persons
  local.get({}, function(err, persons) {
    if (err) {
      console.error('Error retrieving persons:', err);
      res.json({ error: err });
    } else {
      //console.log('persons.getAll: ' + persons);
      res.json(persons);
    }
  });
};

exports.getById = function(req, res) { // get person
  local.get({ _id: req._id }, function(err, persons) {
    if (err) {
      console.error('Error retrieving persons by id:', err);
      res.json({ error: err });
    } else {
      //console.log('persons.getById: ' + person);
      res.json(persons);
    }
  });
};

exports.getByPhone = function(req, res) { // get person
  local.get({ phone: req.phone }, function(err, persons) {
    if (err) {
      console.error('Error retrieving persons by phone:', err);
      res.json({ error: err });
    } else {
      //console.log('persons.getByPhone: ' + person);
      res.json(persons);
    }
  });
};

local.get = function(filter, result) { // get person
  mongoose.model('Person').find(filter, function(err, persons) {
    result(err, persons);
  });
};

/**
 * when developing, expose also private functions,
 * prefixed with '_' character,
 * to be able to unit test them
 */
if (config.env === 'development') {
  exports.local = {};
  for (var method in local) {
    exports.local[method] = local[method];
  }
}

module.exports = exports;
