var express = require('express')
  , place = require('../controllers/place')
;

var router = module.exports = express.Router();

router.get('/', getAll);

function getAll(req, res) { // get all places
  var filter = {}; //req....; // TODO: extract parameters in req which are suitable for getAll(), with some checks...
  place.getAll(filter, function(err, places) {
    if (err) {
      res.json(err); // TODO: test this...
    } else {
      res.json(places);
    }
    /*
    //err = new Error('Testing', req);
    if (err) {
      // TODO: !!! status.error(err); // it has been done at lowest level!
      res.json([]);
      //res.json(err);
    } else {
      res.json(providers);
    }
    */
  });
}

// error handling
router.use('/*', function(req, res, next) { // unforeseen request
  var status = 404;
  res.status(status);
  res.json({ status: status, error: 'places path ' + req.originalUrl + ' not found' });
});
