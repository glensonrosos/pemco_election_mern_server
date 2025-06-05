const Position = require('../models/Position');
const Candidate = require('../models/Candidate'); // Needed for delete validation

// @desc    Create a new position
// @route   POST /api/positions
// @access  Private/Admin
exports.createPosition = async (req, res) => {
  try {
    const { name, description, status, order, minWinners, minSelectable, maxSelectable } = req.body;

    // Basic validation
    if (!name || minWinners === undefined || minSelectable === undefined || maxSelectable === undefined) {
      return res.status(400).json({ message: 'Name, minWinners, minSelectable, and maxSelectable are required.' });
    }

    const positionExists = await Position.findOne({ name });
    if (positionExists) {
      return res.status(400).json({ message: 'Position with this name already exists.' });
    }

    const position = new Position({
      name,
      description,
      status,
      order,
      minWinners,
      minSelectable,
      maxSelectable,
    });

    const createdPosition = await position.save();
    res.status(201).json(createdPosition);
  } catch (error) {
    console.error('Error creating position:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    res.status(500).json({ message: 'Server error while creating position.' });
  }
};

// @desc    Get all positions
// @route   GET /api/positions
// @access  Public (for voting setup) or Private/Admin (for management)
// We can add query params to filter by status, e.g., /api/positions?status=active
exports.getAllPositions = async (req, res) => {
  try {
    const query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }
    const positions = await Position.find(query).sort('order name'); // Sort by order, then by name
    res.status(200).json(positions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ message: 'Server error while fetching positions.' });
  }
};

// @desc    Get a single position by ID
// @route   GET /api/positions/:id
// @access  Private/Admin
exports.getPositionById = async (req, res) => {
  try {
    const position = await Position.findById(req.params.id);
    if (!position) {
      return res.status(404).json({ message: 'Position not found.' });
    }
    res.status(200).json(position);
  } catch (error) {
    console.error('Error fetching position by ID:', error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Position not found (invalid ID format).' });
    }
    res.status(500).json({ message: 'Server error while fetching position.' });
  }
};

// @desc    Update a position
// @route   PUT /api/positions/:id
// @access  Private/Admin
exports.updatePosition = async (req, res) => {
  try {
    const { name, description, status, order, minWinners, minSelectable, maxSelectable } = req.body;

    const position = await Position.findById(req.params.id);
    if (!position) {
      return res.status(404).json({ message: 'Position not found.' });
    }

    // Check if name is being changed and if the new name already exists
    if (name && name !== position.name) {
      const positionExists = await Position.findOne({ name });
      if (positionExists) {
        return res.status(400).json({ message: 'Another position with this name already exists.' });
      }
      position.name = name;
    }

    position.description = description !== undefined ? description : position.description;
    position.status = status !== undefined ? status : position.status;
    position.order = order !== undefined ? order : position.order;
    position.minWinners = minWinners !== undefined ? minWinners : position.minWinners;
    position.minSelectable = minSelectable !== undefined ? minSelectable : position.minSelectable;
    position.maxSelectable = maxSelectable !== undefined ? maxSelectable : position.maxSelectable;

    const updatedPosition = await position.save();
    res.status(200).json(updatedPosition);
  } catch (error) {
    console.error('Error updating position:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Position not found (invalid ID format).' });
    }
    res.status(500).json({ message: 'Server error while updating position.' });
  }
};

// @desc    Delete a position
// @route   DELETE /api/positions/:id
// @access  Private/Admin
exports.deletePosition = async (req, res) => {
  try {
    const position = await Position.findById(req.params.id);
    if (!position) {
      return res.status(404).json({ message: 'Position not found.' });
    }

    // Check if any candidates are assigned to this position
    const candidatesAssigned = await Candidate.countDocuments({ position: req.params.id });
    if (candidatesAssigned > 0) {
      return res.status(400).json({
        message: `Cannot delete position. ${candidatesAssigned} candidate(s) are currently assigned to it.`,
      });
    }

    await position.deleteOne(); // Mongoose 5.x and later
    res.status(200).json({ message: 'Position deleted successfully.' });
  } catch (error) {
    console.error('Error deleting position:', error);
    if (error.kind === 'ObjectId') {
        return res.status(404).json({ message: 'Position not found (invalid ID format).' });
    }
    res.status(500).json({ message: 'Server error while deleting position.' });
  }
};
