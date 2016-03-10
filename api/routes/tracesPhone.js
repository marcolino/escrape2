'use strict';

var express = require('express')
  , tracesPhone = require('../controllers/tracesPhone')
;

var router = module.exports = express.Router();

router.route('/sync/:phone').
  get(function(req, res) { // sync all persons
    var phone = req.params.phone;
     // return immedately ('sync()' is asynchronous...), log progress
    res.json('phone traces sync for phone ' + phone + ' started');
    tracesPhone.sync(phone);
  })
;
router.get('/', getAll);
router.get('/getTracesByPhone/:phone', getTracesByPhone);
router.get('/blacklistFilterApply', blacklistFilterApply);

function getAll(req, res) { // get all phone traces
  tracesPhone.getAll(function(err, traces) {
    if (err) {
      return res.status(500).json(err); // TODO: test this...
    }
    res.json(traces);
  });
}

function getTracesByPhone(req, res) { // get phone traces by phone
  var phone = req.params.phone;
//console.log('getTracesByPhone:', phone);
  tracesPhone.getTracesByPhone(phone, function(err, traces) {
    if (err) {
      return res.status(500).json(err);
    }
//console.log('getTracesByPhone traces:', traces);
    res.json(traces);
  });
}

function blacklistFilterApply(req, res) { // apply blacklist filter to saved traces (useful when blacklist is updated and some traces altready saved)
  tracesPhone.blacklistFilterApply(function(err, count) {
    if (err) {
      return res.status(500).json(err);
    }
    //console.log('blacklistFilterApply count of traces filtered:', count);
    res.json(count);
  });
}

// error handling
router.use('/*', function(req, res, next) { // unforeseen request
  res.status(404).json({ error: 'phone traces path ' + req.originalUrl + ' not found' });
});
