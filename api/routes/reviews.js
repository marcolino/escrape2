'use strict';

var express = require('express')
  , review = require('../controllers/review')
;

var router = module.exports = express.Router();

router.route('/sync/:phone').
  get(function(req, res) { // sync all persons
    var phone = req.params.phone;
     // return immedately ('sync()' is asynchronous...), log progress
    res.json('reviews sync for phone ' + phone + ' started');
    review.sync(phone);
  })
;
router.get('/', getAll);
router.get('/getByPhone/:phone', getByPhone);

function getAll(req, res) { // get all reviews
  var filter = {};
  review.getAll(filter, function(err, reviews) {
    if (err) {
      return res.status(500).json(err); // TODO: test this...
    }
    res.json(reviews);
  });
}

function getByPhone(req, res) { // get reviews by phone
console.error('req.params.phone:', req.params.phone);
  var filter = { phone: req.params.phone };
  review.getByPhone(filter, function(err, reviews) {
    if (err) {
      return res.status(500).json(err); // TODO: test this...
    }
    res.json(reviews);
  });
}

// error handling
router.use('/*', function(req, res, next) { // unforeseen request
  res.status(404).json({ error: 'reviews path ' + req.originalUrl + ' not found' });
});
