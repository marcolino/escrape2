var expect = require('chai').expect // assertion library
  , superagent = require('superagent') // small progressive client-side HTTP request library
  , sinon = require('sinon') // stubs and mocks
//, mongoose = require('mongoose') // mongodb abstaction
  , cheerio = require('cheerio') // to parse fetched DOM data
  , config = require('../../config')
  , Provider = require('../../controllers/provider')
  , ProviderModel = require('../../models/provider')
;

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
  'TEST': {
    contents: '\
      <body>\
        <ol>\
          <li>\
            <a href="/test/leaf.zero.A" title="zero A">zero A</a>\
          </li>\
          <li>\
            <a href="/test/leaf.zero.B" title="zero B">zero B</a>\
          </li>\
        </ol>\
      </body>\
    ',
    count: 2,
  },
};

describe('controllers - provider', function() {

  // test model methods /////////////////////////////////////

  describe('getAll', function() {

    it('error must be null, result must be object, its length 5', function() {
      // mocking MongoDB
      sinon.stub(ProviderModel, 'getAll').yields(null, mockProviders); // TODO: this is wrong...
    
      Provider.getAll({}, function(err, result) {
        expect(err).to.be.null;
        expect(typeof result).to.eql('object');
        expect(result).to.have.keys([ 'SGI', 'TOE', 'FORBES', 'TEST' ]);
      });
    });

  });

});