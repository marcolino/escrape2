var express = require('express')
  , providerController = require("../controllers/provider");

var router = module.exports = express.Router();

router.get('/', providerController.getAll);
router.get('/syncPlaces', providerController.syncPlaces);
router.get('/syncPersons', providerController.syncPersons);
router.get('/syncComments', providerController.syncComments);

router.get('/testDetectNationality', providerController.testDetectNationality); // TODO: learn testing as a pro... :-)
//router.get('/status', providerController.status);