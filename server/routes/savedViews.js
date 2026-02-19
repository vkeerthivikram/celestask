const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// Helper to generate timestamp
const getTimestamp = () => new Date().toISOString();

// GET /api/saved-views - List all saved views (optional ?project_id=&view_type= filters)
router.get('/', (req, res) => {
  try {
    const { project_id, view_type } = req.query;
    
    let query = `
      SELECT sv.*, p.name as project_name
      FROM saved_views sv
      LEFT JOIN projects p ON sv.project_id = p.id
      WHERE 1=1
    `;
    let params = [];
    
    if (project_id) {
      // Get project-specific views AND global views (project_id IS NULL)
      query += ` AND (sv.project_id = ? OR sv.project_id IS NULL)`;
      params.push(project_id);
    }
    
    if (view_type) {
      query += ` AND sv.view_type = ?`;
      params.push(view_type);
    }
    
    query += ` ORDER BY sv.name ASC`;
    
    const views = db.prepare(query).all(...params);
    
    // Parse filters JSON and convert is_default to boolean
    const parsedViews = views.map(view => ({
      ...view,
      filters: view.filters ? JSON.parse(view.filters) : {},
      is_default: !!view.is_default
    }));
    
    res.json({ success: true, data: parsedViews });
  } catch (error) {
    console.error('Error fetching saved views:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'FETCH_ERROR', message: error.message } 
    });
  }
});

// GET /api/saved-views/:id - Get single saved view
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const view = db.prepare(`
      SELECT sv.*, p.name as project_name
      FROM saved_views sv
      LEFT JOIN projects p ON sv.project_id = p.id
      WHERE sv.id = ?
    `).get(id);
    
    if (!view) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Saved view not found' } 
      });
    }
    
    // Parse filters JSON
    view.filters = view.filters ? JSON.parse(view.filters) : {};
    view.is_default = !!view.is_default;
    
    res.json({ success: true, data: view });
  } catch (error) {
    console.error('Error fetching saved view:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'FETCH_ERROR', message: error.message } 
    });
  }
});

