package db

import (
	"fmt"
	"log"
)

// CreateSchema creates all the database tables and indexes
func CreateSchema(db *Database) error {
	// Enable foreign keys
	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return fmt.Errorf("failed to enable foreign keys: %w", err)
	}

	// Projects table
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS projects (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			description TEXT,
			color TEXT DEFAULT '#3B82F6',
			parent_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
			owner_id TEXT REFERENCES people(id) ON DELETE SET NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`); err != nil {
		return fmt.Errorf("failed to create projects table: %w", err)
	}

	// Tasks table
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS tasks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			project_id INTEGER NOT NULL,
			parent_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
			title TEXT NOT NULL,
			description TEXT,
			status TEXT DEFAULT 'todo',
			priority TEXT DEFAULT 'medium',
			assignee_id TEXT REFERENCES people(id) ON DELETE SET NULL,
			due_date DATE,
			start_date DATE,
			end_date DATE,
			progress_percent INTEGER DEFAULT 0,
			estimated_duration_minutes INTEGER,
			actual_duration_minutes INTEGER,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
		)
	`); err != nil {
		return fmt.Errorf("failed to create tasks table: %w", err)
	}

	// People table (UUID primary key)
	if _, err := db.Exec(`
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
	`); err != nil {
		return fmt.Errorf("failed to create people table: %w", err)
	}

	// Tags table (UUID primary key, project_id can be NULL for global tags)
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS tags (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			color TEXT DEFAULT '#6B7280',
			project_id INTEGER,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
		)
	`); err != nil {
		return fmt.Errorf("failed to create tags table: %w", err)
	}

	// Task assignees (co-assignees/collaborators)
	if _, err := db.Exec(`
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
	`); err != nil {
		return fmt.Errorf("failed to create task_assignees table: %w", err)
	}

	// Task tags (many-to-many relationship)
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS task_tags (
			id TEXT PRIMARY KEY,
			task_id INTEGER NOT NULL,
			tag_id TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
			FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
			UNIQUE(task_id, tag_id)
		)
	`); err != nil {
		return fmt.Errorf("failed to create task_tags table: %w", err)
	}

	// Notes table (UUID primary key)
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS notes (
			id TEXT PRIMARY KEY,
			content TEXT NOT NULL,
			entity_type TEXT NOT NULL,
			entity_id TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`); err != nil {
		return fmt.Errorf("failed to create notes table: %w", err)
	}

	// Project assignees table for project team members
	if _, err := db.Exec(`
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
	`); err != nil {
		return fmt.Errorf("failed to create project_assignees table: %w", err)
	}

	// Custom fields table (UUID primary key)
	if _, err := db.Exec(`
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
	`); err != nil {
		return fmt.Errorf("failed to create custom_fields table: %w", err)
	}

	// Custom field values table
	if _, err := db.Exec(`
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
	`); err != nil {
		return fmt.Errorf("failed to create custom_field_values table: %w", err)
	}

	// Saved views table
	if _, err := db.Exec(`
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
	`); err != nil {
		return fmt.Errorf("failed to create saved_views table: %w", err)
	}

	// Time entries table (UUID primary key)
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS time_entries (
			id TEXT PRIMARY KEY,
			entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project')),
			entity_id TEXT NOT NULL,
			person_id TEXT,
			description TEXT,
			start_time DATETIME NOT NULL,
			end_time DATETIME,
			duration_us INTEGER,
			is_running INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL
		)
	`); err != nil {
		return fmt.Errorf("failed to create time_entries table: %w", err)
	}

	// Pomodoro settings table
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS pomodoro_settings (
			id TEXT PRIMARY KEY,
			work_duration_us INTEGER NOT NULL DEFAULT 1500000000000,
			short_break_us INTEGER NOT NULL DEFAULT 300000000000,
			long_break_us INTEGER NOT NULL DEFAULT 900000000000,
			sessions_until_long_break INTEGER NOT NULL DEFAULT 4,
			auto_start_breaks INTEGER NOT NULL DEFAULT 0,
			auto_start_work INTEGER NOT NULL DEFAULT 0,
			notifications_enabled INTEGER NOT NULL DEFAULT 1,
			daily_goal INTEGER DEFAULT 8,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`); err != nil {
		return fmt.Errorf("failed to create pomodoro_settings table: %w", err)
	}

	// Insert default pomodoro settings if not exists
	if _, err := db.Exec(`INSERT OR IGNORE INTO pomodoro_settings (id) VALUES ('default')`); err != nil {
		return fmt.Errorf("failed to insert default pomodoro settings: %w", err)
	}

	// Pomodoro sessions table (UUID primary key)
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS pomodoro_sessions (
			id TEXT PRIMARY KEY,
			task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
			session_type TEXT NOT NULL CHECK(session_type IN ('work', 'short_break', 'long_break')),
			timer_state TEXT NOT NULL DEFAULT 'idle' CHECK(timer_state IN ('idle', 'running', 'paused')),
			duration_us INTEGER NOT NULL,
			elapsed_us INTEGER NOT NULL DEFAULT 0,
			started_at DATETIME,
			paused_at DATETIME,
			ended_at DATETIME,
			completed INTEGER NOT NULL DEFAULT 0,
			interrupted INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`); err != nil {
		return fmt.Errorf("failed to create pomodoro_sessions table: %w", err)
	}

	// Create indexes for performance
	indexes := []string{
		// Projects indexes
		"CREATE INDEX IF NOT EXISTS idx_projects_parent_id ON projects(parent_project_id)",
		"CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id)",

		// Tasks indexes
		"CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)",
		"CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)",
		"CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)",
		"CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)",
		"CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id)",
		"CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_task_id)",

		// People indexes
		"CREATE INDEX IF NOT EXISTS idx_people_project_id ON people(project_id)",

		// Tags indexes
		"CREATE INDEX IF NOT EXISTS idx_tags_project_id ON tags(project_id)",

		// Task assignees indexes
		"CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id)",
		"CREATE INDEX IF NOT EXISTS idx_task_assignees_person_id ON task_assignees(person_id)",

		// Task tags indexes
		"CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id)",
		"CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id)",

		// Notes index
		"CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id)",

		// Project assignees indexes
		"CREATE INDEX IF NOT EXISTS idx_project_assignees_project_id ON project_assignees(project_id)",
		"CREATE INDEX IF NOT EXISTS idx_project_assignees_person_id ON project_assignees(person_id)",

		// Custom fields index
		"CREATE INDEX IF NOT EXISTS idx_custom_fields_project ON custom_fields(project_id)",

		// Custom field values indexes
		"CREATE INDEX IF NOT EXISTS idx_custom_field_values_task ON custom_field_values(task_id)",
		"CREATE INDEX IF NOT EXISTS idx_custom_field_values_field ON custom_field_values(custom_field_id)",

		// Saved views indexes
		"CREATE INDEX IF NOT EXISTS idx_saved_views_project ON saved_views(project_id)",
		"CREATE INDEX IF NOT EXISTS idx_saved_views_type ON saved_views(view_type)",

		// Time entries indexes
		"CREATE INDEX IF NOT EXISTS idx_time_entries_entity ON time_entries(entity_type, entity_id)",
		"CREATE INDEX IF NOT EXISTS idx_time_entries_person ON time_entries(person_id)",
		"CREATE INDEX IF NOT EXISTS idx_time_entries_running ON time_entries(is_running)",

		// Pomodoro sessions indexes
		"CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_task ON pomodoro_sessions(task_id)",
		"CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_started ON pomodoro_sessions(started_at)",
	}

	for _, idx := range indexes {
		if _, err := db.Exec(idx); err != nil {
			return fmt.Errorf("failed to create index: %w", err)
		}
	}

	log.Println("Database schema created successfully")
	return nil
}

// SchemaExists checks if the database schema has been initialized
func SchemaExists(db *Database) (bool, error) {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='projects'").Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
