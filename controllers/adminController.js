const User = require('../models/User');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const mongoose = require('mongoose');
const { getVotingStatus, setVotingStatus, getRegistrationStatus, setRegistrationStatus } = require('../services/electionState'); // Import electionState service
const xlsx = require('xlsx');


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

// Controller to import voters from an Excel file
exports.importVoters = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No Excel file uploaded. Please select a file with .xlsx or .xls extension.' });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Assuming data is in the first sheet
    if (!sheetName) {
        return res.status(400).json({ message: 'No sheets found in the Excel file.' });
    }
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const row of data) {
      // Normalize column names (case-insensitive)
      const normalizedRow = {};
      for (const key in row) {
        normalizedRow[key.toLowerCase()] = row[key];
      }

      const firstName = normalizedRow.firstname || normalizedRow.first_name;
      const lastName = normalizedRow.lastname || normalizedRow.last_name;
      const companyId = normalizedRow.companyid || normalizedRow.company_id;
      const password = normalizedRow.password;

      if (!firstName || !lastName || !companyId || !password) {
        errors.push(`Skipping row due to missing required data (firstName, lastName, companyId, password): ${JSON.stringify(row)}`);
        errorCount++;
        continue;
      }

      try {
        const existingUser = await User.findOne({ companyId: companyId.toString().toUpperCase() });
        if (existingUser) {
          skippedCount++;
          errors.push(`Skipped: User with Company ID ${companyId} already exists.`);
          continue;
        }

        await User.create({
          firstName: firstName.toString().trim(),
          lastName: lastName.toString().trim(),
          companyId: companyId.toString().trim().toUpperCase(),
          password: password.toString(), // Storing as plaintext as per user request
          role: 'user', // Default role for imported users
        });
        importedCount++;
      } catch (userCreationError) {
        errors.push(`Error creating user for Company ID ${companyId}: ${userCreationError.message}`);
        errorCount++;
      }
    }
    
    const adminUser = req.user ? `${req.user.fullName} (${req.user.companyId})` : 'Unknown Admin';
    console.log(`Voter import process completed by admin: ${adminUser} at ${new Date().toISOString()}. Imported: ${importedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);

    res.status(200).json({
      message: 'Voter import process completed.',
      importedCount,
      skippedCount, // Users that already existed or had issues
      errorCount,   // Rows with processing errors or missing data
      errors        // Specific error messages for skipped/error rows
    });

  } catch (error) {
    console.error('Error importing voters:', error);
    res.status(500).json({ message: 'Failed to process the Excel file. Ensure it is a valid Excel format and data is correct.', error: error.message });
  }
};

// Controller to export voters to an Excel file
exports.exportVoters = async (req, res) => {
  try {
    // Fetch all users with role 'user', explicitly selecting the password field
    const voters = await User.find({ role: 'user' })
      .select('firstName lastName companyId password hasVoted createdAt')
      .lean(); // Use .lean() for faster queries when not needing Mongoose documents

    if (!voters || voters.length === 0) {
      return res.status(404).json({ message: 'No voters found to export.' });
    }

    // Prepare data for Excel sheet
    const dataForSheet = voters.map(voter => ({
      FirstName: voter.firstName,
      LastName: voter.lastName,
      CompanyID: voter.companyId,
      Password: voter.password, // Password will be included as it's explicitly selected
      HasVoted: voter.hasVoted ? 'Yes' : 'No',
      CreatedAt: voter.createdAt ? new Date(voter.createdAt).toLocaleString() : '',
    }));

    // Create a new workbook and worksheet
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(dataForSheet);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Voters');

    // Set headers to prompt download
    const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    res.setHeader('Content-Disposition', 'attachment; filename="voters_export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.status(200).send(excelBuffer);

  } catch (error) {
    console.error('Error exporting voters:', error);
    res.status(500).json({ message: 'Failed to export voters.', error: error.message });
  }
};

// Controller to export admin users to an Excel file
exports.exportAdminUsers = async (req, res) => {
  try {
    // Fetch all users with role 'admin'
    const admins = await User.find({ role: 'admin' })
      .select('firstName lastName companyId createdAt') // Do not select password
      .lean();

    if (!admins || admins.length === 0) {
      return res.status(404).json({ message: 'No admin users found to export.' });
    }

    // Prepare data for Excel sheet
    const dataForSheet = admins.map(admin => ({
      FirstName: admin.firstName,
      LastName: admin.lastName,
      CompanyID: admin.companyId,
      Password: '', // Password field is intentionally blank for admin export
      CreatedAt: admin.createdAt ? new Date(admin.createdAt).toLocaleString() : '',
    }));

    // Create a new workbook and worksheet
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(dataForSheet);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Admins');

    // Set headers to prompt download
    const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    res.setHeader('Content-Disposition', 'attachment; filename="admins_export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.status(200).send(excelBuffer);

  } catch (error) {
    console.error('Error exporting admin users:', error);
    res.status(500).json({ message: 'Failed to export admin users.', error: error.message });
  }
};

// Controller to delete all voters (users with role 'user')
exports.deleteAllVoters = async (req, res) => {
  try {
    // It's crucial to ensure this operation is intended for 'user' role only
    // and not accidentally deleting admins or other roles.
    const result = await User.deleteMany({ role: 'user' });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No voters found to delete.' });
    }

    res.status(200).json({ 
      message: `Successfully deleted ${result.deletedCount} voters.`, 
      deletedCount: result.deletedCount 
    });

  } catch (error) {
    console.error('Error deleting all voters:', error);
    res.status(500).json({ message: 'Failed to delete all voters.', error: error.message });
  }
};
