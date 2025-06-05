const Vote = require('../models/Vote');
const User = require('../models/User');
const Candidate = require('../models/Candidate');
const Position = require('../models/Position'); // Added Position model
const mongoose = require('mongoose');
const { getVotingStatus } = require('../services/electionState'); // Import electionState service

// Cast a vote (User only)
exports.castVote = async (req, res) => {
  // 0. Check if voting is open
  if (!getVotingStatus()) {
    return res.status(403).json({ message: 'Voting is currently closed.' });
  }

  // const session = await mongoose.startSession();
  // session.startTransaction();
  try {
    const userId = req.user._id; // Assuming req.user is populated by authController.protect
    const { votesByPosition } = req.body; // Expecting votesByPosition: { positionId: [candidateId1, candidateId2], ... }

    // 1. Check if user exists and has already voted
    const user = await User.findById(userId); // .session(session);
    if (!user) {
      // await session.abortTransaction(); session.endSession();
      return res.status(404).json({ message: 'User not found.' });
    }
    if (user.hasVoted) {
      // await session.abortTransaction(); session.endSession();
      return res.status(403).json({ message: 'You have already voted.' });
    }

    // 2. Validate vote selections dynamically
    if (!votesByPosition || Object.keys(votesByPosition).length === 0) {
      return res.status(400).json({ message: 'No votes submitted.' });
    }

    let totalSelectedCandidatesCount = 0;
    const allSelectedCandidateIdsForVoteIncrement = [];

    for (const positionId in votesByPosition) {
      if (Object.hasOwnProperty.call(votesByPosition, positionId)) {
        const selectedCandidateIds = votesByPosition[positionId];
        totalSelectedCandidatesCount += selectedCandidateIds.length;

        const position = await Position.findById(positionId);
        if (!position || position.status !== 'active') {
          // await session.abortTransaction(); session.endSession();
          return res.status(400).json({ message: `Invalid or inactive position ID: ${positionId}.` });
        }

        if (selectedCandidateIds.length < position.minSelectable || selectedCandidateIds.length > position.maxSelectable) {
          // await session.abortTransaction(); session.endSession();
          return res.status(400).json({
            message: `For position "${position.name}", you must select between ${position.minSelectable} and ${position.maxSelectable} candidates. You selected ${selectedCandidateIds.length}.`,
          });
        }

        // Verify all selected candidates are valid for this position
        for (const candidateId of selectedCandidateIds) {
          const candidate = await Candidate.findOne({ _id: candidateId, position: positionId });
          if (!candidate) {
            // await session.abortTransaction(); session.endSession();
            return res.status(400).json({ message: `Invalid candidate ID ${candidateId} for position "${position.name}".` });
          }
          allSelectedCandidateIdsForVoteIncrement.push(candidateId);
        }
      }
    }

    if (totalSelectedCandidatesCount === 0) {
        // await session.abortTransaction(); session.endSession();
        return res.status(400).json({ message: 'Please select at least one candidate overall.' });
    }

    // 3. Create the vote object
    const newVote = new Vote({
      user: userId,
      votesByPosition: votesByPosition, // Store the map directly
    });
    await newVote.save(); // { session }

    // 4. Update candidate vote counts
    if (allSelectedCandidateIdsForVoteIncrement.length > 0) {
      await Candidate.updateMany(
        { _id: { $in: allSelectedCandidateIdsForVoteIncrement } },
        { $inc: { votes: 1 } }
        // { session }
      );
    }

    // 5. Mark user as voted
    user.hasVoted = true;
    await user.save(); // { session }

    // await session.commitTransaction();
    // session.endSession();

    res.status(201).json({
      status: 'success',
      message: 'Vote cast successfully!',
      data: {
        vote: newVote,
      },
    });

  } catch (error) {
    // await session.abortTransaction();
    // session.endSession();
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ 
        message: 'Validation Error when casting vote.', 
        errors: messages 
      });
    }
    console.error('Cast Vote Error:', error);
    res.status(500).json({ message: 'Error casting vote.', error: error.message });
  }
};

// Get election results (Admin/User)
exports.getElectionResults = async (req, res) => {
  try {
    const isVotingOpen = getVotingStatus();
    const activePositions = await Position.find({ status: 'active' }).sort({ order: 1 });

    const detailedResults = [];

    for (const position of activePositions) {
      let candidatesForPosition = await Candidate.find({ position: position._id })
        .sort({ votes: -1 })
        .select('firstName lastName profilePhoto votes')
        .lean(); // Use .lean() for plain JS objects if we're modifying them

      if (isVotingOpen) {
        // If voting is open, hide actual vote counts
        candidatesForPosition = candidatesForPosition.map(candidate => ({
          ...candidate,
          votes: null, // Or any placeholder like 'Hidden', or simply omit the field
        }));
      }

      detailedResults.push({
        positionId: position._id,
        positionName: position.name,
        numberOfWinners: position.minWinners, // Using minWinners as the number of winners
        candidates: candidatesForPosition,
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        isVotingOpen,
        positions: detailedResults,
      },
    });
  } catch (error) {
    console.error('Get Election Results Error:', error);
    res.status(500).json({ message: 'Error fetching election results.', error: error.message });
  }
};

// TODO: Add admin functions like closeVoting, clearDatabase in a separate adminController or here with admin checks.

// Get voting status for the authenticated user
exports.getUserVoteStatus = async (req, res) => {
  try {
    // req.user is populated by the authController.protect middleware
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }
    res.status(200).json({
      status: 'success',
      hasVoted: req.user.hasVoted, // Send the user's voting status
    });
  } catch (error) {
    console.error('Get User Vote Status Error:', error);
    res.status(500).json({ message: 'Error fetching user voting status.', error: error.message });
  }
};
