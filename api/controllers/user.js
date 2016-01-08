var mongoose = require('mongoose') // mongo abstraction
  , cheerio = require('cheerio') // to parse fetched DOM data
  , async = require('async') // to call many async functions in a loop
  , fs = require('fs') // file-system handling
  , path = require('path') // paths handling
  //, _ = require('lodash') // lo-dash utilities
  , crypto = require('crypto') // password encryption
  , md5 = require('md5') // password hashing
  , network = require('../controllers/network') // network handling
  , image = require('../controllers/image') // network handling
  , provider = require('./provider') // provider's controller
  , User = require('../models/user') // model of user
  , config = require('../config') // global configuration
;
var local = {};
var log = config.log;

exports.getAll = function(filter, options, callback) { // get all user
  // TODO: ...
};

exports.getByUsername = function(username, callback) { // get user by username
  User.findOne({ username: username }, function(err, user) {
if (err) { log.error('User.getByUsername error:', err); }
//log.debug('controller.user.getByUsername:', err, user);
    callback(err, user ? user.toObject() : user);
  });
};

exports.getByUsernamePassword = function(username, password, callback) { // get user by username and password
  //var passwordHash = exports.cryptPassword(password);
  User.findOne({ username: username }, function(err, user) {
log.debug('controller.user.getByUsernamePassword, err:', err, 'user:', user);
    if (err) {
      return callback(err, null);
    }
    if (!user) {
      return callback('invalid credentiaks (no such user)', null); // TODO: => 'invalid credentials'
    }
    user = user.toObject();
    if (!exports.comparePassword(user.passwordHash, password)) {
      return callback('invalid credentiaks (wrong password)', null); // TODO: => 'invalid credentials'
    }
    callback(err, user); // login successful
  });
};


exports.insert = function(user, callback) { // insert user
  if (!user) {
    return callback(new Error('can\'t insert empty user'));
  }
  if (!user.username) {
    return callback(new Error('can\'t insert user with no username'));
  }
  if (!user.password) {
    return callback(new Error('can\'t insert user with no password'));
  }
  user.passwordHash = exports.cryptPassword(user.password); // replace password with its hash
  User.create(user, function(err, user) {
if (err) { log.error('User.insert error:', err); }
    callback(err, user ? user.toObject() : user);
  });
};

/*
exports.cryptPassword = function(password, callback) {
  bcrypt.genSalt(10, function(err, salt) { // the cost of processing the data is 10
    if (err) {
      return callback(err);
    }
    bcrypt.hash(password, salt, function(err, hash) {
      return callback(err, hash);
    });
  });
};

exports.comparePassword = function(password, userPassword, callback) {
  bcrypt.compare(password, userPassword, function(err, isPasswordMatch) {
    if (err) {
      return callback(err);
    }
    return callback(null, isPasswordMatch);
  });
};
*/

var saltLength = 10;

exports.cryptPassword = function(password) {
  var salt = generateSalt(saltLength);
  var hash = md5(password + salt);
log.debug('cryptPassword:', hash);
  return salt + hash;
};

exports.comparePassword = function(hash, password) {
  var salt = hash.substr(0, saltLength);
  var validHash = salt + md5(password + salt);
log.debug('comparePassword:', hash, validHash);
  return hash === validHash;
};

function generateSalt(len) {
  var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ'
    , setLen = set.length
    , salt = ''
  ;
  for (var i = 0; i < len; i++) {
    var p = Math.floor(Math.random() * setLen);
    salt += set[p];
  }
  return salt;
}

module.exports = exports;
