var express = require('express')
  , comment = require('../controllers/comment')
;

var router = module.exports = express.Router();

router.get('/', getAll);

function getAll(req, res) { // get all comments
  var filter = {};
  comment.getAll(filter, function(err, comments) {
    if (err) {
      res.json(err); // TODO: test this...
    } else {
      res.json(comments);
    }
  });
}
