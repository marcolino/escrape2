var express = require('express')
  , provider = require('../controllers/provider')
;

var router = module.exports = express.Router();

router.get('/', getAll);

function getAll(req, res) { // get all providers
  var filter = {}; //req; // TODO: extract parameters in req which are suitable for getAll(), with some checks...
  provider.getAll(filter, function(err, providers) {
    if (err) {
      res.json(err); // TODO: test this...
    } else {
      res.json(providers);
    }
  });
}
