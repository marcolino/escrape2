var jwt = require('jwt-simple');
 
var auth = {
 
  login: function(req, res) {
    var username = req.body.username || '';
    var password = req.body.password || '';
    var status;
 
    if (username === '' || password === '') {
      status = 401;
      res.status(status);
      res.json({
        status: status,
        message: 'Invalid credentials'
      });
      return;
    }
 
    // Fire a query to your DB and check if the credentials are valid
    var dbUserObj = auth.validate(username, password);
   
    if (!dbUserObj) { // If authentication fails, we send a 401 back
      status = 401;
      res.status(status);
      res.json({
        status: status,
        message: 'Invalid credentials'
      });
      return;
    }
 
    if (dbUserObj) { // if authentication is successful, we will generate a token and dispatch it to the client
      res.json(genToken(dbUserObj));
    }
 
  },
 
  register: function(req, res) {
    // TODO: ...
  },

  validate: function(username, password) {
    // spoofing the DB response for simplicity
    var dbUserObj = { // spoofing a userobject from the DB. 
      name: 'arvind',
      role: 'admin',
      username: 'arvind@myapp.com'
    };
 
    return dbUserObj;
  },
 
  validateUser: function(username) {
    // spoofing the DB response for simplicity
    var dbUserObj = { // spoofing a userobject from the DB
      name: 'arvind',
      role: 'admin',
      username: 'arvind@myapp.com'
    };
 
    return dbUserObj;
  },
};
 
// private methods

function genToken(user) {
  var expires = expiresIn(7); // 7 days
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
 
module.exports = auth;
