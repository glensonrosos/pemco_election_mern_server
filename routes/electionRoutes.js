const express = require('express');
const electionController = require('../controllers/electionController');
const authController = require('../controllers/authController'); // To protect the route

const router = express.Router();

// All routes below this middleware require authentication
router.use(authController.protect);

// GET /api/election/status - Get the current election voting status (publicly accessible for authenticated users)
router.get('/status', electionController.getPublicElectionStatus);

module.exports = router;
