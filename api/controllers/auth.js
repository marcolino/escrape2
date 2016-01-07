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
      var newUser = {};
      newUser.username = username;
      newUser.email = email;
      newUser.password = user.cryptPassword(password);
      newUser.roles = [ 'user' ]; // default role is 'user'
console.error('before user insert');
      user.insert(newUser, function(err, result) {
console.error('after user insert:', err, result);
        if (err) {
console.error('User register insert error:', err);
          return callback(err);
        }
        var retval = result.toObject();
        retval.validity = validatedUser.validity;
        callback(null, retval);
      });
    });
  },

  login: function(username, password, callback) {
    // fire a query to DB and check if the credentials are valid
    exports.validateCredentials(username, password, function(err, result) {
      if (err) { // credentials validation failed
        return callback(err, null);
      }
      if (result) {
        callback(null, genToken(result));
      } else {
        callback('invalid credentials', null);
      }
    });
  },
 
  existsUsername: function(username, callback) {
    var allowable = exports.allowableUsername(username);
    if (!allowable.ok) {
      return callback(null, false);
    }

    user.getByUsername(username, function(err, result) {
      if (err) {
        return callback(err, null);
      }
      callback(null, result ? true : false);
    });

  },

  validateCredentials: function(username, password, callback) {
    var allowable = exports.allowableUsername(username);
    if (!allowable.ok) {
      return callback('username contains invalid characters', null);
    }

    user.getByUsernamePassword(username, password, function(err, result) {
      if (err) {
        return callback(err, null);
      }
      callback(null, result);
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

function genToken(user) {
  var expirationDate = expiresIn(config.auth.tokenExpirationDays);
  var token = jwt.encode({
    exp: expirationDate, // expiration date
    //user: user // the user object
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
