var jwt = require('jwt-simple') // JSON Web Token simple
  , user = require('../controllers/user') // user controller
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

var exports = {
  login: function(username, password) {
    // fire a query to DB and check if the credentials are valid
    var dbUserObj = exports.validateCredentials(username, password);
    if (!dbUserObj) { // authentication failed, send a 401 back
      return {
        error: {
          status: 401,
          message: 'invalid credentials',
        }
      };
    }

    // authentication is successful, send back a token
    return {
      token: genToken(dbUserObj)
    };
  },
 
  register: function(username, email, password) {
    var dbUserObj = exports.validateUsername(username);
    if (!dbUserObj) { // authentication failed, send a 401 back
      return {
        error: {
          status: 500,
          message: 'some strange error happened...',
        }
      };
    }
    return dbUserObj;
  },

  validateCredentials: function(username, password) {
    // spoofing the DB response for simplicity
    var dbUserObj = { // spoofing a user object from the DB
      name: username + ' booh',
      role: 'admin',
      username: username,
    };
    if (username === 'marco') {
      return dbUserObj;
    } else {
      return null;
    }
  },

  validateUsername: function(username) {
    var validity = {};
    var patternValidUsername = /^[a-zA-Z0-9]+([_\s\-]?[a-zA-Z0-9])*$/;
    // spoofing the DB response for simplicity
    validity.isTaken = (username === 'marco');

console.log('username:', username);
    validity.invalidChars = (patternValidUsername.exec(username) ? false : true);
console.log('validity.invalidChars:', validity.invalidChars);

    var user = {
      name: username + ' booh',
      role: 'user',
      username: username
    };
    
    var dbUserObj = { // spoofing a user object from the DB
      validity: validity,
      user: user
    };
    return dbUserObj;
  },

  validatePassword: function(password) {
console.log('api controllers validatePassword - password:', password);
    var validity = {};
    validity.tooEasy = password.length < 4;

    return {
      validity: validity
    };
  },
};
 
// private methods

function genToken(user) {
  var expires = expiresIn(config.auth.tokenExpirationDays);
  var token = jwt.encode({
    exp: expires
  }, require('../secure/secret'));
 
  return {
    token: token,
    expires: expires,
    user: user
  };
}
 
function expiresIn(numDays) {
  var dateObj = new Date();
  return dateObj.setDate(dateObj.getDate() + numDays);
}
 
module.exports = exports;
