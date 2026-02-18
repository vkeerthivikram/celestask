const express = require('express');
const router = express.Router();
const db = require('../db/database');
const crypto = require('crypto');

// GET /api/tags - List all tags with optional project filter
// Returns global tags (project_id = NULL) + project-specific tags
router.get('/', (req, res) => {
  try {
    const { project_id } = req.query;
    
    let query;
    const params = [];
    
    if (project_id) {
      // Return global tags + tags for the specific project
      query = 'SELECT * FROM tags WHERE project_id IS NULL OR project_id = ? ORDER BY project_id NULLS FIRST, name';
      params.push(project_id);
    } else {
      query = 'SELECT * FROM tags ORDER BY project_id NULLS FIRST, name';
    }
    
    const tags = db.prepare(query).all(...params);
    res.json({ success: true, data: tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'FETCH_ERROR', 
        message: 'Failed to fetch tags' 
      } 
    });
  }
});

// GET /api/tags/:id - Get single tag
router.get('/:id', (req, res) => {
  try {
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
    
    if (!tag) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Tag not found' 
        } 
      });
    }
    
    res.json({ success: true, data: tag });
  } catch (error) {
    console.error('Error fetching tag:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'FETCH_ERROR', 
        message: 'Failed to fetch tag' 
      } 
    });
  }
});

// POST /api/tags - Create tag
router.post('/', (req, res) => {
  try {
    const { name, color, project_id } = req.body;
    
    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Tag name is required' 
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
    const tagColor = color || '#6B7280';
    
    db.prepare(`
      INSERT INTO tags (id, name, color, project_id) 
      VALUES (?, ?, ?, ?)
    `).run(
      id, 
      name.trim(), 
      tagColor, 
      project_id || null
    );
    
    const newTag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    
    res.status(201).json({ success: true, data: newTag });
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'CREATE_ERROR', 
        message: 'Failed to create tag' 
      } 
    });
  }
});

// PUT /api/tags/:id - Update tag
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, project_id } = req.body;
    
    // Check if tag exists
    const existingTag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    if (!existingTag) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Tag not found' 
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
    
    // Update tag
    db.prepare(`
      UPDATE tags 
      SET name = COALESCE(?, name), 
          color = COALESCE(?, color), 
          project_id = COALESCE(?, project_id), 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(
      name !== undefined ? name.trim() : null,
      color !== undefined ? color : null,
      project_id !== undefined ? project_id : null,
      id
    );
    
    const updatedTag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    
    res.json({ success: true, data: updatedTag });
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'UPDATE_ERROR', 
        message: 'Failed to update tag' 
      } 
    });
  }
});

// DELETE /api/tags/:id - Delete tag
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if tag exists
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    if (!tag) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Tag not found' 
        } 
      });
    }
    
    // Delete tag (cascade will handle task_tags)
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    
    res.json({ success: true, message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DELETE_ERROR', 
        message: 'Failed to delete tag' 
      } 
    });
  }
});

module.exports = router;
