const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Position name is required.'],
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  order: {
    type: Number,
    default: 0, // Used to determine the order of positions in voting stages
  },
  minWinners: {
    type: Number,
    required: [true, 'Minimum winners required per position must be specified.'],
    min: [0, 'Minimum winners cannot be less than 0.'],
    default: 1,
  },
  minSelectable: {
    type: Number,
    required: [true, 'Minimum selectable candidates must be specified.'],
    min: [0, 'Minimum selectable candidates cannot be less than 0.'],
    default: 0,
  },
  maxSelectable: {
    type: Number,
    required: [true, 'Maximum selectable candidates must be specified.'],
    min: [1, 'Maximum selectable candidates cannot be less than 1.'],
    default: 1,
    validate: {
      validator: function(value) {
        // Ensure maxSelectable is not less than minSelectable
        return value >= this.minSelectable;
      },
      message: props => `Maximum selectable candidates (${props.value}) cannot be less than minimum selectable candidates.`
    }
  },
}, { timestamps: true });

// Ensure 'order' is unique for active positions to prevent ambiguity in voting sequence if needed,
// or handle sorting explicitly in queries. For now, we'll allow duplicate order numbers
// and rely on secondary sort criteria if needed, or enforce uniqueness at the application level if strict ordering is critical.

// Pre-save hook to ensure 'name' is capitalized or consistently formatted if desired (optional)
// positionSchema.pre('save', function(next) {
//   if (this.isModified('name')) {
//     this.name = this.name.charAt(0).toUpperCase() + this.name.slice(1).toLowerCase(); // Example: Title Case
//   }
//   next();
// });

const Position = mongoose.model('Position', positionSchema);

module.exports = Position;
