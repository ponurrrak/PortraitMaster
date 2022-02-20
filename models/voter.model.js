const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema({
  user: { type: String, required: true },
  votes: { type: [String],  default: undefined },
});

module.exports = mongoose.model('Voter', voterSchema);
