var mongoose = require('mongoose')
  , md5 = require('md5') // hashing algorithm
  , config = require('../config') // application configuration
;

var commentSchema = new mongoose.Schema({
  phone: String,
  topic: String,
  content: String,
  dateOfCreation: Date,
  dateOfFirstSync: Date, // TODO: do we need this field?
  author: {
    nick: String,
    karma: Number,
    posts: Number
  },
  url: String,
  idUser: String,
  idPerson: String,
  opinion: Number
},
{
  autoIndex: config.debug
});
commentSchema
  .virtual('contentMd5')
  .get(function() {
    return md5(this.content);
  })
;
commentSchema
  .index(
    { dateOfCreation: 1, topic: 1, authorNick: 1, contentMd5: 1 },
    { unique: true } // 1: ascending, -1: descending
  )
;

module.exports = mongoose.model('Comment', commentSchema);
