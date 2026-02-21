const db = require('./database');

function createTables() {
  // Projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#3B82F6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      due_date DATE,
      start_date DATE,
      end_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // People table
  db.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      company TEXT,
      designation TEXT,
      project_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    )
  `);

  // Tags table (project_id can be NULL for global tags)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6B7280',
      project_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    )
  `);

  // Task assignees (co-assignees/collaborators)
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_assignees (
      id TEXT PRIMARY KEY,
      task_id INTEGER NOT NULL,
      person_id TEXT NOT NULL,
      role TEXT DEFAULT 'collaborator',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
      UNIQUE(task_id, person_id)
    )
  `);

  // Task tags (many-to-many relationship)
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_tags (
      id TEXT PRIMARY KEY,
      task_id INTEGER NOT NULL,
      tag_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
      UNIQUE(task_id, tag_id)
    )
  `);

  // Notes table for attaching notes to projects, tasks, and people
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_people_project_id ON people(project_id);
    CREATE INDEX IF NOT EXISTS idx_tags_project_id ON tags(project_id);
    CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_assignees_person_id ON task_assignees(person_id);
    CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id)
  `);

  // ==================== MIGRATION: Add v1.1.0 columns ====================
  
  // Add assignee_id column to tasks table if it doesn't exist
  try {
    const taskTableInfo = db.prepare('PRAGMA table_info(tasks)').all();
    const hasAssigneeId = taskTableInfo.some(col => col.name === 'assignee_id');
    
    if (!hasAssigneeId) {
      db.exec(`ALTER TABLE tasks ADD COLUMN assignee_id TEXT REFERENCES people(id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id)`);
      console.log('Added assignee_id column to tasks table');
    }
  } catch (error) {
    console.error('Error adding assignee_id column:', error.message);
  }

  // ==================== MIGRATION: Add v1.2.0 columns ====================
  
  // Add parent_project_id column to projects table for project hierarchy
  try {
    const projectTableInfo = db.prepare('PRAGMA table_info(projects)').all();
    const hasParentProjectId = projectTableInfo.some(col => col.name === 'parent_project_id');
    
    if (!hasParentProjectId) {
      db.exec(`ALTER TABLE projects ADD COLUMN parent_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_parent_id ON projects(parent_project_id)`);
      console.log('Added parent_project_id column to projects table');
    }
  } catch (error) {
    console.error('Error adding parent_project_id column:', error.message);
  }

  // Add hierarchy and progress columns to tasks table
  try {
    const taskTableInfo = db.prepare('PRAGMA table_info(tasks)').all();
    
    // Add parent_task_id for task hierarchy
    const hasParentTaskId = taskTableInfo.some(col => col.name === 'parent_task_id');
    if (!hasParentTaskId) {
      db.exec(`ALTER TABLE tasks ADD COLUMN parent_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_task_id)`);
      console.log('Added parent_task_id column to tasks table');
    }
    
    // Add progress_percent for progress tracking
    const hasProgressPercent = taskTableInfo.some(col => col.name === 'progress_percent');
    if (!hasProgressPercent) {
      db.exec(`ALTER TABLE tasks ADD COLUMN progress_percent INTEGER DEFAULT 0`);
      console.log('Added progress_percent column to tasks table');
    }
    
    // Add estimated_duration_minutes for time estimation
    const hasEstimatedDuration = taskTableInfo.some(col => col.name === 'estimated_duration_minutes');
    if (!hasEstimatedDuration) {
      db.exec(`ALTER TABLE tasks ADD COLUMN estimated_duration_minutes INTEGER`);
      console.log('Added estimated_duration_minutes column to tasks table');
    }
    
    // Add actual_duration_minutes for time tracking
    const hasActualDuration = taskTableInfo.some(col => col.name === 'actual_duration_minutes');
    if (!hasActualDuration) {
      db.exec(`ALTER TABLE tasks ADD COLUMN actual_duration_minutes INTEGER`);
      console.log('Added actual_duration_minutes column to tasks table');
    }

    // Add end_date for task scheduling
    const hasEndDate = taskTableInfo.some(col => col.name === 'end_date');
    if (!hasEndDate) {
      db.exec(`ALTER TABLE tasks ADD COLUMN end_date DATE`);
      console.log('Added end_date column to tasks table');
    }
  } catch (error) {
    console.error('Error adding v1.2.0 task columns:', error.message);
  }

  // ==================== MIGRATION: Add v1.3.0 columns ====================
  
  // Add owner_id column to projects table for project ownership
  try {
    const projectTableInfo = db.prepare('PRAGMA table_info(projects)').all();
    const hasOwnerId = projectTableInfo.some(col => col.name === 'owner_id');
    
    if (!hasOwnerId) {
      db.exec(`ALTER TABLE projects ADD COLUMN owner_id TEXT REFERENCES people(id) ON DELETE SET NULL`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id)`);
      console.log('Added owner_id column to projects table');
    }
  } catch (error) {
    console.error('Error adding owner_id column:', error.message);
  }

  // Create project_assignees table for project team members
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_assignees (
        id TEXT PRIMARY KEY,
        project_id INTEGER NOT NULL,
        person_id TEXT NOT NULL,
        role TEXT DEFAULT 'member' CHECK (role IN ('lead', 'member', 'observer')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
        UNIQUE(project_id, person_id)
      )
    `);
    
    db.exec(`CREATE INDEX IF NOT EXISTS idx_project_assignees_project_id ON project_assignees(project_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_project_assignees_person_id ON project_assignees(person_id)`);
    console.log('Created project_assignees table');
  } catch (error) {
    console.error('Error creating project_assignees table:', error.message);
  }

  // ==================== MIGRATION: Add v1.6.0 tables ====================
  
  // Create custom_fields table for custom field definitions
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS custom_fields (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select', 'multiselect', 'checkbox', 'url')),
        project_id INTEGER,
        options TEXT,
        required INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);
    
    db.exec(`CREATE INDEX IF NOT EXISTS idx_custom_fields_project ON custom_fields(project_id)`);
    console.log('Created custom_fields table');
  } catch (error) {
    console.error('Error creating custom_fields table:', error.message);
  }

  // Create custom_field_values table for storing custom field values on tasks
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS custom_field_values (
        id TEXT PRIMARY KEY,
        task_id INTEGER NOT NULL,
        custom_field_id TEXT NOT NULL,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (custom_field_id) REFERENCES custom_fields(id) ON DELETE CASCADE,
        UNIQUE(task_id, custom_field_id)
      )
    `);
    
    db.exec(`CREATE INDEX IF NOT EXISTS idx_custom_field_values_task ON custom_field_values(task_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_custom_field_values_field ON custom_field_values(custom_field_id)`);
    console.log('Created custom_field_values table');
  } catch (error) {
    console.error('Error creating custom_field_values table:', error.message);
  }

  // Create saved_views table for saved filter configurations
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS saved_views (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        view_type TEXT NOT NULL CHECK (view_type IN ('list', 'kanban', 'calendar', 'timeline')),
        project_id INTEGER,
        filters TEXT NOT NULL,
        sort_by TEXT,
        sort_order TEXT DEFAULT 'asc',
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);
    
    db.exec(`CREATE INDEX IF NOT EXISTS idx_saved_views_project ON saved_views(project_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_saved_views_type ON saved_views(view_type)`);
    console.log('Created saved_views table');
  } catch (error) {
    console.error('Error creating saved_views table:', error.message);
  }

  console.log('Database tables created successfully');
}

module.exports = { createTables };
