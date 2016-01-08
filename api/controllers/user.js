'use strict';

var mongoose = require('mongoose') // mongo abstraction
  , cheerio = require('cheerio') // to parse fetched DOM data
  , async = require('async') // to call many async functions in a loop
  , fs = require('fs') // file-system handling
  , path = require('path') // paths handling
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
    callback(err, user ? user.toObject() : user);
  });
};

exports.getByUsernamePassword = function(username, password, callback) { // get user by username and password
  User.findOne({ username: username }, function(err, user) {
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
    callback(err, user ? user.toObject() : user);
  });
};

var saltLength = 10;

exports.cryptPassword = function(password) {
  var salt = generateSalt(saltLength);
  var hash = md5(password + salt);
  return salt + hash;
};

exports.comparePassword = function(hash, password) {
  var salt = hash.substr(0, saltLength);
  var validHash = salt + md5(password + salt);
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
