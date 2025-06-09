// server/services/electionState.js

let isVotingOpen = false; // Default: Voting is closed when the server starts
let isRegistrationOpen = false; // Default: Registration is closed when the server starts

/**
 * Gets the current voting status.
 * @returns {boolean} True if voting is open, false otherwise.
 */
const getVotingStatus = () => isVotingOpen;

/**
 * Sets the voting status.
 * @param {boolean} status - True to open voting, false to close it.
 */
const setVotingStatus = (status) => {
  isVotingOpen = status;
  console.log(`Voting status changed to: ${isVotingOpen ? 'OPEN' : 'CLOSED'}`);
};

/**
 * Gets the current registration status.
 * @returns {boolean} True if registration is open, false otherwise.
 */
const getRegistrationStatus = () => isRegistrationOpen;

/**
 * Sets the registration status.
 * @param {boolean} status - True to open registration, false to close it.
 */
const setRegistrationStatus = (status) => {
  isRegistrationOpen = status;
  console.log(`Registration status changed to: ${isRegistrationOpen ? 'OPEN' : 'CLOSED'}`);
};

module.exports = {
  getVotingStatus,
  setVotingStatus,
  getRegistrationStatus,
  setRegistrationStatus,
};
