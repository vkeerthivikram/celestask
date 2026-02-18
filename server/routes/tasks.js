const express = require('express');
const router = express.Router();
const db = require('../db/database');
const crypto = require('crypto');

// Valid status and priority values
const VALID_STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// GET /api/tasks - List all tasks with optional filters
router.get('/', (req, res) => {
  try {
    const { projectId, status, priority, search, assignee_id, tag_id } = req.query;
    
    let query = 'SELECT DISTINCT t.* FROM tasks t WHERE 1=1';
    const params = [];
    
    if (projectId) {
      query += ' AND t.project_id = ?';
      params.push(projectId);
    }
    
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    
    if (priority) {
      query += ' AND t.priority = ?';
      params.push(priority);
    }
    
    if (search) {
      query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    if (assignee_id) {
      // Filter by primary assignee or co-assignees
      query += ` AND (t.assignee_id = ? OR EXISTS (
        SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.person_id = ?
      ))`;
      params.push(assignee_id, assignee_id);
    }
    
    if (tag_id) {
      query += ` AND EXISTS (
        SELECT 1 FROM task_tags tt WHERE tt.task_id = t.id AND tt.tag_id = ?
      )`;
      params.push(tag_id);
    }
    
    query += ' ORDER BY t.created_at DESC';
    
    const tasks = db.prepare(query).all(...params);
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'FETCH_ERROR', 
        message: 'Failed to fetch tasks' 
      } 
    });
  }
});

// GET /api/tasks/:id - Get single task with assignee and tags
router.get('/:id', (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Task not found' 
        } 
      });
    }
    
    // Get primary assignee info
    let assignee = null;
    if (task.assignee_id) {
      assignee = db.prepare('SELECT * FROM people WHERE id = ?').get(task.assignee_id);
    }
    
    // Get co-assignees
    const coAssignees = db.prepare(`
      SELECT p.*, ta.role 
      FROM people p 
      JOIN task_assignees ta ON p.id = ta.person_id 
      WHERE ta.task_id = ?
    `).all(req.params.id);
    
    // Get tags
    const tags = db.prepare(`
      SELECT tg.* 
      FROM tags tg 
      JOIN task_tags tt ON tg.id = tt.tag_id 
      WHERE tt.task_id = ?
    `).all(req.params.id);
    
    res.json({ 
      success: true, 
      data: {
        ...task,
        assignee,
        coAssignees,
        tags
      }
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'FETCH_ERROR', 
        message: 'Failed to fetch task' 
      } 
    });
  }
});

// POST /api/tasks - Create task
router.post('/', (req, res) => {
  try {
    const { project_id, title, description, status, priority, due_date, start_date, assignee_id } = req.body;
    
    // Validation
    if (!title || title.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Task title is required' 
        } 
      });
    }
    
    if (!project_id) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Project ID is required' 
        } 
      });
    }
    
    // Check if project exists
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
    
    // Validate status
    const taskStatus = status || 'todo';
    if (!VALID_STATUSES.includes(taskStatus)) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` 
        } 
      });
    }
    
    // Validate priority
    const taskPriority = priority || 'medium';
    if (!VALID_PRIORITIES.includes(taskPriority)) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` 
        } 
      });
    }
    
    // Validate assignee_id if provided
    if (assignee_id) {
      const person = db.prepare('SELECT id FROM people WHERE id = ?').get(assignee_id);
      if (!person) {
        return res.status(400).json({ 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Assignee not found' 
          } 
        });
      }
    }
    
    const result = db.prepare(`
      INSERT INTO tasks (project_id, title, description, status, priority, due_date, start_date, assignee_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      project_id, 
      title.trim(), 
      description?.trim() || null, 
      taskStatus, 
      taskPriority, 
      due_date || null, 
      start_date || null,
      assignee_id || null
    );
    
    const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json({ success: true, data: newTask });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'CREATE_ERROR', 
        message: 'Failed to create task' 
      } 
    });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { project_id, title, description, status, priority, due_date, start_date, assignee_id } = req.body;
    
    // Check if task exists
    const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existingTask) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Task not found' 
        } 
      });
    }
    
    // Validate status if provided
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` 
        } 
      });
    }
    
    // Validate priority if provided
    if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` 
        } 
      });
    }
    
    // Validate project_id if provided
    if (project_id !== undefined) {
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
    
    // Validate assignee_id if provided
    if (assignee_id !== undefined && assignee_id !== null) {
      const person = db.prepare('SELECT id FROM people WHERE id = ?').get(assignee_id);
      if (!person) {
        return res.status(400).json({ 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Assignee not found' 
          } 
        });
      }
    }
    
    // Update task
    db.prepare(`
      UPDATE tasks 
      SET project_id = COALESCE(?, project_id), 
          title = COALESCE(?, title), 
          description = COALESCE(?, description), 
          status = COALESCE(?, status), 
          priority = COALESCE(?, priority), 
          due_date = COALESCE(?, due_date), 
          start_date = COALESCE(?, start_date), 
          assignee_id = COALESCE(?, assignee_id),
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(
      project_id !== undefined ? project_id : null,
      title !== undefined ? title.trim() : null,
      description !== undefined ? (description?.trim() || null) : null,
      status !== undefined ? status : null,
      priority !== undefined ? priority : null,
      due_date !== undefined ? (due_date || null) : null,
      start_date !== undefined ? (start_date || null) : null,
      assignee_id !== undefined ? assignee_id : null,
      id
    );
    
    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    
    res.json({ success: true, data: updatedTask });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'UPDATE_ERROR', 
        message: 'Failed to update task' 
      } 
    });
  }
});

