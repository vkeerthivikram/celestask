const express = require('express');
const cors = require('cors');
const path = require('path');

// Import database setup
const { createTables } = require('./db/schema');
const { seedDatabase } = require('./db/seed');

// Import routes
const projectsRouter = require('./routes/projects');
const tasksRouter = require('./routes/tasks');
const peopleRouter = require('./routes/people');
const tagsRouter = require('./routes/tags');
const notesRouter = require('./routes/notes');
const customFieldsRouter = require('./routes/customFields');
const savedViewsRouter = require('./routes/savedViews');
const importExportRouter = require('./routes/importExport');
const timeEntriesRouter = require('./routes/timeEntries');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 19096;

// Middleware
app.use(cors({
  origin: ['http://localhost:12096', 'http://127.0.0.1:12096'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize database
try {
  createTables();
  seedDatabase();
} catch (error) {
  console.error('Database initialization error:', error);
  process.exit(1);
}

// API Routes
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/people', peopleRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/notes', notesRouter);
app.use('/api/custom-fields', customFieldsRouter);
app.use('/api/saved-views', savedViewsRouter);
app.use('/api/export', importExportRouter);
app.use('/api/import', importExportRouter);
app.use('/api/time-entries', timeEntriesRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: { 
      code: 'NOT_FOUND', 
      message: 'Endpoint not found' 
    } 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(err.status || 500).json({ 
    success: false, 
    error: { 
      code: err.code || 'INTERNAL_ERROR', 
      message: err.message || 'Internal server error' 
    } 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