// POST /api/saved-views - Create saved view
router.post('/', (req, res) => {
  try {
    const { name, view_type, project_id, filters, sort_by, sort_order, is_default } = req.body;
    
    // Validation
    if (!name || !view_type) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: 'Name and view_type are required' } 
      });
    }
    
    const validViewTypes = ['list', 'kanban', 'calendar', 'timeline'];
    if (!validViewTypes.includes(view_type)) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: `view_type must be one of: ${validViewTypes.join(', ')}` } 
      });
    }
    
    const id = uuidv4();
    const now = getTimestamp();
    const filtersJson = JSON.stringify(filters || {});
    
    // If this is set as default, unset any existing default for the same project and view_type
    if (is_default) {
      const unsetQuery = project_id
        ? `UPDATE saved_views SET is_default = 0 WHERE project_id = ? AND view_type = ?`
        : `UPDATE saved_views SET is_default = 0 WHERE project_id IS NULL AND view_type = ?`;
      
      if (project_id) {
        db.prepare(unsetQuery).run(project_id, view_type);
      } else {
        db.prepare(unsetQuery).run(view_type);
      }
    }
    
    const stmt = db.prepare(`
      INSERT INTO saved_views (id, name, view_type, project_id, filters, sort_by, sort_order, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id, 
      name, 
      view_type, 
      project_id || null, 
      filtersJson, 
      sort_by || null,
      sort_order || 'asc',
      is_default ? 1 : 0,
      now, 
      now
    );
    
    const newView = db.prepare(`
      SELECT sv.*, p.name as project_name
      FROM saved_views sv
      LEFT JOIN projects p ON sv.project_id = p.id
      WHERE sv.id = ?
    `).get(id);
    
    newView.filters = newView.filters ? JSON.parse(newView.filters) : {};
    newView.is_default = !!newView.is_default;
    
    res.status(201).json({ success: true, data: newView });
  } catch (error) {
    console.error('Error creating saved view:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'CREATE_ERROR', message: error.message } 
    });
  }
});

// PUT /api/saved-views/:id - Update saved view
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, view_type, project_id, filters, sort_by, sort_order, is_default } = req.body;
    
    // Check if view exists
    const existingView = db.prepare('SELECT * FROM saved_views WHERE id = ?').get(id);
    if (!existingView) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Saved view not found' } 
      });
    }
    
    // Validate view_type if provided
    if (view_type) {
      const validViewTypes = ['list', 'kanban', 'calendar', 'timeline'];
      if (!validViewTypes.includes(view_type)) {
        return res.status(400).json({ 
          success: false, 
          error: { code: 'VALIDATION_ERROR', message: `view_type must be one of: ${validViewTypes.join(', ')}` } 
        });
      }
    }
    
    const now = getTimestamp();
    const filtersJson = filters !== undefined ? JSON.stringify(filters) : existingView.filters;
    const effectiveViewType = view_type || existingView.view_type;
    const effectiveProjectId = project_id !== undefined ? (project_id || null) : existingView.project_id;
    
    // If this is being set as default, unset any existing default for the same project and view_type
    if (is_default) {
      const unsetQuery = effectiveProjectId
        ? `UPDATE saved_views SET is_default = 0 WHERE project_id = ? AND view_type = ? AND id != ?`
        : `UPDATE saved_views SET is_default = 0 WHERE project_id IS NULL AND view_type = ? AND id != ?`;
      
      if (effectiveProjectId) {
        db.prepare(unsetQuery).run(effectiveProjectId, effectiveViewType, id);
      } else {
        db.prepare(unsetQuery).run(effectiveViewType, id);
      }
    }
    
    const stmt = db.prepare(`
      UPDATE saved_views 
      SET name = ?, view_type = ?, project_id = ?, filters = ?, sort_by = ?, sort_order = ?, is_default = ?, updated_at = ?
      WHERE id = ?
    `);
    
    stmt.run(
      name ?? existingView.name,
      effectiveViewType,
      effectiveProjectId,
      filtersJson,
      sort_by !== undefined ? sort_by : existingView.sort_by,
      sort_order !== undefined ? sort_order : existingView.sort_order,
      is_default !== undefined ? (is_default ? 1 : 0) : existingView.is_default,
      now,
      id
    );
    
    const updatedView = db.prepare(`
      SELECT sv.*, p.name as project_name
      FROM saved_views sv
      LEFT JOIN projects p ON sv.project_id = p.id
      WHERE sv.id = ?
    `).get(id);
    
    updatedView.filters = updatedView.filters ? JSON.parse(updatedView.filters) : {};
    updatedView.is_default = !!updatedView.is_default;
    
    res.json({ success: true, data: updatedView });
  } catch (error) {
    console.error('Error updating saved view:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'UPDATE_ERROR', message: error.message } 
    });
  }
});

// DELETE /api/saved-views/:id - Delete saved view
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const existingView = db.prepare('SELECT * FROM saved_views WHERE id = ?').get(id);
    if (!existingView) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Saved view not found' } 
      });
    }
    
    db.prepare('DELETE FROM saved_views WHERE id = ?').run(id);
    
    res.json({ success: true, data: { id, message: 'Saved view deleted successfully' } });
  } catch (error) {
    console.error('Error deleting saved view:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'DELETE_ERROR', message: error.message } 
    });
  }
});

// PUT /api/saved-views/:id/set-default - Set as default view for project/type
router.put('/:id/set-default', (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if view exists
    const existingView = db.prepare('SELECT * FROM saved_views WHERE id = ?').get(id);
    if (!existingView) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Saved view not found' } 
      });
    }
    
    const now = getTimestamp();
    
    // Unset any existing default for the same project and view_type
    const unsetQuery = existingView.project_id
      ? `UPDATE saved_views SET is_default = 0 WHERE project_id = ? AND view_type = ?`
      : `UPDATE saved_views SET is_default = 0 WHERE project_id IS NULL AND view_type = ?`;
    
    if (existingView.project_id) {
      db.prepare(unsetQuery).run(existingView.project_id, existingView.view_type);
    } else {
      db.prepare(unsetQuery).run(existingView.view_type);
    }
    
    // Set this view as default
    db.prepare(`UPDATE saved_views SET is_default = 1, updated_at = ? WHERE id = ?`).run(now, id);
    
    const updatedView = db.prepare(`
      SELECT sv.*, p.name as project_name
      FROM saved_views sv
      LEFT JOIN projects p ON sv.project_id = p.id
      WHERE sv.id = ?
    `).get(id);
    
    updatedView.filters = updatedView.filters ? JSON.parse(updatedView.filters) : {};
    updatedView.is_default = !!updatedView.is_default;
    
    res.json({ success: true, data: updatedView });
  } catch (error) {
    console.error('Error setting default view:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'UPDATE_ERROR', message: error.message } 
    });
  }
});

module.exports = router;
