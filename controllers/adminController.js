const User = require('../models/User');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const mongoose = require('mongoose');
const { getVotingStatus, setVotingStatus, getRegistrationStatus, setRegistrationStatus } = require('../services/electionState'); // Import electionState service

// Close the voting process (Admin only)
exports.closeVoting = async (req, res) => {
  try {
    setVotingStatus(false);
    console.log(`Voting process closed by admin: ${req.user.fullName} (${req.user.companyId}) at ${new Date().toISOString()}`);
    
    res.status(200).json({
      status: 'success',
      message: 'Voting process has been closed.',
      isVotingOpen: getVotingStatus()
    });
  } catch (error) {
    console.error('Close Voting Error:', error);
    res.status(500).json({ message: 'Error closing voting process.', error: error.message });
  }
};

// Open the voting process (Admin only) - Counterpart to closeVoting
exports.openVoting = async (req, res) => {
    try {
      setVotingStatus(true);
      console.log(`Voting process opened by admin: ${req.user.fullName} (${req.user.companyId}) at ${new Date().toISOString()}`);
      res.status(200).json({
        status: 'success',
        message: 'Voting process has been opened.',
        isVotingOpen: getVotingStatus()
      });
    } catch (error) {
      console.error('Open Voting Error:', error);
      res.status(500).json({ message: 'Error opening voting process.', error: error.message });
    }
  };

// Get current voting status (Admin/User)
exports.getVotingStatus = async (req, res) => {
    try {
        res.status(200).json({
            status: 'success',
            isVotingOpen: getVotingStatus()
        });
    } catch (error) {
        console.error('Get Voting Status Error:', error);
        res.status(500).json({ message: 'Error fetching voting status.', error: error.message });
    }
};

// Controller to enable user registration (Admin only)
exports.enableRegistration = async (req, res) => {
  try {
    setRegistrationStatus(true);
    console.log(`User registration enabled by admin: ${req.user.fullName} (${req.user.companyId}) at ${new Date().toISOString()}`);
    res.status(200).json({
      status: 'success',
      message: 'User registration has been enabled.',
      isRegistrationOpen: getRegistrationStatus()
    });
  } catch (error) {
    console.error('Enable Registration Error:', error);
    res.status(500).json({ message: 'Error enabling registration.', error: error.message });
  }
};

// Controller to disable user registration (Admin only)
exports.disableRegistration = async (req, res) => {
  try {
    setRegistrationStatus(false);
    console.log(`User registration disabled by admin: ${req.user.fullName} (${req.user.companyId}) at ${new Date().toISOString()}`);
    res.status(200).json({
      status: 'success',
      message: 'User registration has been disabled.',
      isRegistrationOpen: getRegistrationStatus()
    });
  } catch (error) {
    console.error('Disable Registration Error:', error);
    res.status(500).json({ message: 'Error disabling registration.', error: error.message });
  }
};

// Controller to get current registration status (Admin/User)
exports.getCurrentRegistrationStatus = async (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      isRegistrationOpen: getRegistrationStatus()
    });
  } catch (error) {
    console.error('Get Registration Status Error:', error);
    res.status(500).json({ message: 'Error fetching registration status.', error: error.message });
  }
};

// Clear database for the next election cycle (Admin only)
exports.clearDatabaseForNewElection = async (req, res) => {
  try {
    // 1. Delete all votes
    const voteDeletionResult = await Vote.deleteMany({});

    // 2. Reset 'hasVoted' flag for all users
    const userUpdateResult = await User.updateMany({}, { $set: { hasVoted: false } });

    // 3. Reset vote counts for all candidates
    const candidateUpdateResult = await Candidate.updateMany({}, { $set: { votes: 0 } });

    // Optional: Delete all candidates if they change each election cycle
    // const candidateDeletionResult = await Candidate.deleteMany({});
    // console.log(`Candidates deleted: ${candidateDeletionResult.deletedCount}`);



    console.log(`Database cleared for new election by admin: ${req.user.fullName} (${req.user.companyId}) at ${new Date().toISOString()}`);

    res.status(200).json({
      status: 'success',
      message: 'Database cleared for the next election cycle.',
      details: {
        votesDeleted: voteDeletionResult.deletedCount,
        usersReset: userUpdateResult.modifiedCount,
        candidatesVotesReset: candidateUpdateResult.modifiedCount,
        // candidatesDeleted: candidateDeletionResult ? candidateDeletionResult.deletedCount : 0
      }
    });
  } catch (error) {
    console.error('Clear Database Error:', error);
    res.status(500).json({ message: 'Error clearing database.', error: error.message });
  }
};
