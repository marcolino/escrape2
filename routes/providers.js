var express = require('express')
  , providerController = require("../controllers/provider");

var router = module.exports = express.Router();

//router.get('/', providerController.getAll);
router.get('/', getAll);
// TODO: the following handlers are to be moved to the specifi route path...
router.get('/syncPlaces', providerController.syncPlaces);
router.get('/syncPersons', providerController.syncPersons);
router.get('/syncComments', providerController.syncComments);

function getAll(req, res) { // get all providers
  ProviderController.getAll(function(err, providers) {
    if (err) {
      res.json({ error: err });
    } else {
      res.json(providers);
    }   
  });
}