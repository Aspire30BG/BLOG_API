const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const blogRoutes = require('./routes/blogRoutes');

// App config
dotenv.config();
const app = express();
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/blogs', blogRoutes);

// Home route
app.get('/', (req, res) => {
  res.send('Blogging API is running 🚀');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});


module.exports = app;