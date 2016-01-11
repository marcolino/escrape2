var userToPersonSchema = new mongoose.Schema({
  username: { type: String, required: true },
  personkey: { type: String, required: true },
  hide: Boolean,
  vote: Number,
  notes: String,
});

mongoose.model('UserToPerson', userToPersonSchema);

module.exports = mongoose.model('UserToPerson', userToPersonSchema);