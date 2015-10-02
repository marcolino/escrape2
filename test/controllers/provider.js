var expect = require('chai').expect // assertion library
  , superagent = require('superagent') // small progressive client-side HTTP request library
//, sinon = require('sinon') // stubs and mocks
//, mongoose = require('mongoose') // mongodb abstaction
  , cheerio = require('cheerio') // to parse fetched DOM data
  , config = require('../../config')
  , Provider = require('../../controllers/provider')
  , ProviderModel = require('../../models/provider');

describe('controllers - provider', function() {

  // test private methods /////////////////////////////////////
  var providers = config.providers;

  describe('private.getAll', function() {
    it('error must be null, result must be object, its length 4', function() {
      Provider.private.getAll(function(err, result) {
        expect(err).to.be.null;
        expect(typeof result).to.eql('array');
        expect(result.length).to.eql(4);
        done();
      });
    });
  });

  describe('private.getList', function() {

    var mockProviders = {
      'SGI': {
        contents: '\
          <a OnClick="get_position();" href="annuncio/1">\
          <a OnClick="get_position();" href="annuncio/2">\
          <a OnClick="get_position();" href="annuncio/3">\
        ',
        count: 3,
      },
      'TOE': {
        contents: '\
          <div id="row-viewmode">\
            <div class="esclist-item other-class">\
              <div>\
                <a href="annuncio?id=1">A</a>\
                <a href="annuncio?id=2">B</a>\
                <a href="annuncio?id=3">C</a>\
                <a href="annuncio?id=4">D</a>\
              </div>\
            </div>\
          </div>\
        ',
        count: 4,
      },
      'FORBES': {
        contents: '\
          <h2>\
            <span id="2015"></span>\
          </h2>\
          <div>\
            <ol>\
              <li><a href="1" title="Person A"></a></li>\
              <li><a href="1bis" title="Person 1bis" class="ignore me"></a></li>\
              <li><a href="2" title="Person B"></a></li>\
              <li><a href="3" title="Person C"></a></li>\
              <li><a href="4" title="Person D"></a></li>\
              <li><a href="5" title="Person E"></a></li>\
            </ol>\
          </div>\
        ',
        count: 5,
      },
    };

    providers.forEach(function(p) {

      if (p.type !== 'persons') { return true; }
      var contents = mockProviders[p.key].contents;

      it('result must be object, its length should be ' + mockProviders[p.key].count + ', for provider key "' + p.key + '"', function() {
        $ = cheerio.load(contents);
        var result = Provider.private.getList(p, $);
        expect(typeof result).to.eql('object');
        expect(result.length).to.eql(mockProviders[p.key].count);
      });

    });
  });

  describe('private.detectNationality', function() {

    providers.forEach(function(p) {

      if (p.type !== 'persons') { return true; }

      it('name & decription fields with no hint', function() {
        var person = {
          name: 'Nome Cognome',
          description: 'Ricercatrice apolide.',
        };
        var nationality = Provider.private.detectNationality(person, p, config);
        expect(nationality).to.equal(null);
      });
  
      it('name field with "Italiana"', function() {
        var person = {
          name: 'Nome Cognome Italiana',
          description: 'Ricercatrice di Roma.',
        };
        var nationality = Provider.private.detectNationality(person, p, config);
        expect(nationality).to.equal('it');
      });

      it('name field with "tedesca"', function() {
        var person = {
          name: 'Nome Cognome tedesca',
          description: 'Speleologa.',
        };
        var nationality = Provider.private.detectNationality(person, p, config);
        expect(nationality).to.equal('de');
      });

      it('name field with "spagnola"', function() {
        var person = {
          name: 'Nome Cognome spagnola',
          description: 'Giornalista freelance.',
        };
        var nationality = Provider.private.detectNationality(person, p, config);
        expect(nationality).to.equal(null);
      });

      it('description field with "coreana"', function() {
        var person = {
          name: 'Nome Cognome',
          description: 'Geologa della corea del sud.',
        };
        var nationality = Provider.private.detectNationality(person, p, config);
        expect(nationality).to.equal('kr');
      });

      it('description field with "Spagna"', function() {
        var person = {
          name: 'Nome Cognome',
          description: 'Biologa dalla Spagna del nord.',
        };
        var nationality = Provider.private.detectNationality(person, p, config);
        expect(nationality).to.equal('es');
      });

      it('description field with "spagnola"', function() {
        var person = {
          name: 'Nome Cognome',
          description: 'Politica spagnola molto simpatica.',
        };
        var nationality = Provider.private.detectNationality(person, p, config);
        expect(nationality).to.equal(null);
      });

      it('description field with "sudamericana"', function() {
        var person = {
          name: 'Nome Cognome',
          description: 'Scrittrice noir sudamericana.',
        };
        var nationality = Provider.private.detectNationality(person, p, config);
        expect(nationality).to.equal('south-america');
      });

      it('description field with "Francia"', function() {
        var person = {
          name: 'Nome Cognome',
          description: 'Arredatrice dalla Francia del sud.',
        };
        var nationality = Provider.private.detectNationality(person, p, config);
        expect(nationality).to.equal('fr');
      });

      it('description field with "Corso Francia"', function() {
        var person = {
          name: 'Nome Cognome',
          description: 'Cuoca - Sede in Corso Francia, 300.',
        };
        var nationality = Provider.private.detectNationality(person, p, config);
        expect(nationality).to.equal(null);
      });

      it('description field with "Piazza Ungheria"', function() {
        var person = {
          name: 'Nome Cognome',
          description: 'Fotografa - Sede in Piazza Ungheria, 1bis.',
        };
        var nationality = Provider.private.detectNationality(person, p, config);
        expect(nationality).to.equal(null);
      });

    });
  });

/*
  // test model methods ////////////////////////////////////
  describe('model: modelMetod', function() {

    it('example of test of model method', function() {
      // mocking MongoDB
      sinon.stub(ProviderModel, 'modelMethod').yields(null, [ 'a', 'b', 'z' ]);
    
      // calling the test case
      Provider.modelMethod(function(err, result) {
        expect(err).to.be.null;
        expect(typeof result).to.eql('array');
        expect(result.length).to.eql(3);
        done(); // as this test is asynchronous we have to tell mocha that it is finished
      });
    });

  });
*/
});