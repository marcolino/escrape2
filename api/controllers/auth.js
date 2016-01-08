'use strict';

var jwt = require('jwt-simple') // JSON Web Token simple
  , user = require('../controllers/user') // user controller
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

var exports = {
  register: function(username, email, password, callback) {
    exports.existsUsername(username, function(err, result) {
      if (err) { // user does not exist
        return callback(err, null);
      }
      if (result.isTaken) {
        return callback('username is already taken', null);
      }

      var newUser = {};
      newUser.username = username;
      newUser.email = email;
      newUser.password = password;
      newUser.roles = [ 'user' ]; // default role is 'user'
      user.insert(newUser, function(err, result) {
        if (err) {
          return callback(err, null);
        }
        callback(null, result); // registration successful
      });
    });
  },

  login: function(username, password, callback) {
    // fire a query to DB and check if the credentials are valid
    exports.validateCredentials(username, password, function(err, result) {
      if (err) { // credentials validation failed
        return callback(err, null);
      }
      if (result && result.valid) { // login successful
        callback(null, generateUserToken(result));
      } else {
        callback('invalid credentials', null);
      }
    });
  },
 
  existsUsername: function(username, callback) {
    var response = exports.allowableUsername(username);
    if (!response.ok) {
      return callback(null, response);
    }

    user.getByUsername(username, function(err, result) {
      if (err) {
        return callback(err, null);
      }
      response.isTaken = result ? true : false;
      callback(null, response);
    });

  },

  validateCredentials: function(username, password, callback) {
    var response = exports.allowableUsername(username);
    if (!response.ok) {
      return callback('username contains invalid characters', null);
    }

    user.getByUsernamePassword(username, password, function(err, result) {
       if (err) {
        return callback(err, null);
      }
      response.valid = result ? true : false;
      response.username = result.username;
      response.email = result.email;
      response.roles = result.roles;
      response.dateOfCreation = result.dateOfCreation;
      callback(null, response);
    });
  },

  allowableUsername: function(username) {
    var patternValidUsername = /^[a-zA-Z0-9]+([_\s\-]?[a-zA-Z0-9])*$/;
    var invalidChars = patternValidUsername.exec(username) ? false : true;
    return {
      ok: !(invalidChars),
      invalidChars: invalidChars
    };
  },

  allowablePassword: function(password) {
    var minLength = 4;
    var tooEasy = password.length >= minLength ? false : true;
    return {
      ok: !(tooEasy),
      tooEasy: tooEasy
    };
  }

};
 
// private methods

function generateUserToken(user) {
  var expirationDate = expiresIn(config.auth.tokenExpirationDays);
  var token = jwt.encode({
    exp: expirationDate, // expiration date
    //user: user // the user object (TODO: should put user in token, and remove it from result, to avoid privilege escalation)
  }, require('../secure/secret'));
 
  return {
    token: token,
    expires: expirationDate,
    user: user
  };
}
 
function expiresIn(numDays) {
  var dateObj = new Date();
  return dateObj.setDate(dateObj.getDate() + numDays);
}
 
module.exports = exports;
