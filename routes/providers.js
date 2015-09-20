var express = require('express'),
    providerController = require("../controllers/provider-controller");
;

var router = express.Router();

router.get('/', providerController.getAll);
router.get('/syncPlaces', providerController.syncPlaces);
router.get('/syncPersons', providerController.syncPersons);
router.get('/syncComments', providerController.syncComments);
router.get('/testDetectNationality', providerController.testDetectNationality);
//router.get('/status', providerController.status);

module.exports = router;