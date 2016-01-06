var express = require('express')
  , user = require('../controllers/user')
;
var router = express.Router();

router.get('/signup', signup);
router.post('/signup/check/:username', signupCheckUsername);

function signup(req, res) {
  // res.render('signup'); // TODO: ...
}

function signupCheckUsername(req, res) {
  var username = req.username;
  user.checkUsername(username, function(err, result) {
    if (err) {
      res.json(err);
    } else {
      res.json(result);
    }
  });
}

// error handling
router.use('/*', function(req, res, next) { // unforeseen request
  var status = 404;
  res.status(status);
  res.json({ status: status, error: 'users path ' + req.originalUrl + ' not found' });
});

module.exports = router;
