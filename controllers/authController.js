const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { getRegistrationStatus } = require('../services/electionState');
// It's good practice to store your JWT secret in an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-and-long-secret-key'; 
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'; // Token expiry time

// Function to sign a JWT token
const signToken = (userPayload) => { // Expect an object with user details
  return jwt.sign(userPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

// Controller for user registration
exports.registerUser = async (req, res) => {
  console.log('Backend: Received registration request body:', req.body);
  try {
    // Check if registration is currently open
    if (!getRegistrationStatus()) {
      return res.status(403).json({ message: 'User registration is currently disabled.' });
    }

    const { firstName, lastName, companyId, password } = req.body;

    // Basic validation (more comprehensive validation can be added)
    if (!firstName || !lastName || !companyId || !password) {
      return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    // Check if user already exists with the same companyId
    const existingUser = await User.findOne({ companyId });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this Company ID already exists.' });
    }

    const newUser = await User.create({
      firstName,
      lastName,
      companyId,
      password, // Password will be hashed by the pre-save middleware in User.js
    });

    // Remove password from output (even though it's hashed, it's good practice)
    newUser.password = undefined;

    // Create and send token
    const token = signToken({ 
      id: newUser._id, 
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      companyId: newUser.companyId,
      role: newUser.role 
    });

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: newUser,
      },
    });
  } catch (error) {
    // Handle Mongoose validation errors separately for better messages
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ 
        message: 'Validation Error', 
        errors: messages 
      });
    }
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Error registering user. Please try again later.', error: error.message });
  }
};

// Controller for user login
exports.loginUser = async (req, res) => {
  try {
    const { companyId, password } = req.body;

    // 1) Check if companyId and password exist
    if (!companyId || !password) {
      return res.status(400).json({ message: 'Please provide Company ID and password.' });
    }

    // 2) Check if user exists && password is correct
    const user = await User.findOne({ companyId }).select('+password'); // Explicitly select password

    if (!user || user.password !== password) { // Compare plaintext passwords
      return res.status(401).json({ message: 'Incorrect Company ID or password.' });
    }

    // 3) If everything ok, send token to client
    const token = signToken({ 
      id: user._id, 
      firstName: user.firstName,
      lastName: user.lastName,
      companyId: user.companyId,
      role: user.role 
    });

    // Remove password from output before sending user object
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Error logging in. Please try again later.', error: error.message });
  }
};

// Optional: Middleware to protect routes
exports.protect = async (req, res, next) => {
  try {
    // 1) Getting token and check if it's there
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'You are not logged in! Please log in to get access.' });
    }

    // 2) Verification token
    const decoded = await jwt.verify(token, JWT_SECRET); // jwt.verify is synchronous if secret is not a function

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({ message: 'The user belonging to this token does no longer exist.' });
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token. Please log in again.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Your token has expired! Please log in again.' });
    }
    console.error('Auth Protect Error:', error);
    res.status(401).json({ message: 'Authentication failed. Please log in again.', error: error.message });
  }
};

// Controller for changing user password
exports.changePassword = async (req, res) => {
  try {
    // 1) Get user from the collection (req.user is set by the protect middleware)
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // 2) Get passwords from body
    const { currentPassword, newPassword, newPasswordConfirm } = req.body;

    // 3) Check if currentPassword is correct
    if (user.password !== currentPassword) {
      return res.status(401).json({ message: 'Incorrect current password.' });
    }

    // 4) Check if newPassword and newPasswordConfirm are the same
    if (newPassword !== newPasswordConfirm) {
      return res.status(400).json({ message: 'New password and confirmation do not match.' });
    }

    // 5) Check if newPassword is different from old password
    if (newPassword === currentPassword) {
      return res.status(400).json({ message: 'New password must be different from the current password.' });
    }
    
    // 6) Basic validation for new password length (align with schema if needed)
    if (!newPassword || newPassword.length < 3) { // Assuming minlength is 3 from User model
        return res.status(400).json({ message: 'New password must be at least 3 characters long.' });
    }

    // 7) Update password
    user.password = newPassword;
    await user.save(); // This will now save the plaintext password directly

    // 8) Log user in again, send JWT
    const token = signToken({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      companyId: user.companyId,
      role: user.role
    });

    res.status(200).json({
      status: 'success',
      token,
      message: 'Password changed successfully.'
    });

  } catch (error) {
    console.error('Change Password Error:', error);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ 
          message: 'Validation Error updating password.', 
          errors: messages 
        });
      }
    res.status(500).json({ message: 'Error changing password. Please try again later.', error: error.message });
  }
};

// Middleware to restrict access to certain roles (e.g., 'admin')
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // req.user is set by the 'protect' middleware
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'User role not found. Access denied.' });
    }
    // roles is an array e.g. ['admin', 'super-admin']. 
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    next();
  };
};
