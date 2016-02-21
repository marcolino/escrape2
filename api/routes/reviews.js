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
router.get('/getPostsByPhone/:phone', getPostsByPhone);
router.get('/getTopicsByPhone/:phone', getTopicsByPhone);
router.get('/getPostsByTopic/:topic', getPostsByTopic);

function getAll(req, res) { // get all reviews
  var filter = {};
  review.getAll(filter, function(err, reviews) {
    if (err) {
      return res.status(500).json(err); // TODO: test this...
    }
    res.json(reviews);
  });
}

function getPostsByPhone(req, res) { // get review posts by phone
  var phone = req.params.phone;
  review.getPostsByPhone(phone, function(err, reviews) {
    if (err) {
      return res.status(500).json(err);
    }
    res.json(reviews);
  });
}

function getTopicsByPhone(req, res) { // get review topics by phone
  var phone = req.params.phone;
  review.getTopicsByPhone(phone, function(err, reviews) {
    if (err) {
      return res.status(500).json(err);
    }
    res.json(reviews);
  });
}

function getPostsByTopic(req, res) { // get review posts by topic
  var topic = req.params.topic;
  review.getPostsByTopic(topic, function(err, reviews) {
    if (err) {
      return res.status(500).json(err);
    }
    res.json(reviews);
  });
}

// error handling
router.use('/*', function(req, res, next) { // unforeseen request
  res.status(404).json({ error: 'reviews path ' + req.originalUrl + ' not found' });
});
