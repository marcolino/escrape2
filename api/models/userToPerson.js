var userToPersonSchema = new mongoose.Schema({
  username: { type: String, required: true },
  personkey: { type: String, required: true },
  hide: Boolean,
  vote: Number,
  notes: String,
});

mongoose.model('User', userSchema);

module.exports = mongoose.model('User', userSchema);