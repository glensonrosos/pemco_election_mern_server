const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  profilePhoto: {
    type: String, // Path to the uploaded photo
    default: 'default.jpg', // Optional: a default image path
  },
  position: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Position',
    required: [true, 'Position ID is required'],
  },
  votes: {
    type: Number,
    default: 0,
  },
  // Optional: Add timestamps for when the candidate was created or updated
  // createdAt: {
  //   type: Date,
  //   default: Date.now
  // },
  // updatedAt: {
  //   type: Date,
  //   default: Date.now
  // }
}, { timestamps: true }); // Using timestamps option for createdAt and updatedAt

// Create a virtual property for fullName
candidateSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included when converting to JSON
candidateSchema.set('toJSON', { virtuals: true });
candidateSchema.set('toObject', { virtuals: true });

const Candidate = mongoose.model('Candidate', candidateSchema);

module.exports = Candidate;
