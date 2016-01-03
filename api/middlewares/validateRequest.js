var jwt = require('jwt-simple');
var validateUser = require('../routes/auth2').validateUser;
var secret = require('../secure/secret.js');
 
module.exports = function(req, res, next) {
 
  // when performing a cross domain request, we will recieve a preflighted request first, to check if our the app is safe.
 
  // skip the token auth for [OPTIONS] requests
  //if (req.method == 'OPTIONS') next(); // TODO: ???
console.log(req.body);
console.log(req.query);
console.log(req.headers);

  var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
  var key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];
  var status;
 
//return(next());
console.log('token:', token, ', key:', key);

  if (token || key) {
    try {
      var decoded = jwt.decode(token, secret);
      if (decoded.exp <= Date.now()) {
        status = 400;
        res.status(status);
        res.json({
          status: status,
          error: 'Token Expired'
        });
        return;
      }
 
      // authorize the user to see if s/he can access our resources
      var dbUser = validateUser(key); // the key would be the logged in user's username
      if (dbUser) {
        if (
          (req.url.indexOf('admin') >= 0 && dbUser.role == 'admin') ||
          (req.url.indexOf('admin') < 0 && req.url.indexOf('/api/v1/') >= 0)
        ) {
          next(); // move to next middleware
        } else {
          status = 403;
          res.status(status);
          res.json({
            status: status,
            error: 'Not Authorized'
          });
          return;
        }
      } else {
        // no user with this name exists, respond with a 401
        status = 401;
        res.status(status);
        res.json({
          status: status,
          error: 'Invalid User'
        });
        return;
      }
 
    } catch (err) { // some other error
      status = 500;
      res.status(status);
      res.json({
        status: status,
        error: 'Ooops! Something went wrong'
      });
    }
  } else {
    status = 401;
    res.status(status);
    res.json({
      status: status,
      error: 'No Token or Key'
    });
    return;
  }
};
