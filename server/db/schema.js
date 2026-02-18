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
    CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id)
  `);

  // Add assignee_id column to tasks table if it doesn't exist
  try {
    const tableInfo = db.prepare('PRAGMA table_info(tasks)').all();
    const hasAssigneeId = tableInfo.some(col => col.name === 'assignee_id');
    
    if (!hasAssigneeId) {
      db.exec(`ALTER TABLE tasks ADD COLUMN assignee_id TEXT REFERENCES people(id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id)`);
      console.log('Added assignee_id column to tasks table');
    }
  } catch (error) {
    console.error('Error adding assignee_id column:', error.message);
  }

  console.log('Database tables created successfully');
}

module.exports = { createTables };
