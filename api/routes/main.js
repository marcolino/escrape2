var express = require('express')
  , router = express.Router()
;

/* get app index */
router.get('/', function(req, res) {
  console.log('here:', __dirname);
  //res.json('respond with a resource');
  console.log(__dirname + '/../../app/index.html');
  res.sendFile(__dirname + '/../../app/index.html');
});

module.exports = router;
