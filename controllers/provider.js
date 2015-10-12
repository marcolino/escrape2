var mongoose = require('mongoose') // mongo abstraction
  , cheerio = require('cheerio') // to parse fetched DOM data
  , async = require('async') // to call many async functions in a loop
  , fs = require('fs') // file-system handling
  , network = require('../controllers/network') // network handling
  , image = require('../controllers/image') // network handling
  //, status = require('../controllers/status') // controller of provider logging
  , config = require('../config') // global configuration
  , Provider = require('../models/provider') // model of provider
  , Person = require('../models/person') // model of person
  //, Status = require('../models/status') // model of status
//  , logger = require('simple-node-logger')
;

var privat = {}; // devine private objects container
//var log = logger.createSimpleLogger(config.logger); // create a simple logger
var log = config.log;

mongoose.connection.on('open', function() {
  // create providers
  privat.createProviders(config.providers, function(err) {
    if (err) {
      return console.error('Error creating providers:', err);
    }
  });
});

exports.getAll = function(request, callback) { // GET all providers
  //console.log('C req:', request);
  //console.log('res:', res);
  privat.getAll(function(err, providers) {
    if (err) {
      console.error('Error retrieving providers:', err);
      callback(err);
    } else {
      callback(null, providers);
    }
  });
};

// TODO: move to persons controller...
exports.syncPersons = function(req, res) { // sync persons
  var providersPersonsCount = 0;
  var retrievedPersonsCount = 0;
  var syncStartDate = new Date(); // start of this sync date
  var resource;

  // return immedately, log progress to db
  res.json('persons sync started');
  //status.info('persons sync started');
  //log.info('subscription to ', channel, ' accepted at ', new Date().toJSON());
  log.info('persons sync started');

  privat.getAll({ type: 'persons', mode: config.mode/*, key: 'TOE'*/ }, function(err, providers) { // GET all providers
    if (err) {
      log.error('error syncing providers: ', err);
      //res.json({ error: err });
      //log('error syncing providers:', err);
    } else {
      /*
       * providers are expected to publish a main page containing
       * a list with each person link, pointing to each person detail page
       */
      // loop to get list page from all providers
      async.each(
        providers, // 1st param in async.each() is the array of items
        function(provider, callbackOuter) { // 2nd param is the function that each item is passed to
          //console.log('provider:', provider.key);
          resource = {
            url: privat.buildListUrl(provider, config),
            type: 'text',
            etag: null
          };
          console.log('list resource.url:', resource.url);
          network.requestRetryAnonymous(
            resource,
            function(err) { // error
              console.error('Error syncing provider', provider.key + ':', err);
              return callbackOuter(); // skip this outer loop
            },
            function(contents) { // success
              console.log('url', resource.url, 'contents lenght is', contents.length);
              if (contents.length < 10000) {
                console.error('!!!!!!!!!!!! SHORT LIST (SHOULD NOT HAPPEN ANYMORE...):', contents.toString());
              }
              if (!contents) {
                console.warn('Error syncing provider', provider.key + ':', 'empty contents', '-', 'skipping');
                return callbackOuter(); // skip this outer loop
              }
              $ = cheerio.load(contents);
              var list = privat.getList(provider, $);
              providersPersonsCount += list.length;
              //async.eachLimit(
              async.each(
                list, // 1st param is the array of items
                //provider.limit, // 2nd param is a limit (ms) to throttle requests rate
                function(element, callbackInner) { // 3nd param is the function that each item is passed to
                  var person = {};
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
                  resource = {
                    url: privat.buildDetailsUrl(provider, person, config),
                    type: 'text'
                    //etag: null,
                  };
                  console.log('details resource.url:', resource.url);
                  network.requestRetryAnonymous(
                    resource,
                    function(err) {
                      console.warn(
                        'Error syncing provider', provider.key + ',',
                        'person', person.key + ':',
                        err, '-', 'skipping'
                      );
                      return callbackInner(); // skip this inner loop
                    },
                    function(contents) {

                      //console.log('content of page of person', person.key, 'is long', contents.length);
                      if (!contents) {
                        console.warn(
                          'Error syncing provider', provider.key + ',',
                          'person', person.key + ':',
                          'empty contents', '-', 'skipping'
                        );
                        return callbackInner(); // skip this inner loop
                      }
                      $ = cheerio.load(contents);
                      person.name = privat.getDetailsName($, provider);
                      //if (!person.name) {
                      //  console.log('person', person.key, 'name is EMPTY!!! contents:', contents);
                      //  callbackOuter();
                      //  return;
                      //}
                      person.zone = privat.getDetailsZone($, provider);
                      person.description = privat.getDetailsDescription($, provider);
                      person.phone = privat.getDetailsPhone($, provider);
                      person.imageUrls = privat.getDetailsImageUrls($, provider);
                      person.nationality = privat.detectNationality(person, provider, config);
                      person.providerKey = provider.key;
                      person.dateOfLastSync = new Date();
                      // TODO: why we get here when requestRetryAnonymous() is retrying (and person.name is empty)???

                      // save this person to database
                      //console.log('PERSON:', person);
                      /*
                      Person.findOneAndUpdate(
                        { providerKey: provider.key, key: person.key }, // query
                        person,
                        { upsert: true },
                        //{ $setOnInsert: { dateOfFirstSync: new Date() } }, // if inserting, set dateOfFirstSync to now
                        function(err, doc) {
                          if (err) {
                            console.warn('Error saving person', person.name + ':', err, '-', 'skipping');
                          } else {
                            console.log('DOC:', doc);
                            person.id = doc.id; // get upserted object id
                            retrievedPersonsCount++;
                            console.log(retrievedPersonsCount + ' / ' + providersPersonsCount);
                            console.log(person.providerKey, person.key, (person.name ? '[' + person.name + ']' : ''));

                            // sync this person images, too
                            image.syncPersonImages(person, function(err) {
                              if (err) {
                                return console.error('Error retrieving images for person',
                                  provider.key, person.key + ':', err
                                );
                              }
                              //console.log('person images sync\'d');
                            });
                          }

                          // wait some time to avoid overloading provider - TODO: DO WE NEED THIS?
                          //setTimeout(function () {
                          callbackInner();
                          //}, 7 * 1000); //provider.limit
                          //callbackInner();
                        }
                      );
                      */
                      Person.findOne(
                        { providerKey: provider.key, key: person.key }, // query
                        function(err, doc) {
                          if (err) {
                            console.warn('Error finding person', person.name + ':', err, '-', 'skipping');
                            callbackInner();
                          } else {
                            var isNew;
                            if (doc) { // person did already exist
                              isNew = false;
                              doc.dateOfLastSync = person.dateOfLastSync;
                            } else { // person did not exist before
                              isNew = true;
                              doc = new Person();
                              doc.url = person.url;
                              doc.key = person.key;
                              doc.providerKey = person.providerKey;
                              doc.name = person.name;
                              doc.description = person.description;
                              doc.phone = person.phone;
                              doc.imageUrls = person.imageUrls;
                              doc.nationality = person.nationality;
                              doc.dateOfLastSync = person.dateOfLastSync;
                            }
                            //doc.status = request.status;
                            doc.save(function(err) {
                              if (err) {
                                console.log('Error: could not save person', doc.key);
                              } else {
                                //console.log('person', doc.key, 'created at',
                                //  doc.createdAt, ' updated at ', doc.updatedAt);
                                console.log('person', doc.key, (isNew ? 'created' : 'updated'));
                                retrievedPersonsCount++;
                              }

                              callbackInner();
                            });
                          }
                        }
                      );

                    }
                  );
                },
                function(err) { // 4th param is the function to call when everything's done (inner callback)
                  if (err) {
                    return console.error('Error in the final inner async callback:', err, '\n',
                      'One of the iterations produced an error.\n',
                      'Skipping this iteration.'
                    );
                  }
                  callbackOuter(); // signal this inner loop is finished
                  console.log('Finished persons sync');
                  // all tasks are successfully done now
                }
              );
            }
          );
        },
        function(err) { // 3rd param is the function to call when everything's done (outer callback)
          console.log('outer callback finished');
          if (err) {
            console.error('Error in the final outer async callback:', err, '\n',
              'One of the iterations produced an error.\n',
              'All processing will now stop.'
            );
            // TODO: set error status to DB
            //return res.json(-1);
          }

          // set activity status
          privat.setActivityStatus(syncStartDate, function(err) {
            if (err) {
              return console.error('Error setting activity status:', err);
            }
            // all tasks are successfully done now
            log.info('persons sync finished: ', retrievedPersonsCount, ' persons found');
          });

        }
      );
    }
  });

};

