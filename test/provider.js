var expect = require('chai').expect;
var config = require('../config');
var provider = require('../controllers/provider');

describe('Provider', function() {

  // all languages for providers
  var providers = [
    {
      language: 'it',
    }
  ];

  describe('Detect Nationality', function() {

    providers.forEach(function(p) {

      it('name & decription fields with no hint', function() {
        var person = {
          name: 'Marina',
          description: 'Ricercatrice apolide.',
        };
        var nationality = provider.detectNationality(person, p, config);
        expect(nationality).to.equal(null);
      });
  
      it('name field with "Italiana"', function() {
        var person = {
          name: 'Marina Italiana',
          description: 'Ricercatrice di Roma.',
        };
        var nationality = provider.detectNationality(person, p, config);
        expect(nationality).to.equal('it');
      });

      it('name field with "tedesca"', function() {
        var person = {
          name: 'Roberta tedesca',
          description: 'Speleologa.',
        };
        var nationality = provider.detectNationality(person, p, config);
        expect(nationality).to.equal('de');
      });

      it('name field with "spagnola"', function() {
        var person = {
          name: 'Francesca spagnola',
          description: 'Giornalista freelance.',
        };
        var nationality = provider.detectNationality(person, p, config);
        expect(nationality).to.equal(null);
      });

      it('description field with "coreana"', function() {
        var person = {
          name: 'Yu shin riu',
          description: 'Massaggiatrice della corea del sud.',
        };
        var nationality = provider.detectNationality(person, p, config);
        expect(nationality).to.equal('kr');
      });

      it('description field with "Spagna"', function() {
        var person = {
          name: 'Nome cognome',
          description: 'Biologa dalla Spagna del nord.',
        };
        var nationality = provider.detectNationality(person, p, config);
        expect(nationality).to.equal('es');
      });

      it('description field with "spagnola"', function() {
        var person = {
          name: 'Nome cognome',
          description: 'Biologa spagnola molto simpatica.',
        };
        var nationality = provider.detectNationality(person, p, config);
        expect(nationality).to.equal(null);
      });

      it('description field with "sudamericana"', function() {
        var person = {
          name: 'Nome cognome',
          description: 'Scrittrice noir sudamericana.',
        };
        var nationality = provider.detectNationality(person, p, config);
        expect(nationality).to.equal('south-america');
      });

      it('description field with "Francia"', function() {
        var person = {
          name: 'Nome cognome',
          description: 'Arredatrice dalla Francia del sud.',
        };
        var nationality = provider.detectNationality(person, p, config);
        expect(nationality).to.equal('fr');
      });

      it('description field with "Corso Francia"', function() {
        var person = {
          name: 'Nome cognome',
          description: 'Arredatrice - Sede in Corso Francia, 300.',
        };
        var nationality = provider.detectNationality(person, p, config);
        expect(nationality).to.equal(null);
      });

      it('description field with "Piazza Ungheria"', function() {
        var person = {
          name: 'Nome cognome',
          description: 'Fotografa - Sede in Piazza Ungheria, 1bis.',
        };
        var nationality = provider.detectNationality(person, p, config);
        expect(nationality).to.equal(null);
      });

    });

  });

});