// PATCH /api/tasks/:id/status - Update task status only (for Kanban)
router.patch('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` 
        } 
      });
    }
    
    // Check if task exists
    const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existingTask) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Task not found' 
        } 
      });
    }
    
    // Update status
    db.prepare(`
      UPDATE tasks 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(status, id);
    
    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    
    res.json({ success: true, data: updatedTask });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'UPDATE_ERROR', 
        message: 'Failed to update task status' 
      } 
    });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if task exists
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Task not found' 
        } 
      });
    }
    
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DELETE_ERROR', 
        message: 'Failed to delete task' 
      } 
    });
  }
});

// ==================== ASSIGNEE ENDPOINTS ====================

// GET /api/tasks/:id/assignees - Get all co-assignees for a task
router.get('/:id/assignees', (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if task exists
    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Task not found' 
        } 
      });
    }
    
    const assignees = db.prepare(`
      SELECT p.*, ta.role, ta.id as assignment_id
      FROM people p 
      JOIN task_assignees ta ON p.id = ta.person_id 
      WHERE ta.task_id = ?
    `).all(id);
    
    res.json({ success: true, data: assignees });
  } catch (error) {
    console.error('Error fetching task assignees:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'FETCH_ERROR', 
        message: 'Failed to fetch task assignees' 
      } 
    });
  }
});

// POST /api/tasks/:id/assignees - Add a co-assignee to a task
router.post('/:id/assignees', (req, res) => {
  try {
    const { id } = req.params;
    const { person_id, role } = req.body;
    
    if (!person_id) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Person ID is required' 
        } 
      });
    }
    
    // Check if task exists
    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Task not found' 
        } 
      });
    }
    
    // Check if person exists
    const person = db.prepare('SELECT * FROM people WHERE id = ?').get(person_id);
    if (!person) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Person not found' 
        } 
      });
    }
    
    // Check if already assigned
    const existing = db.prepare('SELECT id FROM task_assignees WHERE task_id = ? AND person_id = ?').get(id, person_id);
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'DUPLICATE_ERROR', 
          message: 'Person is already assigned to this task' 
        } 
      });
    }
    
    const assignmentId = crypto.randomUUID();
    const assignmentRole = role || 'collaborator';
    
    db.prepare(`
      INSERT INTO task_assignees (id, task_id, person_id, role) 
      VALUES (?, ?, ?, ?)
    `).run(assignmentId, id, person_id, assignmentRole);
    
    res.status(201).json({ 
      success: true, 
      data: {
        ...person,
        role: assignmentRole,
        assignment_id: assignmentId
      }
    });
  } catch (error) {
    console.error('Error adding task assignee:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'CREATE_ERROR', 
        message: 'Failed to add task assignee' 
      } 
    });
  }
});

// DELETE /api/tasks/:id/assignees/:personId - Remove a co-assignee from a task
router.delete('/:id/assignees/:personId', (req, res) => {
  try {
    const { id, personId } = req.params;
    
    const result = db.prepare('DELETE FROM task_assignees WHERE task_id = ? AND person_id = ?').run(id, personId);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Assignment not found' 
        } 
      });
    }
    
    res.json({ success: true, message: 'Assignee removed from task' });
  } catch (error) {
    console.error('Error removing task assignee:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DELETE_ERROR', 
        message: 'Failed to remove task assignee' 
      } 
    });
  }
});

// PUT /api/tasks/:id/assignee - Set primary assignee
router.put('/:id/assignee', (req, res) => {
  try {
    const { id } = req.params;
    const { assignee_id } = req.body;
    
    // Check if task exists
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Task not found' 
        } 
      });
    }
    
    // Validate assignee_id if provided (null means unassign)
    if (assignee_id !== null && assignee_id !== undefined) {
      const person = db.prepare('SELECT id FROM people WHERE id = ?').get(assignee_id);
      if (!person) {
        return res.status(404).json({ 
          success: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Person not found' 
          } 
        });
      }
    }
    
    db.prepare(`
      UPDATE tasks 
      SET assignee_id = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(assignee_id || null, id);
    
    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    
    res.json({ success: true, data: updatedTask });
  } catch (error) {
    console.error('Error updating task assignee:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'UPDATE_ERROR', 
        message: 'Failed to update task assignee' 
      } 
    });
  }
});

