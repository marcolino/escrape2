var expect = require('chai').expect // assertion library
  , superagent = require('superagent') // small progressive client-side HTTP request library
//, sinon = require('sinon') // stubs and mocks
//, mongoose = require('mongoose') // mongodb abstaction
  , config = require('../../config')
  , Provider = require('../../controllers/provider')
  , ProviderModel = require('../../models/provider');

// test routing methods (service must be running)

var URL = 'http://test.server.local:3000/providers/';

describe('routes - provider', function() {

  describe('getAll', function() {

    it('routing: getAll', function(done) {
      superagent.get(URL)
      .end(function(e, res) {
        expect(e).to.eql(null);
        expect(res.body).to.be.instanceof(Array);
        var n = 0;
        res.body.forEach(function(p) {
          expect(p._id.length).to.eql(24);
          n++;
        });
        expect(n).to.eql(5);
        done();
      });
    });
  
  });

});