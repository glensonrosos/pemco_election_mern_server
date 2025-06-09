const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/register
router.post('/register', authController.registerUser);

// POST /api/auth/login
router.post('/login', authController.loginUser);

// POST /api/auth/change-password (Protected)
router.patch('/change-password', authController.protect, authController.changePassword);

// Example of a protected route (you can add more specific protected routes later)
// router.get('/me', authController.protect, (req, res) => {
//   res.status(200).json({
//     status: 'success',
//     data: {
//       user: req.user
//     }
//   });
// });

module.exports = router;
