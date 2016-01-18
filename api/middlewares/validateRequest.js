'use strict';

var jwt = require('jwt-simple') // JSON Web Token module
  , auth = require('../controllers/auth') // authorization controller
  , secret = require('../secure/secret.js') // our secret super secure
  , config = require('../config') // global configuration
;
var log = config.log;

module.exports = function(req, res, next) {
 
  // when performing a cross domain request, we will recieve a preflighted request first, to check if our the app is safe;
  // TODO: do we really neED this? Test over cross domain...
  if (req.method === 'OPTIONS') { // skip the token auth for [OPTIONS] requests
    log.debug('*** OPTIONS REQUEST DETECTED IN VALIDATE-REQUEST (passing to next middleware) ***:', req);
    next();
  }

  var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
  var key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];
 
  if (!token) {
    if (config.auth.allowUnauthorizedRequests) {
      return next(); // allow request with no token
    } else {
      return res.status(401).json({ error: 'not authorized (no token in request)' });
    }
  }

  try {
    var decoded = jwt.decode(token, secret);
    if (decoded.exp <= Date.now()) {
      // TODO: cause client to load login page.., or, better, to invalidate token in localstorage, so a login button appears (and if possible add a message to say token was expired, ...)
      return res.status(400).json({ error: 'not authorized (token expired)' });
    }

    // authorize the user to see if user can access our resources
    auth.existsUsername(key, function(err, user) {
  //auth.validateUser(decoded.user.name, function(err, dbUser) { // the key is in user's username
      if (err) {
        return res.status(500).json({ error: err });
      }
      if (!user) { // no user with this name exists, respond with a 401
        return res.status(401).json({ error: 'not authorized (invalid user)' });
      }
      //if ((req.url.indexOf('/admin/') >= 0) && (user.role !== 'admin')) {
      if ((req.url.indexOf('/admin/') >= 0) && (user.roles.indexOf('admin') > -1)) { // TODO: adapt to our concept of administrative route
        return res.status(403).json({ error: 'not authorized (insufficient privileges)' });
      }
      if ((req.url.indexOf('/admin/') < 0) && (req.url.indexOf('/api/') < 0)) { // TODO: adapt to our concept of administrative route
        return res.status(403).json({ error: 'not authorized (bad api url)' });
      }
      next(); // authorized, move to next middleware
    });

  } catch (err) { // some other error
    return res.status(500).json({ error: 'something unexpected went wrong: ' + err.message });
  }

/*
  return jwt.verify(token, secret, function (err, decoded) {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(400).json({ error: 'token expired' });
      } else {
        if (err.name === 'JsonWebTokenError') {
          return res.status(401).json({ error: 'invalid Token' });
        } else {
          return res.status(500).json({ error: 'unforeseen error while verifying token: ' + err.name });
        }
      }
    } else {
      if (!decoded) {
        return res.status(500).json({ error: 'could not verify token: ' + 'empty payload' });
      }
      var dbUser = auth.validateUser(key); // the key is logged in user username
      //var dbUser = auth.validateUser(decoded.user.name); // the key is logged in user name

      if (!dbUser) { // no user with this name exists, respond with a 401
        return res.status(401).json({ error: 'not authorized (invalid user)' });
      }
      if ((req.url.indexOf('/admin/') >= 0) && (dbUser.role !== 'admin')) { // TODO: adapt to our concept of administrative route
        return res.status(403).json({ error: 'not authorized (insufficient privileges)' });
      }
      if ((req.url.indexOf('/admin/') < 0) && (req.url.indexOf('/api/') < 0)) { // TODO: adapt to our concept of administrative route
        return res.status(403).json({ error: 'not authorized (bad api url)' });
      }

      next(); // authorized, move to next middleware

    }
  });
*/
};
