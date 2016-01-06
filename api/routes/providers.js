var express = require('express')
  , bodyParser = require('body-parser') // to parse information from POST
  , provider = require('../controllers/provider')
;

var router = express.Router();
router.use(bodyParser.urlencoded({ extended: true })); // already in app.js (is it sufficient???)

router.param('key', function(req, res, next, key) {
  req.key = key; // once validation is done save the new item in the req
  next(); // go on to the next thing
});
router.param('category', function(req, res, next, category) {
  req.category = category; // once validation is done save the new item in the req
  next(); // go on to the next thing
});

router.get('/', getAll);
router.get('/:key/:category/geturl', getUrl);

function getAll(req, res) { // get all providers
  var filter = {}; //req; // TODO: extract parameters in req which are suitable for getAll(), with some checks...
  provider.getAll(filter, function(err, providers) {
    if (err) {
      res.json(err);
    } else {
      res.json(providers);
    }
  });
}

function getUrl(req, res) { // get provider URL
  var key = req.key;
  var category = req.category;
  provider.getUrl(key, category, function(err, url) {
    if (err) {
      res.json(err);
    } else {
      res.json(url);
    }
  });
}

// error handling
router.use('/*', function(req, res, next) { // unforeseen request
  var status = 404;
  res.status(status);
  res.json({ status: status, error: 'providers path ' + req.originalUrl + ' not found' });
});

// export all router methods
module.exports = router;
