const electionState = require('../services/electionState');

// Get current voting status (publicly accessible for authenticated users)
exports.getPublicElectionStatus = async (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      isVotingOpen: electionState.getVotingStatus(),
    });
  } catch (error) {
    console.error('Get Public Election Status Error:', error);
    res.status(500).json({ message: 'Error fetching election status.', error: error.message });
  }
};
