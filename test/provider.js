var expect = require('chai').expect // assertion library
  , superagent = require('superagent') // small progressive client-side HTTP request library
//, sinon = require('sinon') // stubs and mocks
//, mongoose = require('mongoose') // mongodb abstaction
  , cheerio = require('cheerio') // to parse fetched DOM data
  , config = require('../config')
  , Provider = require('../controllers/provider')
  , ProviderModel = require('../models/provider');

describe('Provider', function() {

  // test exported methods /////////////////////////////////////
  var providers = config.providers;

  describe('_getAll', function() {
    it('error must be null, result must be object, its length 4', function() {
      Provider._getAll(function(err, result) {
        expect(err).to.be.null;
        expect(typeof result).to.eql('array');
        expect(result.length).to.eql(4);
        done();
      });
    });
  });

  describe('_getList', function() {

    var mockProvidersContents = [
      {
        key: 'SGI',
        contents: '        <a OnClick="get_position();" href="1">        <a OnClick="get_position();" href="2">        <a OnClick="get_position();" href="3">        ',
        count: 3,
      },
      {
        key: 'TOE',
        contents: '...',
        count: 4,
      },
      {
        key: 'FORBES',
        contents: '...',
        count: 2,
      },
    ];

    providers.forEach(function(p) {

      if (p.type !== 'persons') { return true; }

      var contents = mockProvidersContents[0].contents;
      $ = cheerio.load(contents);

      it('error must be null, result must be list, its length should be correct', function() {
        var result = Provider._getList(p, $);
        console.log('result:', result);
        expect(typeof result).to.eql('object');
        expect(result.length).to.eql(p.count);
      });

    });
  });

  describe('_detectNationality', function() {

    providers.forEach(function(p) {

      if (p.type !== 'persons') { return true; }

      it('name & decription fields with no hint', function() {
        var person = {
          name: 'Nome Cognome',
          description: 'Ricercatrice apolide.',
        };
        var nationality = Provider._detectNationality(person, p, config);
        expect(nationality).to.equal(null);
      });
  
      it('name field with "Italiana"', function() {
        var person = {
          name: 'Nome Cognome Italiana',
          description: 'Ricercatrice di Roma.',
        };
        var nationality = Provider._detectNationality(person, p, config);
        expect(nationality).to.equal('it');
      });

      it('name field with "tedesca"', function() {
        var person = {
          name: 'Nome Cognome tedesca',
          description: 'Speleologa.',
        };
        var nationality = Provider._detectNationality(person, p, config);
        expect(nationality).to.equal('de');
      });

      it('name field with "spagnola"', function() {
        var person = {
          name: 'Nome Cognome spagnola',
          description: 'Giornalista freelance.',
        };
        var nationality = Provider._detectNationality(person, p, config);
        expect(nationality).to.equal(null);
      });

      it('description field with "coreana"', function() {
        var person = {
          name: 'Nome Cognome',
          description: 'Geologa della corea del sud.',
        };
        var nationality = Provider._detectNationality(person, p, config);
        expect(nationality).to.equal('kr');
      });

      it('description field with "Spagna"', function() {
        var person = {
          name: 'Nome Cognome',
          description: 'Biologa dalla Spagna del nord.',
        };
        var nationality = Provider._detectNationality(person, p, config);
        expect(nationality).to.equal('es');
      });

      it('description field with "spagnola"', function() {
        var person = {
          name: 'Nome Cognome',
          description: 'Politica spagnola molto simpatica.',
        };
        var nationality = Provider._detectNationality(person, p, config);
        expect(nationality).to.equal(null);
      });

      it('description field with "sudamericana"', function() {
        var person = {
          name: 'Nome Cognome',
          description: 'Scrittrice noir sudamericana.',
        };
        var nationality = Provider._detectNationality(person, p, config);
        expect(nationality).to.equal('south-america');
      });

      it('description field with "Francia"', function() {
        var person = {
          name: 'Nome Cognome',
          description: 'Arredatrice dalla Francia del sud.',
        };
        var nationality = Provider._detectNationality(person, p, config);
        expect(nationality).to.equal('fr');
      });

      it('description field with "Corso Francia"', function() {
        var person = {
          name: 'Nome Cognome',
          description: 'Cuoca - Sede in Corso Francia, 300.',
        };
        var nationality = Provider._detectNationality(person, p, config);
        expect(nationality).to.equal(null);
      });

      it('description field with "Piazza Ungheria"', function() {
        var person = {
          name: 'Nome Cognome',
          description: 'Fotografa - Sede in Piazza Ungheria, 1bis.',
        };
        var nationality = Provider._detectNationality(person, p, config);
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

/*

  // test routing methods (service must be running) //////////

  var URL = 'http://localhost:3000/';

  describe('routing: getAll', function() {

    it('routing: getAll', function(done) {
      superagent.get(URL + 'providers/')
      .end(function(e, res) {
        //console.log(res.body);
        expect(e).to.eql(null);
        expect(typeof res.body).to.eql('object');
        var n = 0;
        res.body.forEach(function(p) {
          expect(p._id.length).to.eql(24);
          n++;
        });
        expect(n).to.eql(4);
        done();
      });
    });
  
  });
*/
});