const express = require('express');
const router = express.Router();
const db = require('../db/database');
const crypto = require('crypto');

// Helper function to calculate duration in microseconds
function calculateDuration(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.round((end - start) * 1000);
}

// Helper function to stop all running timers for an entity
function stopRunningTimers(entityType, entityId, excludeId = null) {
  const now = new Date().toISOString();
  
  let query = `
    SELECT id, start_time FROM time_entries 
    WHERE entity_type = ? AND entity_id = ? AND is_running = 1
  `;
  const params = [entityType, entityId];
  
  if (excludeId) {
    query += ' AND id != ?';
    params.push(excludeId);
  }
  
  const runningEntries = db.prepare(query).all(...params);
  
  for (const entry of runningEntries) {
    const duration = calculateDuration(entry.start_time, now);
    db.prepare(`
      UPDATE time_entries 
      SET end_time = ?, duration_us = ?, is_running = 0, updated_at = ?
      WHERE id = ?
    `).run(now, duration, now, entry.id);
  }
  
  return runningEntries.length;
}

// ==================== TIME ENTRIES FOR TASKS ====================

// GET /api/time-entries/task/:taskId - Get all time entries for a task
router.get('/task/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    
    const entries = db.prepare(`
      SELECT te.*, p.name as person_name, p.email as person_email
      FROM time_entries te
      LEFT JOIN people p ON te.person_id = p.id
      WHERE te.entity_type = 'task' AND te.entity_id = ?
      ORDER BY te.start_time DESC
    `).all(taskId);
    
    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch time entries' }
    });
  }
});

// GET /api/time-entries/task/:taskId/summary - Get time summary for a task (with subtask rollup)
router.get('/task/:taskId/summary', (req, res) => {
  try {
    const { taskId } = req.params;
    
    const directEntries = db.prepare(`
      SELECT te.*, p.name as person_name, p.email as person_email
      FROM time_entries te
      LEFT JOIN people p ON te.person_id = p.id
      WHERE te.entity_type = 'task' AND te.entity_id = ?
      ORDER BY te.start_time DESC
    `).all(taskId);
    
    const directTotalUs = directEntries.reduce((sum, e) => sum + (e.duration_us || 0), 0);
    const hasRunningTimer = directEntries.some(e => e.is_running === 1);
    
    const runningTimer = directEntries.find(e => e.is_running === 1);
    let currentSessionUs = 0;
    if (runningTimer) {
      currentSessionUs = calculateDuration(runningTimer.start_time, new Date().toISOString());
    }
    
    const descendants = db.prepare(`
      WITH RECURSIVE descendants AS (
        SELECT id FROM tasks WHERE parent_task_id = ?
        UNION ALL
        SELECT t.id FROM tasks t
        INNER JOIN descendants d ON t.parent_task_id = d.id
      )
      SELECT id FROM descendants
    `).all(taskId);
    
    let childrenTotalUs = 0;
    const childrenTime = [];
    
    for (const desc of descendants) {
      const childEntries = db.prepare(`
        SELECT te.*, p.name as person_name, t.title as task_title
        FROM time_entries te
        LEFT JOIN people p ON te.person_id = p.id
        LEFT JOIN tasks t ON te.entity_id = t.id
        WHERE te.entity_type = 'task' AND te.entity_id = ?
      `).all(String(desc.id));
      
      const childUs = childEntries.reduce((sum, e) => sum + (e.duration_us || 0), 0);
      if (childUs > 0) {
        childrenTime.push({
          task_id: desc.id,
          task_title: childEntries[0]?.task_title || 'Unknown',
          total_us: childUs,
          entry_count: childEntries.length
        });
        childrenTotalUs += childUs;
      }
    }
    
    res.json({
      success: true,
      data: {
        task_id: taskId,
        direct_time_us: directTotalUs,
        children_time_us: childrenTotalUs,
        total_time_us: directTotalUs + childrenTotalUs,
        current_session_us: currentSessionUs,
        has_running_timer: hasRunningTimer,
        running_timer: runningTimer || null,
        entries: directEntries,
        children_time_breakdown: childrenTime
      }
    });
  } catch (error) {
    console.error('Error fetching time summary:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch time summary' }
    });
  }
});

