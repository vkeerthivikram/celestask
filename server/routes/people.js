const express = require('express');
const router = express.Router();
const db = require('../db/database');
const crypto = require('crypto');

// GET /api/people - List all people with optional project filter
router.get('/', (req, res) => {
  try {
    const { project_id } = req.query;
    
    let query = 'SELECT * FROM people WHERE 1=1';
    const params = [];
    
    if (project_id) {
      query += ' AND project_id = ?';
      params.push(project_id);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const people = db.prepare(query).all(...params);
    res.json({ success: true, data: people });
  } catch (error) {
    console.error('Error fetching people:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'FETCH_ERROR', 
        message: 'Failed to fetch people' 
      } 
    });
  }
});

// GET /api/people/:id - Get single person
router.get('/:id', (req, res) => {
  try {
    const person = db.prepare('SELECT * FROM people WHERE id = ?').get(req.params.id);
    
    if (!person) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Person not found' 
        } 
      });
    }
    
    res.json({ success: true, data: person });
  } catch (error) {
    console.error('Error fetching person:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'FETCH_ERROR', 
        message: 'Failed to fetch person' 
      } 
    });
  }
});

// POST /api/people - Create person
router.post('/', (req, res) => {
  try {
    const { name, email, company, designation, project_id } = req.body;
    
    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Person name is required' 
        } 
      });
    }
    
    // Validate project_id if provided
    if (project_id) {
      const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(project_id);
      if (!project) {
        return res.status(400).json({ 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Project not found' 
          } 
        });
      }
    }
    
    const id = crypto.randomUUID();
    
    db.prepare(`
      INSERT INTO people (id, name, email, company, designation, project_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id, 
      name.trim(), 
      email?.trim() || null, 
      company?.trim() || null, 
      designation?.trim() || null, 
      project_id || null
    );
    
    const newPerson = db.prepare('SELECT * FROM people WHERE id = ?').get(id);
    
    res.status(201).json({ success: true, data: newPerson });
  } catch (error) {
    console.error('Error creating person:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'CREATE_ERROR', 
        message: 'Failed to create person' 
      } 
    });
  }
});

// PUT /api/people/:id - Update person
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, company, designation, project_id } = req.body;
    
    // Check if person exists
    const existingPerson = db.prepare('SELECT * FROM people WHERE id = ?').get(id);
    if (!existingPerson) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Person not found' 
        } 
      });
    }
    
    // Validate project_id if provided
    if (project_id !== undefined && project_id !== null) {
      const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(project_id);
      if (!project) {
        return res.status(400).json({ 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Project not found' 
          } 
        });
      }
    }
    
    // Update person
    db.prepare(`
      UPDATE people 
      SET name = COALESCE(?, name), 
          email = COALESCE(?, email), 
          company = COALESCE(?, company), 
          designation = COALESCE(?, designation), 
          project_id = COALESCE(?, project_id), 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(
      name !== undefined ? name.trim() : null,
      email !== undefined ? (email?.trim() || null) : null,
      company !== undefined ? (company?.trim() || null) : null,
      designation !== undefined ? (designation?.trim() || null) : null,
      project_id !== undefined ? project_id : null,
      id
    );
    
    const updatedPerson = db.prepare('SELECT * FROM people WHERE id = ?').get(id);
    
    res.json({ success: true, data: updatedPerson });
  } catch (error) {
    console.error('Error updating person:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'UPDATE_ERROR', 
        message: 'Failed to update person' 
      } 
    });
  }
});

// DELETE /api/people/:id - Delete person
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if person exists
    const person = db.prepare('SELECT * FROM people WHERE id = ?').get(id);
    if (!person) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Person not found' 
        } 
      });
    }
    
    // Delete person (cascade will handle task_assignees)
    db.prepare('DELETE FROM people WHERE id = ?').run(id);
    
    res.json({ success: true, message: 'Person deleted successfully' });
  } catch (error) {
    console.error('Error deleting person:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DELETE_ERROR', 
        message: 'Failed to delete person' 
      } 
    });
  }
});

module.exports = router;
