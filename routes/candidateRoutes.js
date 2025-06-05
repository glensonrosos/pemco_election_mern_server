const express = require('express');
const candidateController = require('../controllers/candidateController');
const authController = require('../controllers/authController'); // For route protection

const router = express.Router();

// --- Public Routes (accessible to all logged-in users or even public if needed) ---
router.get('/', candidateController.getAllCandidates);
router.get('/:id', candidateController.getCandidateById);

// --- Admin Only Routes (Protected) ---
// To make these routes admin-only, you would typically apply a middleware like:
// router.use(authController.protect, authController.restrictTo('admin'));
// For now, we'll just use authController.protect to ensure the user is logged in.
// Actual admin role restriction can be added later when admin user setup is complete.

// POST /api/candidates - Create a new candidate
// The 'uploadCandidatePhoto' middleware from candidateController handles the 'profilePhoto' field
router.post(
  '/', 
  authController.protect, 
  authController.restrictTo('admin'), 
  candidateController.uploadCandidatePhoto, 
  candidateController.createCandidate
);

// PATCH /api/candidates/:id - Update a candidate
router.patch(
  '/:id', 
  authController.protect, 
  authController.restrictTo('admin'), 
  candidateController.uploadCandidatePhoto, 
  candidateController.updateCandidate
);

// DELETE /api/candidates/:id - Delete a candidate
router.delete(
  '/:id', 
  authController.protect, 
  authController.restrictTo('admin'), 
  candidateController.deleteCandidate
);

module.exports = router;