// POST /api/time-entries/task/:taskId/start - Start a new timer for a task
router.post('/task/:taskId/start', (req, res) => {
  try {
    const { taskId } = req.params;
    const { person_id, description } = req.body;
    
    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' }
      });
    }
    
    stopRunningTimers('task', taskId);
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO time_entries (id, entity_type, entity_id, person_id, description, start_time, is_running)
      VALUES (?, 'task', ?, ?, ?, ?, 1)
    `).run(id, taskId, person_id || null, description || null, now);
    
    const entry = db.prepare(`
      SELECT te.*, p.name as person_name, p.email as person_email
      FROM time_entries te
      LEFT JOIN people p ON te.person_id = p.id
      WHERE te.id = ?
    `).get(id);
    
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('Error starting timer:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Failed to start timer' }
    });
  }
});

// POST /api/time-entries/task/:taskId/stop - Stop the running timer for a task
router.post('/task/:taskId/stop', (req, res) => {
  try {
    const { taskId } = req.params;
    
    const runningEntry = db.prepare(`
      SELECT * FROM time_entries 
      WHERE entity_type = 'task' AND entity_id = ? AND is_running = 1
    `).get(taskId);
    
    if (!runningEntry) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No running timer found for this task' }
      });
    }
    
    const now = new Date().toISOString();
    const duration = calculateDuration(runningEntry.start_time, now);
    
    db.prepare(`
      UPDATE time_entries 
      SET end_time = ?, duration_us = ?, is_running = 0, updated_at = ?
      WHERE id = ?
    `).run(now, duration, now, runningEntry.id);
    
    const entry = db.prepare(`
      SELECT te.*, p.name as person_name, p.email as person_email
      FROM time_entries te
      LEFT JOIN people p ON te.person_id = p.id
      WHERE te.id = ?
    `).get(runningEntry.id);
    
    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('Error stopping timer:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Failed to stop timer' }
    });
  }
});

// POST /api/time-entries/task/:taskId - Add a manual time entry
router.post('/task/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const { person_id, description, start_time, end_time, duration_us, duration_minutes } = req.body;
    
    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' }
      });
    }
    
    if (!start_time) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'start_time is required' }
      });
    }
    
    let finalDurationUs = duration_us;
    if (finalDurationUs === undefined && duration_minutes !== undefined) {
      finalDurationUs = duration_minutes * 60 * 1000000;
    }
    if (end_time && finalDurationUs === undefined) {
      finalDurationUs = calculateDuration(start_time, end_time);
    }
    
    const id = crypto.randomUUID();
    
    db.prepare(`
      INSERT INTO time_entries (id, entity_type, entity_id, person_id, description, start_time, end_time, duration_us, is_running)
      VALUES (?, 'task', ?, ?, ?, ?, ?, ?, 0)
    `).run(id, taskId, person_id || null, description || null, start_time, end_time || null, finalDurationUs || null);
    
    const entry = db.prepare(`
      SELECT te.*, p.name as person_name, p.email as person_email
      FROM time_entries te
      LEFT JOIN people p ON te.person_id = p.id
      WHERE te.id = ?
    `).get(id);
    
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('Error creating time entry:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Failed to create time entry' }
    });
  }
});

// PUT /api/time-entries/:id - Update a time entry
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { person_id, description, start_time, end_time, duration_us, duration_minutes } = req.body;
    
    const existing = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Time entry not found' }
      });
    }
    
    const now = new Date().toISOString();
    
    let finalDurationUs = duration_us;
    if (finalDurationUs === undefined && duration_minutes !== undefined) {
      finalDurationUs = duration_minutes * 60 * 1000000;
    }
    const finalStartTime = start_time || existing.start_time;
    const finalEndTime = end_time !== undefined ? end_time : existing.end_time;
    
    if (finalEndTime && !existing.is_running && finalDurationUs === undefined) {
      finalDurationUs = calculateDuration(finalStartTime, finalEndTime);
    }
    
    db.prepare(`
      UPDATE time_entries 
      SET person_id = COALESCE(?, person_id),
          description = COALESCE(?, description),
          start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          duration_us = COALESCE(?, duration_us),
          updated_at = ?
      WHERE id = ?
    `).run(
      person_id !== undefined ? person_id : null,
      description !== undefined ? description : null,
      start_time || null,
      finalEndTime !== undefined ? finalEndTime : null,
      finalDurationUs !== undefined ? finalDurationUs : null,
      now,
      id
    );
    
    const entry = db.prepare(`
      SELECT te.*, p.name as person_name, p.email as person_email
      FROM time_entries te
      LEFT JOIN people p ON te.person_id = p.id
      WHERE te.id = ?
    `).get(id);
    
    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('Error updating time entry:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Failed to update time entry' }
    });
  }
});

// DELETE /api/time-entries/:id - Delete a time entry
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Time entry not found' }
      });
    }
    
    db.prepare('DELETE FROM time_entries WHERE id = ?').run(id);
    
    res.json({ success: true, data: { message: 'Time entry deleted' } });
  } catch (error) {
    console.error('Error deleting time entry:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: 'Failed to delete time entry' }
    });
  }
});

// ==================== TIME ENTRIES FOR PROJECTS ====================

// GET /api/time-entries/project/:projectId - Get all time entries for a project
router.get('/project/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    
    const entries = db.prepare(`
      SELECT te.*, p.name as person_name, p.email as person_email
      FROM time_entries te
      LEFT JOIN people p ON te.person_id = p.id
      WHERE te.entity_type = 'project' AND te.entity_id = ?
      ORDER BY te.start_time DESC
    `).all(projectId);
    
    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('Error fetching project time entries:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch project time entries' }
    });
  }
});

// GET /api/time-entries/project/:projectId/summary - Get time summary for a project (with subproject rollup)
router.get('/project/:projectId/summary', (req, res) => {
  try {
    const { projectId } = req.params;
    
    const directEntries = db.prepare(`
      SELECT te.*, p.name as person_name, p.email as person_email
      FROM time_entries te
      LEFT JOIN people p ON te.person_id = p.id
      WHERE te.entity_type = 'project' AND te.entity_id = ?
      ORDER BY te.start_time DESC
    `).all(projectId);
    
    const directTotalUs = directEntries.reduce((sum, e) => sum + (e.duration_us || 0), 0);
    const hasRunningTimer = directEntries.some(e => e.is_running === 1);
    
    const runningTimer = directEntries.find(e => e.is_running === 1);
    let currentSessionUs = 0;
    if (runningTimer) {
      currentSessionUs = calculateDuration(runningTimer.start_time, new Date().toISOString());
    }
    
    const projectTasks = db.prepare(`
      SELECT id FROM tasks WHERE project_id = ?
    `).all(projectId);
    
    let tasksTotalUs = 0;
    const tasksTime = [];
    
    for (const task of projectTasks) {
      const taskSummary = db.prepare(`
        WITH RECURSIVE task_tree AS (
          SELECT id FROM tasks WHERE id = ?
          UNION ALL
          SELECT t.id FROM tasks t
          INNER JOIN task_tree tt ON t.parent_task_id = tt.id
        )
        SELECT 
          COALESCE(SUM(te.duration_us), 0) as total_us
        FROM task_tree tt
        LEFT JOIN time_entries te ON te.entity_type = 'task' AND te.entity_id = tt.id
      `).get(task.id);
      
      if (taskSummary && taskSummary.total_us > 0) {
        const taskInfo = db.prepare('SELECT id, title FROM tasks WHERE id = ?').get(task.id);
        tasksTime.push({
          task_id: task.id,
          task_title: taskInfo?.title || 'Unknown',
          total_us: taskSummary.total_us
        });
        tasksTotalUs += taskSummary.total_us;
      }
    }
    
    const descendantProjects = db.prepare(`
      WITH RECURSIVE descendants AS (
        SELECT id FROM projects WHERE parent_project_id = ?
        UNION ALL
        SELECT p.id FROM projects p
        INNER JOIN descendants d ON p.parent_project_id = d.id
      )
      SELECT id FROM descendants
    `).all(projectId);
    
    let subprojectsTotalUs = 0;
    const subprojectsTime = [];
    
    for (const subProj of descendantProjects) {
      const subProjEntries = db.prepare(`
        SELECT COALESCE(SUM(duration_us), 0) as total_us
        FROM time_entries 
        WHERE entity_type = 'project' AND entity_id = ?
      `).get(String(subProj.id));
      
      const subProjTasks = db.prepare(`
        SELECT COALESCE(SUM(te.duration_us), 0) as total_us
        FROM tasks t
        LEFT JOIN time_entries te ON te.entity_type = 'task' AND te.entity_id = t.id
        WHERE t.project_id = ?
      `).get(subProj.id);
      
      const subProjTotal = (subProjEntries?.total_us || 0) + (subProjTasks?.total_us || 0);
      
      if (subProjTotal > 0) {
        const projInfo = db.prepare('SELECT id, name FROM projects WHERE id = ?').get(subProj.id);
        subprojectsTime.push({
          project_id: subProj.id,
          project_name: projInfo?.name || 'Unknown',
          total_us: subProjTotal
        });
        subprojectsTotalUs += subProjTotal;
      }
    }
    
    res.json({
      success: true,
      data: {
        project_id: projectId,
        direct_time_us: directTotalUs,
        tasks_time_us: tasksTotalUs,
        subprojects_time_us: subprojectsTotalUs,
        total_time_us: directTotalUs + tasksTotalUs + subprojectsTotalUs,
        current_session_us: currentSessionUs,
        has_running_timer: hasRunningTimer,
        running_timer: runningTimer || null,
        entries: directEntries,
        tasks_time_breakdown: tasksTime,
        subprojects_time_breakdown: subprojectsTime
      }
    });
  } catch (error) {
    console.error('Error fetching project time summary:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch project time summary' }
    });
  }
});

// POST /api/time-entries/project/:projectId/start - Start a new timer for a project
router.post('/project/:projectId/start', (req, res) => {
  try {
    const { projectId } = req.params;
    const { person_id, description } = req.body;
    
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' }
      });
    }
    
    stopRunningTimers('project', projectId);
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO time_entries (id, entity_type, entity_id, person_id, description, start_time, is_running)
      VALUES (?, 'project', ?, ?, ?, ?, 1)
    `).run(id, projectId, person_id || null, description || null, now);
    
    const entry = db.prepare(`
      SELECT te.*, p.name as person_name, p.email as person_email
      FROM time_entries te
      LEFT JOIN people p ON te.person_id = p.id
      WHERE te.id = ?
    `).get(id);
    
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('Error starting project timer:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Failed to start project timer' }
    });
  }
});

