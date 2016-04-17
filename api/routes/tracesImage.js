'use strict';

var express = require('express')
  , tracesImage = require('../controllers/tracesImage')
;

var router = module.exports = express.Router();

router.route('/sync/:image').
  get(function(req, res) { // sync all persons
    var image = req.params.image;
     // return immedately ('sync()' is asynchronous...), log progress
    res.json('image traces sync for image ' + image + ' started');
    tracesImage.sync(image);
  })
;
router.get('/', getAll);
router.get('/getTracesByImageUrl/:image', getTracesByImageUrl);

function getAll(req, res) { // get all image traces
  tracesImage.getAll(function(err, traces) {
    if (err) {
      return res.status(500).json(err); // TODO: test this...
    }
    res.json(traces);
  });
}

function getTracesByImageUrl(req, res) { // get image traces by image
  var imageUrl = req.params.imageUrl;
//console.log('getTracesByImageUrl:', imageUrl);
  tracesImage.getTracesByImageUrl(imageUrl, function(err, traces) {
    if (err) {
      return res.status(500).json(err);
    }
//console.log('getTracesByImage traces:', traces);
    res.json(traces);
  });
}

// error handling
router.use('/*', function(req, res, next) { // unforeseen request
  res.status(404).json({ error: 'image traces path ' + req.originalUrl + ' not found' });
});
