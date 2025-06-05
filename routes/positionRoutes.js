const express = require('express');
const router = express.Router();
const {
  createPosition,
  getAllPositions,
  getPositionById,
  updatePosition,
  deletePosition,
} = require('../controllers/positionController');
const { protect, admin } = require('../middleware/authMiddleware'); // Assuming auth middleware is here

// Routes for /api/positions
router
  .route('/')
  .post(protect, admin, createPosition) // Admin creates a position
  .get(getAllPositions); // Public access to get all positions (e.g., for voting page setup, can be filtered by status)

// Routes for /api/positions/:id
router
  .route('/:id')
  .get(protect, admin, getPositionById) // Admin gets a single position by ID
  .put(protect, admin, updatePosition) // Admin updates a position
  .delete(protect, admin, deletePosition); // Admin deletes a position

module.exports = router;