// POST /api/time-entries/project/:projectId/stop - Stop the running timer for a project
router.post('/project/:projectId/stop', (req, res) => {
  try {
    const { projectId } = req.params;
    
    const runningEntry = db.prepare(`
      SELECT * FROM time_entries 
      WHERE entity_type = 'project' AND entity_id = ? AND is_running = 1
    `).get(projectId);
    
    if (!runningEntry) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No running timer found for this project' }
      });
    }
    
    const now = new Date().toISOString();
    const duration = calculateDuration(runningEntry.start_time, now);
    
    db.prepare(`
      UPDATE time_entries 
      SET end_time = ?, duration_us = ?, is_running = 0, updated_at = ?
      WHERE id = ?
    `).run(now, duration, now, runningEntry.id);
    
    const entry = db.prepare(`
      SELECT te.*, p.name as person_name, p.email as person_email
      FROM time_entries te
      LEFT JOIN people p ON te.person_id = p.id
      WHERE te.id = ?
    `).get(runningEntry.id);
    
    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('Error stopping project timer:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Failed to stop project timer' }
    });
  }
});

// POST /api/time-entries/project/:projectId - Add a manual time entry for a project
router.post('/project/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const { person_id, description, start_time, end_time, duration_us, duration_minutes } = req.body;
    
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' }
      });
    }
    
    if (!start_time) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'start_time is required' }
      });
    }
    
    let finalDurationUs = duration_us;
    if (finalDurationUs === undefined && duration_minutes !== undefined) {
      finalDurationUs = duration_minutes * 60 * 1000000;
    }
    if (end_time && finalDurationUs === undefined) {
      finalDurationUs = calculateDuration(start_time, end_time);
    }
    
    const id = crypto.randomUUID();
    
    db.prepare(`
      INSERT INTO time_entries (id, entity_type, entity_id, person_id, description, start_time, end_time, duration_us, is_running)
      VALUES (?, 'project', ?, ?, ?, ?, ?, ?, 0)
    `).run(id, projectId, person_id || null, description || null, start_time, end_time || null, finalDurationUs || null);
    
    const entry = db.prepare(`
      SELECT te.*, p.name as person_name, p.email as person_email
      FROM time_entries te
      LEFT JOIN people p ON te.person_id = p.id
      WHERE te.id = ?
    `).get(id);
    
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('Error creating project time entry:', error);
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Failed to create project time entry' }
    });
  }
});

