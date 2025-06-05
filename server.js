const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Uncomment if you need CORS for development with separate client/server ports

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001; // Port for the backend server

// Middleware
app.use(cors()); // Example: app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json()); // To parse JSON bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded bodies

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static('uploads'));

// MongoDB Configuration
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pemco_election_db';

mongoose.connect(MONGO_URI, {
  // useNewUrlParser: true, // Deprecated in Mongoose 6+
  // useUnifiedTopology: true, // Deprecated in Mongoose 6+
  // useCreateIndex: true, // Deprecated and not needed
  // useFindAndModify: false, // Deprecated and not needed
})
.then(() => console.log('MongoDB Connected Successfully!'))
.catch(err => console.error('MongoDB Connection Error:', err));

// Basic Route
app.get('/', (req, res) => {
  res.send('PEMCO Election API Running!');
});

// API routes
const authRoutes = require('./routes/authRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const voteRoutes = require('./routes/voteRoutes');
const adminRoutes = require('./routes/adminRoutes'); // Added admin routes
const electionRoutes = require('./routes/electionRoutes'); // Added election routes for public status
const positionRoutes = require('./routes/positionRoutes'); // Added position routes

app.use('/api/auth', authRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/admin', adminRoutes); // Added admin routes
app.use('/api/election', electionRoutes); // Added election routes
app.use('/api/positions', positionRoutes); // Added position routes

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
