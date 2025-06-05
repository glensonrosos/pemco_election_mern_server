const express = require('express');
const voteController = require('../controllers/voteController');
const authController = require('../controllers/authController'); // For route protection

const router = express.Router();

// All vote routes should be protected, user must be logged in
router.use(authController.protect);

// POST /api/votes/cast - Cast a vote
router.post('/cast', voteController.castVote);

// GET /api/votes/results - Get election results
// This route could also be admin-only depending on when results should be public
router.get('/results', voteController.getElectionResults);

// GET /api/votes/user-status - Get the voting status for the authenticated user
router.get('/user-status', voteController.getUserVoteStatus);

module.exports = router;