// GET /api/time-entries/running - Get all currently running timers
router.get('/running', (req, res) => {
  try {
    const entries = db.prepare(`
      SELECT te.*, p.name as person_name, p.email as person_email,
        CASE 
          WHEN te.entity_type = 'task' THEN t.title
          WHEN te.entity_type = 'project' THEN pr.name
        END as entity_name
      FROM time_entries te
      LEFT JOIN people p ON te.person_id = p.id
      LEFT JOIN tasks t ON te.entity_type = 'task' AND te.entity_id = t.id
      LEFT JOIN projects pr ON te.entity_type = 'project' AND te.entity_id = pr.id
      WHERE te.is_running = 1
      ORDER BY te.start_time DESC
    `).all();
    
    const now = new Date();
    const entriesWithSession = entries.map(entry => ({
      ...entry,
      current_session_us: calculateDuration(entry.start_time, now.toISOString())
    }));
    
    res.json({ success: true, data: entriesWithSession });
  } catch (error) {
    console.error('Error fetching running timers:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch running timers' }
    });
  }
});

// POST /api/time-entries/stop-all - Stop all running timers
router.post('/stop-all', (req, res) => {
  try {
    const runningEntries = db.prepare(`
      SELECT * FROM time_entries WHERE is_running = 1
    `).all();
    
    const now = new Date().toISOString();
    const stoppedIds = [];
    
    for (const entry of runningEntries) {
      const duration = calculateDuration(entry.start_time, now);
      db.prepare(`
        UPDATE time_entries 
        SET end_time = ?, duration_us = ?, is_running = 0, updated_at = ?
        WHERE id = ?
      `).run(now, duration, now, entry.id);
      stoppedIds.push(entry.id);
    }
    
    res.json({ 
      success: true, 
      data: { 
        stopped_count: stoppedIds.length,
        stopped_ids: stoppedIds 
      } 
    });
  } catch (error) {
    console.error('Error stopping all timers:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Failed to stop all timers' }
    });
  }
});

module.exports = router;
