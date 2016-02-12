'use strict';

var express = require('express')
  , review = require('../controllers/review')
;

var router = module.exports = express.Router();

router.get('/', getAll);

function getAll(req, res) { // get all reviews
  var filter = {};
  review.getAll(filter, function(err, reviews) {
    if (err) {
      res.status(500).json(err); // TODO: test this...
    } else {
      res.json(reviews);
    }
  });
}

// error handling
router.use('/*', function(req, res, next) { // unforeseen request
  res.status(404).json({ error: 'reviews path ' + req.originalUrl + ' not found' });
});
