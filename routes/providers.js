var express = require('express')
  //, status = require('../controllers/status')
  , provider = require('../controllers/provider')
;

var router = module.exports = express.Router();

//router.get('/', providerController.getAll);
router.get('/', getAll);
// TODO: the following handlers are to be moved to the specific route path...
router.get('/syncPlaces', provider.syncPlaces);
router.get('/syncPersons', provider.syncPersons);
router.get('/syncComments', provider.syncComments);

function getAll(req, res) { // get all providers
  var request = req; // TODO: extract parameters in req which are suitable for getAll(), with some checks...
  provider.getAll(request, function(err, providers) {
    res.json(providers);
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
