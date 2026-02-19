const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// Helper to generate timestamp
const getTimestamp = () => new Date().toISOString();

// GET /api/custom-fields - List all custom fields (optional ?project_id= filter)
router.get('/', (req, res) => {
  try {
    const { project_id } = req.query;
    
    let query = `
      SELECT cf.*, p.name as project_name
      FROM custom_fields cf
      LEFT JOIN projects p ON cf.project_id = p.id
    `;
    let params = [];
    
    if (project_id) {
      // Get project-specific fields AND global fields (project_id IS NULL)
      query += ` WHERE cf.project_id = ? OR cf.project_id IS NULL`;
      params.push(project_id);
    }
    
    query += ` ORDER BY cf.sort_order ASC, cf.created_at ASC`;
    
    const fields = db.prepare(query).all(...params);
    
    // Parse options JSON for select/multiselect fields
    const parsedFields = fields.map(field => ({
      ...field,
      options: field.options ? JSON.parse(field.options) : null,
      required: !!field.required
    }));
    
    res.json({ success: true, data: parsedFields });
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'FETCH_ERROR', message: error.message } 
    });
  }
});

// GET /api/custom-fields/:id - Get single custom field
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const field = db.prepare(`
      SELECT cf.*, p.name as project_name
      FROM custom_fields cf
      LEFT JOIN projects p ON cf.project_id = p.id
      WHERE cf.id = ?
    `).get(id);
    
    if (!field) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Custom field not found' } 
      });
    }
    
    // Parse options JSON
    field.options = field.options ? JSON.parse(field.options) : null;
    field.required = !!field.required;
    
    res.json({ success: true, data: field });
  } catch (error) {
    console.error('Error fetching custom field:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'FETCH_ERROR', message: error.message } 
    });
  }
});

// POST /api/custom-fields - Create custom field
router.post('/', (req, res) => {
  try {
    const { name, field_type, project_id, options, required, sort_order } = req.body;
    
    // Validation
    if (!name || !field_type) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: 'Name and field_type are required' } 
      });
    }
    
    const validFieldTypes = ['text', 'number', 'date', 'select', 'multiselect', 'checkbox', 'url'];
    if (!validFieldTypes.includes(field_type)) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: `field_type must be one of: ${validFieldTypes.join(', ')}` } 
      });
    }
    
    // Validate options for select/multiselect fields
    if ((field_type === 'select' || field_type === 'multiselect') && !options) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: 'Options are required for select/multiselect fields' } 
      });
    }
    
    const id = uuidv4();
    const now = getTimestamp();
    const optionsJson = options ? JSON.stringify(options) : null;
    
    const stmt = db.prepare(`
      INSERT INTO custom_fields (id, name, field_type, project_id, options, required, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id, 
      name, 
      field_type, 
      project_id || null, 
      optionsJson, 
      required ? 1 : 0, 
      sort_order || 0,
      now, 
      now
    );
    
    const newField = db.prepare(`
      SELECT cf.*, p.name as project_name
      FROM custom_fields cf
      LEFT JOIN projects p ON cf.project_id = p.id
      WHERE cf.id = ?
    `).get(id);
    
    newField.options = newField.options ? JSON.parse(newField.options) : null;
    newField.required = !!newField.required;
    
    res.status(201).json({ success: true, data: newField });
  } catch (error) {
    console.error('Error creating custom field:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'CREATE_ERROR', message: error.message } 
    });
  }
});

// PUT /api/custom-fields/:id - Update custom field
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, field_type, project_id, options, required, sort_order } = req.body;
    
    // Check if field exists
    const existingField = db.prepare('SELECT * FROM custom_fields WHERE id = ?').get(id);
    if (!existingField) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Custom field not found' } 
      });
    }
    
    // Validate field_type if provided
    if (field_type) {
      const validFieldTypes = ['text', 'number', 'date', 'select', 'multiselect', 'checkbox', 'url'];
      if (!validFieldTypes.includes(field_type)) {
        return res.status(400).json({ 
          success: false, 
          error: { code: 'VALIDATION_ERROR', message: `field_type must be one of: ${validFieldTypes.join(', ')}` } 
        });
      }
    }
    
    const now = getTimestamp();
    const optionsJson = options !== undefined ? JSON.stringify(options) : existingField.options;
    
    const stmt = db.prepare(`
      UPDATE custom_fields 
      SET name = ?, field_type = ?, project_id = ?, options = ?, required = ?, sort_order = ?, updated_at = ?
      WHERE id = ?
    `);
    
    stmt.run(
      name ?? existingField.name,
      field_type ?? existingField.field_type,
      project_id !== undefined ? (project_id || null) : existingField.project_id,
      optionsJson,
      required !== undefined ? (required ? 1 : 0) : existingField.required,
      sort_order !== undefined ? sort_order : existingField.sort_order,
      now,
      id
    );
    
    const updatedField = db.prepare(`
      SELECT cf.*, p.name as project_name
      FROM custom_fields cf
      LEFT JOIN projects p ON cf.project_id = p.id
      WHERE cf.id = ?
    `).get(id);
    
    updatedField.options = updatedField.options ? JSON.parse(updatedField.options) : null;
    updatedField.required = !!updatedField.required;
    
    res.json({ success: true, data: updatedField });
  } catch (error) {
    console.error('Error updating custom field:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'UPDATE_ERROR', message: error.message } 
    });
  }
});

// DELETE /api/custom-fields/:id - Delete custom field
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const existingField = db.prepare('SELECT * FROM custom_fields WHERE id = ?').get(id);
    if (!existingField) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Custom field not found' } 
      });
    }
    
    // Delete the field (cascade will delete associated values)
    db.prepare('DELETE FROM custom_fields WHERE id = ?').run(id);
    
    res.json({ success: true, data: { id, message: 'Custom field deleted successfully' } });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'DELETE_ERROR', message: error.message } 
    });
  }
});

module.exports = router;
