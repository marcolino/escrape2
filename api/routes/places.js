'use strict';

var express = require('express')
  , place = require('../controllers/place')
;

var router = module.exports = express.Router();

router.get('/', getAll);

function getAll(req, res) { // get all places
  var filter = {}; //req....; // TODO: extract parameters in req which are suitable for getAll(), with some checks...
  place.getAll(filter, function(err, places) {
    if (err) {
      res.status(500).json(err); // TODO: test this...
    } else {
      res.json(places);
    }
  });
}

// error handling
router.use('/*', function(req, res, next) { // unforeseen request
  res.status(404).json({ error: 'places path ' + req.originalUrl + ' not found' });
});