// ==================== TAG ENDPOINTS ====================

// GET /api/tasks/:id/tags - Get all tags for a task
router.get('/:id/tags', (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if task exists
    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Task not found' 
        } 
      });
    }
    
    const tags = db.prepare(`
      SELECT tg.*, tt.id as task_tag_id
      FROM tags tg 
      JOIN task_tags tt ON tg.id = tt.tag_id 
      WHERE tt.task_id = ?
    `).all(id);
    
    res.json({ success: true, data: tags });
  } catch (error) {
    console.error('Error fetching task tags:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'FETCH_ERROR', 
        message: 'Failed to fetch task tags' 
      } 
    });
  }
});

// POST /api/tasks/:id/tags - Add a tag to a task
router.post('/:id/tags', (req, res) => {
  try {
    const { id } = req.params;
    const { tag_id } = req.body;
    
    if (!tag_id) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Tag ID is required' 
        } 
      });
    }
    
    // Check if task exists
    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Task not found' 
        } 
      });
    }
    
    // Check if tag exists
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(tag_id);
    if (!tag) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Tag not found' 
        } 
      });
    }
    
    // Check if tag is already applied
    const existing = db.prepare('SELECT id FROM task_tags WHERE task_id = ? AND tag_id = ?').get(id, tag_id);
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'DUPLICATE_ERROR', 
          message: 'Tag is already applied to this task' 
        } 
      });
    }
    
    const taskTagId = crypto.randomUUID();
    
    db.prepare(`
      INSERT INTO task_tags (id, task_id, tag_id) 
      VALUES (?, ?, ?)
    `).run(taskTagId, id, tag_id);
    
    res.status(201).json({ 
      success: true, 
      data: {
        ...tag,
        task_tag_id: taskTagId
      }
    });
  } catch (error) {
    console.error('Error adding task tag:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'CREATE_ERROR', 
        message: 'Failed to add task tag' 
      } 
    });
  }
});

// DELETE /api/tasks/:id/tags/:tagId - Remove a tag from a task
router.delete('/:id/tags/:tagId', (req, res) => {
  try {
    const { id, tagId } = req.params;
    
    const result = db.prepare('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?').run(id, tagId);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: 'Tag association not found' 
        } 
      });
    }
    
    res.json({ success: true, message: 'Tag removed from task' });
  } catch (error) {
    console.error('Error removing task tag:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DELETE_ERROR', 
        message: 'Failed to remove task tag' 
      } 
    });
  }
});

module.exports = router;
