const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    set: v => v.toUpperCase(),
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    set: v => v.toUpperCase(),
  },
  companyId: {
    type: String,
    required: [true, 'Company ID is required'],
    unique: true, // Assuming Company ID should be unique for each user
    trim: true,
    set: v => v.toUpperCase(),
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [3, 'Password must be at least 3 characters long'],
    select: false, // Do not return password by default when querying users
  },
  hasVoted: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  // createdAt: {
  //   type: Date,
  //   default: Date.now
  // }
}, { timestamps: true });

// Create a virtual property for fullName
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included when converting to JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });


const User = mongoose.model('User', userSchema);

module.exports = User;
