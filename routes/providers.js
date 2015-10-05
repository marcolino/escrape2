var express = require('express');
var providerController = require('../controllers/provider');

var router = module.exports = express.Router();

//router.get('/', providerController.getAll);
router.get('/', getAll);
// TODO: the following handlers are to be moved to the specific route path...
router.get('/syncPlaces', providerController.syncPlaces);
router.get('/syncPersons', providerController.syncPersons);
router.get('/syncComments', providerController.syncComments);

function getAll(req, res) { // get all providers
  var request = req; // TODO: extract parameters in req which are suitable for getAll(), with some checks...
  providerController.getAll(request, function(err, providers) {
    err = new Error('Testing', req);
    if (err) { // TODO: if (err) return Object; else return Array; ???!!!???
      res.json({ error: err });
      //res.json(err);
    } else {
      res.json(providers);
    }
  });
}