privat.setActivityStatus = function(syncStartDate, callback) {
  privat.presenceReset(function(err) {
    if (err) {
      return callback(err);
    }
    privat.presenceSet(syncStartDate, callback);
  });
};

// set persons present flag to false
privat.presenceReset = function(callback) {
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
privat.presenceSet = function(syncStartDate, callback) {
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

exports.syncComments = function(/*req*/) { // sync comments
  // TODO
};

exports.syncPlaces = function(/*req*/) { // sync persons
  // ... parsePlaces($, provider, config);

  function parsePlaces(/*$, provider, config*/) {
    var val = {};
    /*
    if (provider.key === 'SGI') {
      $(provider.listCategories[config.category].selectors.category + ' > ul > li > a').each(function() {
        var region = $(this).text();
        var city = $(this).next('ul').find('li a').map(function() {
          return $(this).text();
        }).get();
        val[region] = city;
      });
    }
    */
    return val;
  }
};

/*
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
*/

privat.createProviders = function(providers, callback) {
  // populate model (remove ad create)
  collectionExists('Provider', function(exists) {
    if (exists) {
      if (config.env === 'development') {
        console.log('Provider collection exists, environment is development: re-creating providers');
        remove(function(err) {
          if (err) {
            return callback(err);
          }
          create(providers, function(err) {
            callback(err);
          });
        });
      }
    } else {
      console.log('Provider collection does not exist: creating providers');
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

  function collectionExists(collectionName, callback) {
    privat.getAll(function(err, providers) {
      if (err) {
        return callback(false);
      } else {
        callback(providers.length > 0);
      }
    });
  }

};

privat.getAll = function(filter, result) { // get all providers
  Provider.find(filter, function(err, providers) {
    result(err, providers);
  });
};

privat.getList = function(provider, $) {
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
  return val;
};

privat.buildListUrl = function(provider, config) {
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
  return val;
};

privat.buildDetailsUrl = function(provider, person, config) {
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
  return val;
};

/* TODO: do we need this method?
var privat.buildImageUrl = function(provider, person, config) {
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
  return val;
};
*/

privat.getDetailsName = function($, provider) {
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
    element = $('h1[id="firstHeading"]').each(function(index, element) {
      val = $(element).text();
    });
  }
  if (val) {
    val = val
      .replace(/\s+/g, ' ') // squeeze duplicated spaces
      .replace(/^\s+/, '') // remove leading spaces
      .replace(/\s+$/, ''); // remove trailing spaces
  }
  return val;
};

privat.getDetailsZone = function($, provider) {
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

privat.getDetailsDescription = function($, provider) {
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
  return val;
};

privat.getDetailsPhone = function($, provider) {
  var val = null, element;
  if (provider.key === 'SGI') {
    element = $('td[id="ctl00_content_CellaTelefono"]');
    if (element) {
      val = $(element).text();
    }
    if (val === 'In arrivo dopo le vacanze !!') {
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
    if (val) {
      val = val.replace(/[^\d]/, '');
    }
  }
  return val;
};

privat.getDetailsImageUrls = function($, provider) {
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
  return val;
};

privat.detectNationality = function(person, provider, config) {
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

/**
 * when developing, export also privat functions,
 * prefixed with '_' character,
 * to be able to unit test them
 */
if (config.env === 'development') {
  exports.privat = {};
  for (var method in privat) {
    exports.privat[method] = privat[method];
  }
}

module.exports = exports;
