const Candidate = require('../models/Candidate');
const multer = require('multer');
const path = require('path');

// Helper function to capitalize the first letter of each word
const capitalizeWords = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};

// --- Multer Configuration for Profile Photo Uploads ---

// Define storage for the images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure this directory exists or create it
    cb(null, 'uploads/candidates/'); // Store in server/uploads/candidates/
  },
  filename: function (req, file, cb) {
    // Create a unique filename: fieldname-timestamp.extension
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Check file type
function checkFileType(file, cb) {
  // Allowed ext
  const filetypes = /jpeg|jpg|png|gif/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images Only! (jpeg, jpg, png, gif)');
  }
}

// Initialize upload variable
exports.uploadCandidatePhoto = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Limit file size to 2MB
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
}).single('profilePhoto'); // 'profilePhoto' is the field name in the form-data

// --- Candidate Controller Functions ---

// Create a new candidate (Admin only)
exports.createCandidate = async (req, res) => {
  try {
    const { firstName, lastName, position } = req.body;
    // Capitalize first and last names from the destructured req.body
    // (firstName and lastName are in scope from the line above: const { firstName, lastName, position } = req.body;)
    const capitalizedFirstName = firstName ? capitalizeWords(firstName) : '';
    const capitalizedLastName = lastName ? capitalizeWords(lastName) : '';
    let profilePhotoPath = 'default.jpg'; // Default photo

    if (req.file) {
      // Construct path relative to how it will be served or accessed
      // For now, storing relative path from server root
      profilePhotoPath = req.file.path.replace(/\\/g, '/'); // Normalize path for windows
    }

    if (!firstName || !lastName || !position) {
        return res.status(400).json({ message: 'First name, last name, and position are required.' });
    }

    const newCandidate = await Candidate.create({
      firstName: capitalizedFirstName,
      lastName: capitalizedLastName,
      position,
      profilePhoto: profilePhotoPath,
    });

    res.status(201).json({
      status: 'success',
      data: {
        candidate: newCandidate,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ 
        message: 'Validation Error', 
        errors: messages 
      });
    }
    console.error('Create Candidate Error:', error);
    res.status(500).json({ message: 'Error creating candidate.', error: error.message });
  }
};

// Get all candidates
exports.getAllCandidates = async (req, res) => {
  try {
    const { search, position } = req.query;
    const queryObject = {};

    if (search) {
      queryObject.$or = [
        { firstName: { $regex: search, $options: 'i' } }, // i for case-insensitive
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    if (position) {
      queryObject.position = position;
    }

    const candidates = await Candidate.find(queryObject).populate('position');
    res.status(200).json({
      status: 'success',
      results: candidates.length,
      data: {
        candidates,
      },
    });
  } catch (error) {
    console.error('Get All Candidates Error:', error);
    res.status(500).json({ message: 'Error fetching candidates.', error: error.message });
  }
};

// Get a single candidate by ID
exports.getCandidateById = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id).populate('position');
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found.' });
    }
    res.status(200).json({
      status: 'success',
      data: {
        candidate,
      },
    });
  } catch (error) {
    console.error('Get Candidate By ID Error:', error);
    res.status(500).json({ message: 'Error fetching candidate.', error: error.message });
  }
};

// Update a candidate (Admin only)
exports.updateCandidate = async (req, res) => {
  try {
    let { firstName, lastName, position } = req.body;

    // Capitalize first and last names if provided
    if (firstName) firstName = capitalizeWords(firstName);
    if (lastName) lastName = capitalizeWords(lastName);

    const updateData = { };
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (position) updateData.position = position;

    if (req.file) {
      updateData.profilePhoto = req.file.path.replace(/\\/g, '/');
      // TODO: Optionally, delete the old photo if a new one is uploaded
    }

    const candidate = await Candidate.findByIdAndUpdate(req.params.id, updateData, {
      new: true, // Return the modified document rather than the original
      runValidators: true, // Ensure schema validations are run on update
    });

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found to update.' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        candidate,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ 
        message: 'Validation Error during update', 
        errors: messages 
      });
    }
    console.error('Update Candidate Error:', error);
    res.status(500).json({ message: 'Error updating candidate.', error: error.message });
  }
};

// Delete a candidate (Admin only)
exports.deleteCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found to delete.' });
    }
    // TODO: Optionally, delete the candidate's photo from storage
    res.status(204).json({ // 204 No Content
      status: 'success',
      data: null,
    });
  } catch (error) {
    console.error('Delete Candidate Error:', error);
    res.status(500).json({ message: 'Error deleting candidate.', error: error.message });
  }
};
