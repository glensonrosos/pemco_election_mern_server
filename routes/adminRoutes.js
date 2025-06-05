const express = require('express');
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController'); // For route protection

const router = express.Router();

// GET /api/admin/registration-status - Public endpoint
router.get('/registration-status', adminController.getCurrentRegistrationStatus);

// All other admin routes should be protected and restricted to 'admin' role
router.use(authController.protect, authController.restrictTo('admin'));

// POST /api/admin/close-voting
router.post('/close-voting', adminController.closeVoting);

// POST /api/admin/open-voting
router.post('/open-voting', adminController.openVoting);

// GET /api/admin/voting-status (can also be a public route if needed, adjust protection accordingly)
// For now, keeping it admin-only as it's in admin routes. 
// If needed for users, create a separate public endpoint or adjust here.
router.get('/voting-status', adminController.getVotingStatus);

// POST /api/admin/clear-database
router.post('/clear-database', adminController.clearDatabaseForNewElection);

// POST /api/admin/enable-registration
router.post('/enable-registration', adminController.enableRegistration);

// POST /api/admin/disable-registration
router.post('/disable-registration', adminController.disableRegistration);


// TODO: Add route for admin dashboard statistics if needed

module.exports = router;
