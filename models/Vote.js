const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const voteSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required for a vote'],
    unique: true, // Each user can only have one vote document
  },
  // Dynamic field to store votes:
  // Keys will be Position ObjectIds (as strings)
  // Values will be arrays of Candidate ObjectIds
  votesByPosition: {
    type: Map,
    of: [{
      type: Schema.Types.ObjectId,
      ref: 'Candidate'
    }]
  }
}, { timestamps: true }); // Using timestamps option for createdAt and updatedAt

// Optional: Validation for the number of candidates selected for each position
// (e.g., min/max selectable per position) should now primarily be handled 
// in the controller logic before saving, using the rules from the Position model.
const Vote = mongoose.model('Vote', voteSchema);

module.exports = Vote;
