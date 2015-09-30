var expect = require('chai').expect;
var config = require('../config');
var Provider = require('../controllers/provider');

describe('Provider', function() {

  describe('Detect Nationality', function() {
/*
    it('null result from field with no hint', function() {
      var person = {
        name: 'Marina',
        description: 'Ricercatrice apolide.',
      };
      var nationality = provider.detectNationality(person, provider, config);
      expect(nationality).to.equal(null);
    });
*/

/*
        providers, // 1st param in async.each() is the array of items
         getAll({ type: 'persons', mode: config.mode, key: 'FORBES' }, function(err, providers) { // GET all providers
    if (err) {
      console.error('Error retrieving providers:', err);
      res.json({ error: err });
    } else {
      // loop to get list page from all providers
      async.each(
        providers, // 1st param
*/


    it('valid result from name field with "Italiana"', function() {
      var person = {
        name: 'Marina Italiana',
        description: 'Ricercatrice di Roma.',
      };
      var nationality = provider.detectNationality(person, provider, config);
      expect(nationality).to.equal('it');
    });
  });

});