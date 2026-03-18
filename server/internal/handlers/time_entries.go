package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/celestask/server/internal/db"
	"github.com/celestask/server/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// TimeEntry represents a time entry record from the database
type TimeEntry struct {
	ID          string     `json:"id"`
	EntityType  string     `json:"entity_type"`
	EntityID    string     `json:"entity_id"`
	PersonID    *string    `json:"person_id"`
	Description *string    `json:"description"`
	StartTime   time.Time  `json:"start_time"`
	EndTime     *time.Time `json:"end_time"`
	DurationUs  *int64     `json:"duration_us"`
	IsRunning   int        `json:"is_running"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	PersonName  *string    `json:"person_name"`
	PersonEmail *string    `json:"person_email"`
}

// CreateTimeEntryRequest represents the request body for creating a time entry
type CreateTimeEntryRequest struct {
	PersonID        *string `json:"person_id"`
	Description     *string `json:"description"`
	StartTime       string  `json:"start_time"`
	EndTime         *string `json:"end_time"`
	DurationUs      *int64  `json:"duration_us"`
	DurationMinutes *int64  `json:"duration_minutes"`
}

// UpdateTimeEntryRequest represents the request body for updating a time entry
type UpdateTimeEntryRequest struct {
	PersonID        *string `json:"person_id"`
	Description     *string `json:"description"`
	StartTime       *string `json:"start_time"`
	EndTime         *string `json:"end_time"`
	DurationUs      *int64  `json:"duration_us"`
	DurationMinutes *int64  `json:"duration_minutes"`
}

// TaskTimeSummary represents a time summary for a task
type TaskTimeSummary struct {
	TaskID                string               `json:"task_id"`
	DirectTimeUs          int64                `json:"direct_time_us"`
	ChildrenTimeUs        int64                `json:"children_time_us"`
	TotalTimeUs           int64                `json:"total_time_us"`
	CurrentSessionUs      int64                `json:"current_session_us"`
	HasRunningTimer       bool                 `json:"has_running_timer"`
	RunningTimer          *TimeEntry           `json:"running_timer"`
	Entries               []TimeEntry          `json:"entries"`
	ChildrenTimeBreakdown []ChildTimeBreakdown `json:"children_time_breakdown"`
}

// ChildTimeBreakdown represents time spent on a child task
type ChildTimeBreakdown struct {
	TaskID     string `json:"task_id"`
	TaskTitle  string `json:"task_title"`
	TotalUs    int64  `json:"total_us"`
	EntryCount int    `json:"entry_count"`
}

// calculateDurationUs calculates duration in microseconds between two times
func calculateDurationUs(startTime, endTime time.Time) int64 {
	duration := endTime.Sub(startTime)
	return int64(duration.Microseconds())
}

// parseTime parses a time string in ISO format
func parseTime(timeStr string) (time.Time, error) {
	return time.Parse(time.RFC3339Nano, timeStr)
}

// rowToTimeEntry converts a database row to a TimeEntry struct
func rowToTimeEntry(row *sql.Row) (*TimeEntry, error) {
	var entry TimeEntry
	err := row.Scan(
		&entry.ID,
		&entry.EntityType,
		&entry.EntityID,
		&entry.PersonID,
		&entry.Description,
		&entry.StartTime,
		&entry.EndTime,
		&entry.DurationUs,
		&entry.IsRunning,
		&entry.CreatedAt,
		&entry.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &entry, nil
}

// rowsToTimeEntries converts multiple database rows to TimeEntry structs
func rowsToTimeEntries(rows *sql.Rows) ([]TimeEntry, error) {
	defer rows.Close()

	var entries []TimeEntry
	for rows.Next() {
		var entry TimeEntry
		err := rows.Scan(
			&entry.ID,
			&entry.EntityType,
			&entry.EntityID,
			&entry.PersonID,
			&entry.Description,
			&entry.StartTime,
			&entry.EndTime,
			&entry.DurationUs,
			&entry.IsRunning,
			&entry.CreatedAt,
			&entry.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Scan person info if available
		var personName, personEmail sql.NullString
		err = rows.Scan(&personName, &personEmail)
		if err == nil {
			if personName.Valid {
				entry.PersonName = &personName.String
			}
			if personEmail.Valid {
				entry.PersonEmail = &personEmail.String
			}
		}

		entries = append(entries, entry)
	}

	return entries, rows.Err()
}

// getTimeEntryByID retrieves a time entry by ID with optional person info
func getTimeEntryByID(database *db.Database, id string) (*TimeEntry, error) {
	row := database.QueryRow(`
		SELECT te.id, te.entity_type, te.entity_id, te.person_id, te.description,
		       te.start_time, te.end_time, te.duration_us, te.is_running,
		       te.created_at, te.updated_at,
		       p.name as person_name, p.email as person_email
		FROM time_entries te
		LEFT JOIN people p ON te.person_id = p.id
		WHERE te.id = ?
	`, id)

	return rowToTimeEntry(row)
}

// ==================== TASK TIME ENTRIES ====================

// GetTaskTimeEntries retrieves all time entries for a task
func GetTaskTimeEntries(c *gin.Context) {
	taskID := c.Param("taskId")
	if taskID == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("taskId is required"))
		return
	}

	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}
	database := databaseIface.(*db.Database)

	rows, err := database.Query(`
		SELECT te.id, te.entity_type, te.entity_id, te.person_id, te.description,
		       te.start_time, te.end_time, te.duration_us, te.is_running,
		       te.created_at, te.updated_at,
		       p.name as person_name, p.email as person_email
		FROM time_entries te
		LEFT JOIN people p ON te.person_id = p.id
		WHERE te.entity_type = 'task' AND te.entity_id = ?
		ORDER BY te.start_time DESC
	`, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time entries"))
		return
	}

	entries, err := scanTimeEntries(rows)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time entries"))
		return
	}

	if entries == nil {
		entries = []TimeEntry{}
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(entries))
}

// scanTimeEntries scans time entries from rows
func scanTimeEntries(rows *sql.Rows) ([]TimeEntry, error) {
	defer rows.Close()

	var entries []TimeEntry
	for rows.Next() {
		var entry TimeEntry
		err := rows.Scan(
			&entry.ID,
			&entry.EntityType,
			&entry.EntityID,
			&entry.PersonID,
			&entry.Description,
			&entry.StartTime,
			&entry.EndTime,
			&entry.DurationUs,
			&entry.IsRunning,
			&entry.CreatedAt,
			&entry.UpdatedAt,
			&entry.PersonName,
			&entry.PersonEmail,
		)
		if err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}

	return entries, rows.Err()
}

// GetTaskTimeSummary retrieves time summary for a task with subtask rollup
func GetTaskTimeSummary(c *gin.Context) {
	taskID := c.Param("taskId")
	if taskID == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("taskId is required"))
		return
	}

	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}
	database := databaseIface.(*db.Database)

	// Get direct time entries
	rows, err := database.Query(`
		SELECT te.id, te.entity_type, te.entity_id, te.person_id, te.description,
		       te.start_time, te.end_time, te.duration_us, te.is_running,
		       te.created_at, te.updated_at,
		       p.name as person_name, p.email as person_email
		FROM time_entries te
		LEFT JOIN people p ON te.person_id = p.id
		WHERE te.entity_type = 'task' AND te.entity_id = ?
		ORDER BY te.start_time DESC
	`, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time summary"))
		return
	}

	entries, err := scanTimeEntries(rows)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time summary"))
		return
	}

	// Calculate direct total
	var directTotalUs int64
	var hasRunningTimer bool
	var runningTimer *TimeEntry

	for _, e := range entries {
		if e.DurationUs != nil {
			directTotalUs += *e.DurationUs
		}
		if e.IsRunning == 1 {
			hasRunningTimer = true
			runningTimer = &e
		}
	}

	// Calculate current session duration if there's a running timer
	var currentSessionUs int64
	if runningTimer != nil {
		currentSessionUs = calculateDurationUs(runningTimer.StartTime, time.Now())
	}

	// Get descendant tasks (recursive)
	descendantRows, err := database.Query(`
		WITH RECURSIVE descendants AS (
			SELECT id FROM tasks WHERE parent_task_id = ?
			UNION ALL
			SELECT t.id FROM tasks t
			INNER JOIN descendants d ON t.parent_task_id = d.id
		)
		SELECT id FROM descendants
	`, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time summary"))
		return
	}
	defer descendantRows.Close()

	var childIDs []string
	for descendantRows.Next() {
		var childID string
		if err := descendantRows.Scan(&childID); err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time summary"))
			return
		}
		childIDs = append(childIDs, childID)
	}

	// Get time for each child task
	var childrenTotalUs int64
	var childrenTimeBreakdown []ChildTimeBreakdown

	for _, childID := range childIDs {
		childRows, err := database.Query(`
			SELECT te.id, te.entity_type, te.entity_id, te.person_id, te.description,
			       te.start_time, te.end_time, te.duration_us, te.is_running,
			       te.created_at, te.updated_at,
			       p.name as person_name, p.email as person_email,
			       t.title as task_title
			FROM time_entries te
			LEFT JOIN people p ON te.person_id = p.id
			LEFT JOIN tasks t ON te.entity_id = t.id
			WHERE te.entity_type = 'task' AND te.entity_id = ?
		`, childID)
		if err != nil {
			continue
		}

		childEntries, err := scanTimeEntries(childRows)
		if err != nil {
			childRows.Close()
			continue
		}

		var childUs int64
		var taskTitle string

		for _, e := range childEntries {
			if e.DurationUs != nil {
				childUs += *e.DurationUs
			}
			if taskTitle == "" && e.EntityID != "" {
				taskTitle = e.EntityID // Will get from query below
			}
		}

		if childUs > 0 {
			// Get task title
			var title string
			err := database.QueryRow("SELECT title FROM tasks WHERE id = ?", childID).Scan(&title)
			if err == nil {
				taskTitle = title
			} else {
				taskTitle = "Unknown"
			}

			childrenTimeBreakdown = append(childrenTimeBreakdown, ChildTimeBreakdown{
				TaskID:     childID,
				TaskTitle:  taskTitle,
				TotalUs:    childUs,
				EntryCount: len(childEntries),
			})
			childrenTotalUs += childUs
		}
	}

	summary := TaskTimeSummary{
		TaskID:                taskID,
		DirectTimeUs:          directTotalUs,
		ChildrenTimeUs:        childrenTotalUs,
		TotalTimeUs:           directTotalUs + childrenTotalUs,
		CurrentSessionUs:      currentSessionUs,
		HasRunningTimer:       hasRunningTimer,
		RunningTimer:          runningTimer,
		Entries:               entries,
		ChildrenTimeBreakdown: childrenTimeBreakdown,
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(summary))
}

// StartTaskTimer starts a timer for a task
func StartTaskTimer(c *gin.Context) {
	taskID := c.Param("taskId")
	if taskID == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("taskId is required"))
		return
	}

	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}
	database := databaseIface.(*db.Database)

	// Check if task exists
	var taskExists bool
	err := database.QueryRow("SELECT 1 FROM tasks WHERE id = ?", taskID).Scan(&taskExists)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Task"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("task"))
		return
	}

	// Parse request body
	var req struct {
		PersonID    *string `json:"person_id"`
		Description *string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "EOF" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Invalid request body"))
		return
	}

	// Stop any running timers for this task
	stopRunningTimers(database, "task", taskID, "")

	// Create new time entry
	id := uuid.New().String()
	now := time.Now()

	_, err = database.Exec(`
		INSERT INTO time_entries (id, entity_type, entity_id, person_id, description, start_time, is_running)
		VALUES (?, 'task', ?, ?, ?, ?, 1)
	`, id, taskID, req.PersonID, req.Description, now.Format(time.RFC3339Nano))
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewCreateError("time entry"))
		return
	}

	// Get the created entry
	entry, err := getTimeEntryByID(database, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time entry"))
		return
	}

	c.JSON(http.StatusCreated, middleware.NewSuccessResponse(entry))
}

// StopTaskTimer stops the running timer for a task
func StopTaskTimer(c *gin.Context) {
	taskID := c.Param("taskId")
	if taskID == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("taskId is required"))
		return
	}

	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}
	database := databaseIface.(*db.Database)

	// Find running entry
	var entryID string
	err := database.QueryRow(`
		SELECT id FROM time_entries 
		WHERE entity_type = 'task' AND entity_id = ? AND is_running = 1
	`, taskID).Scan(&entryID)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Running timer"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time entry"))
		return
	}

	// Get the entry to calculate duration
	entry, err := getTimeEntryByID(database, entryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time entry"))
		return
	}

	// Update the entry
	now := time.Now()
	duration := calculateDurationUs(entry.StartTime, now)

	_, err = database.Exec(`
		UPDATE time_entries 
		SET end_time = ?, duration_us = ?, is_running = 0, updated_at = ?
		WHERE id = ?
	`, now.Format(time.RFC3339Nano), duration, now.Format(time.RFC3339Nano), entryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("time entry"))
		return
	}

	// Get updated entry
	updatedEntry, err := getTimeEntryByID(database, entryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time entry"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(updatedEntry))
}

// CreateTaskTimeEntry creates a manual time entry for a task
func CreateTaskTimeEntry(c *gin.Context) {
	taskID := c.Param("taskId")
	if taskID == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("taskId is required"))
		return
	}

	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}
	database := databaseIface.(*db.Database)

	// Check if task exists
	var taskExists bool
	err := database.QueryRow("SELECT 1 FROM tasks WHERE id = ?", taskID).Scan(&taskExists)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Task"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("task"))
		return
	}

	// Parse request body
	var req CreateTimeEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Invalid request body"))
		return
	}

	if req.StartTime == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("start_time is required"))
		return
	}

	// Calculate duration
	var durationUs *int64
	if req.DurationUs != nil {
		durationUs = req.DurationUs
	} else if req.DurationMinutes != nil {
		us := *req.DurationMinutes * 60 * 1000000
		durationUs = &us
	} else if req.EndTime != nil {
		start, err := parseTime(req.StartTime)
		if err == nil {
			end, err := parseTime(*req.EndTime)
			if err == nil {
				d := calculateDurationUs(start, end)
				durationUs = &d
			}
		}
	}

	id := uuid.New().String()

	_, err = database.Exec(`
		INSERT INTO time_entries (id, entity_type, entity_id, person_id, description, start_time, end_time, duration_us, is_running)
		VALUES (?, 'task', ?, ?, ?, ?, ?, ?, 0)
	`, id, taskID, req.PersonID, req.Description, req.StartTime, req.EndTime, durationUs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewCreateError("time entry"))
		return
	}

	// Get the created entry
	entry, err := getTimeEntryByID(database, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time entry"))
		return
	}

	c.JSON(http.StatusCreated, middleware.NewSuccessResponse(entry))
}

// ==================== PROJECT TIME ENTRIES ====================

// GetProjectTimeEntries retrieves all time entries for a project
func GetProjectTimeEntries(c *gin.Context) {
	projectID := c.Param("projectId")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("projectId is required"))
		return
	}

	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}
	database := databaseIface.(*db.Database)

	rows, err := database.Query(`
		SELECT te.id, te.entity_type, te.entity_id, te.person_id, te.description,
		       te.start_time, te.end_time, te.duration_us, te.is_running,
		       te.created_at, te.updated_at,
		       p.name as person_name, p.email as person_email
		FROM time_entries te
		LEFT JOIN people p ON te.person_id = p.id
		WHERE te.entity_type = 'project' AND te.entity_id = ?
		ORDER BY te.start_time DESC
	`, projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time entries"))
		return
	}

	entries, err := scanTimeEntries(rows)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time entries"))
		return
	}

	if entries == nil {
		entries = []TimeEntry{}
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(entries))
}

// StartProjectTimer starts a timer for a project
func StartProjectTimer(c *gin.Context) {
	projectID := c.Param("projectId")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("projectId is required"))
		return
	}

	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}
	database := databaseIface.(*db.Database)

	// Check if project exists
	var projectExists bool
	err := database.QueryRow("SELECT 1 FROM projects WHERE id = ?", projectID).Scan(&projectExists)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Project"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("project"))
		return
	}

	// Parse request body
	var req struct {
		PersonID    *string `json:"person_id"`
		Description *string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "EOF" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Invalid request body"))
		return
	}

	// Stop any running timers for this project
	stopRunningTimers(database, "project", projectID, "")

	// Create new time entry
	id := uuid.New().String()
	now := time.Now()

	_, err = database.Exec(`
		INSERT INTO time_entries (id, entity_type, entity_id, person_id, description, start_time, is_running)
		VALUES (?, 'project', ?, ?, ?, ?, 1)
	`, id, projectID, req.PersonID, req.Description, now.Format(time.RFC3339Nano))
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewCreateError("time entry"))
		return
	}

	// Get the created entry
	entry, err := getTimeEntryByID(database, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time entry"))
		return
	}

	c.JSON(http.StatusCreated, middleware.NewSuccessResponse(entry))
}

// StopProjectTimer stops the running timer for a project
func StopProjectTimer(c *gin.Context) {
	projectID := c.Param("projectId")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("projectId is required"))
		return
	}

	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}
	database := databaseIface.(*db.Database)

	// Find running entry
	var entryID string
	err := database.QueryRow(`
		SELECT id FROM time_entries 
		WHERE entity_type = 'project' AND entity_id = ? AND is_running = 1
	`, projectID).Scan(&entryID)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Running timer"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time entry"))
		return
	}

	// Get the entry to calculate duration
	entry, err := getTimeEntryByID(database, entryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time entry"))
		return
	}

	// Update the entry
	now := time.Now()
	duration := calculateDurationUs(entry.StartTime, now)

	_, err = database.Exec(`
		UPDATE time_entries 
		SET end_time = ?, duration_us = ?, is_running = 0, updated_at = ?
		WHERE id = ?
	`, now.Format(time.RFC3339Nano), duration, now.Format(time.RFC3339Nano), entryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("time entry"))
		return
	}

	// Get updated entry
	updatedEntry, err := getTimeEntryByID(database, entryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time entry"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(updatedEntry))
}

// CreateProjectTimeEntry creates a manual time entry for a project
func CreateProjectTimeEntry(c *gin.Context) {
	projectID := c.Param("projectId")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("projectId is required"))
		return
	}

	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}
	database := databaseIface.(*db.Database)

	// Check if project exists
	var projectExists bool
	err := database.QueryRow("SELECT 1 FROM projects WHERE id = ?", projectID).Scan(&projectExists)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Project"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("project"))
		return
	}

	// Parse request body
	var req CreateTimeEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Invalid request body"))
		return
	}

	if req.StartTime == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("start_time is required"))
		return
	}

	// Calculate duration
	var durationUs *int64
	if req.DurationUs != nil {
		durationUs = req.DurationUs
	} else if req.DurationMinutes != nil {
		us := *req.DurationMinutes * 60 * 1000000
		durationUs = &us
	} else if req.EndTime != nil {
		start, err := parseTime(req.StartTime)
		if err == nil {
			end, err := parseTime(*req.EndTime)
			if err == nil {
				d := calculateDurationUs(start, end)
				durationUs = &d
			}
		}
	}

	id := uuid.New().String()

	_, err = database.Exec(`
		INSERT INTO time_entries (id, entity_type, entity_id, person_id, description, start_time, end_time, duration_us, is_running)
		VALUES (?, 'project', ?, ?, ?, ?, ?, ?, 0)
	`, id, projectID, req.PersonID, req.Description, req.StartTime, req.EndTime, durationUs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewCreateError("time entry"))
		return
	}

	// Get the created entry
	entry, err := getTimeEntryByID(database, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time entry"))
		return
	}

	c.JSON(http.StatusCreated, middleware.NewSuccessResponse(entry))
}

// ==================== GENERIC TIME ENTRY OPERATIONS ====================

// UpdateTimeEntry updates a time entry
func UpdateTimeEntry(c *gin.Context) {
	entryID := c.Param("id")
	if entryID == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("id is required"))
		return
	}

	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}
	database := databaseIface.(*db.Database)

	// Check if entry exists
	existing, err := getTimeEntryByID(database, entryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time entry"))
		return
	}
	if existing == nil {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Time entry"))
		return
	}

	// Parse request body
	var req UpdateTimeEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Invalid request body"))
		return
	}

	// Determine values to update
	personID := req.PersonID
	description := req.Description
	startTime := req.StartTime
	endTime := req.EndTime
	var durationUs *int64

	// Calculate duration if both start and end times are provided
	if existing.IsRunning == 0 && startTime != nil && endTime != nil {
		start, err := parseTime(*startTime)
		if err == nil {
			end, err := parseTime(*endTime)
			if err == nil {
				d := calculateDurationUs(start, end)
				durationUs = &d
			}
		}
	} else if req.DurationUs != nil {
		durationUs = req.DurationUs
	} else if req.DurationMinutes != nil {
		us := *req.DurationMinutes * 60 * 1000000
		durationUs = &us
	}

	now := time.Now()

	// Build dynamic update query
	query := "UPDATE time_entries SET "
	args := []interface{}{}

	if personID != nil {
		query += "person_id = ?, "
		args = append(args, *personID)
	}
	if description != nil {
		query += "description = ?, "
		args = append(args, *description)
	}
	if startTime != nil {
		query += "start_time = ?, "
		args = append(args, *startTime)
	}
	if endTime != nil {
		query += "end_time = ?, "
		args = append(args, *endTime)
	}
	if durationUs != nil {
		query += "duration_us = ?, "
		args = append(args, *durationUs)
	}

	query += "updated_at = ? WHERE id = ?"
	args = append(args, now.Format(time.RFC3339Nano), entryID)

	_, err = database.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("time entry"))
		return
	}

	// Get updated entry
	updatedEntry, err := getTimeEntryByID(database, entryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time entry"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(updatedEntry))
}

// DeleteTimeEntry deletes a time entry
func DeleteTimeEntry(c *gin.Context) {
	entryID := c.Param("id")
	if entryID == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("id is required"))
		return
	}

	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}
	database := databaseIface.(*db.Database)

	// Check if entry exists
	existing, err := getTimeEntryByID(database, entryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time entry"))
		return
	}
	if existing == nil {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Time entry"))
		return
	}

	// Delete the entry
	_, err = database.Exec("DELETE FROM time_entries WHERE id = ?", entryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewDeleteError("time entry"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(gin.H{"message": "Time entry deleted"}))
}

// stopRunningTimers stops all running timers for an entity, optionally excluding one
func stopRunningTimers(database *db.Database, entityType, entityID, excludeID string) {
	now := time.Now()

	var query string
	var args []interface{}

	if excludeID != "" {
		query = `
			SELECT id, start_time FROM time_entries 
			WHERE entity_type = ? AND entity_id = ? AND is_running = 1 AND id != ?
		`
		args = []interface{}{entityType, entityID, excludeID}
	} else {
		query = `
			SELECT id, start_time FROM time_entries 
			WHERE entity_type = ? AND entity_id = ? AND is_running = 1
		`
		args = []interface{}{entityType, entityID}
	}

	rows, err := database.Query(query, args...)
	if err != nil {
		fmt.Printf("Error querying running timers: %v\n", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		var startTime time.Time
		if err := rows.Scan(&id, &startTime); err != nil {
			continue
		}

		duration := calculateDurationUs(startTime, now)
		_, err = database.Exec(`
			UPDATE time_entries 
			SET end_time = ?, duration_us = ?, is_running = 0, updated_at = ?
			WHERE id = ?
		`, now.Format(time.RFC3339Nano), duration, now.Format(time.RFC3339Nano), id)
		if err != nil {
			fmt.Printf("Error stopping timer %s: %v\n", id, err)
		}
	}
}

// GetProjectTimeSummary returns a summary of time entries for a project
func GetProjectTimeSummary(c *gin.Context) {
projectID := c.Param("projectId")
if projectID == "" {
c.JSON(http.StatusBadRequest, middleware.NewValidationError("projectId is required"))
return
}

databaseIface, exists := c.Get("database")
if !exists {
c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
return
}
database := databaseIface.(*db.Database)

rows, err := database.Query(`
SELECT te.id, te.entity_type, te.entity_id, te.person_id, te.description,
       te.start_time, te.end_time, te.duration_us, te.is_running,
       te.created_at, te.updated_at,
       p.name as person_name, p.email as person_email
FROM time_entries te
LEFT JOIN people p ON te.person_id = p.id
WHERE te.entity_type = 'project' AND te.entity_id = ?
ORDER BY te.start_time DESC
`, projectID)
if err != nil {
c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time summary"))
return
}

entries, err := scanTimeEntries(rows)
if err != nil {
c.JSON(http.StatusInternalServerError, middleware.NewFetchError("time summary"))
return
}

var totalUs int64
var hasRunningTimer bool
var runningTimer *TimeEntry
for _, e := range entries {
if e.DurationUs != nil {
totalUs += *e.DurationUs
}
if e.IsRunning == 1 {
hasRunningTimer = true
runningTimer = &e
}
}

var currentSessionUs int64
if runningTimer != nil {
currentSessionUs = calculateDurationUs(runningTimer.StartTime, time.Now())
}

c.JSON(http.StatusOK, middleware.NewSuccessResponse(gin.H{
"project_id":         projectID,
"total_time_us":      totalUs,
"current_session_us": currentSessionUs,
"has_running_timer":  hasRunningTimer,
"running_timer":      runningTimer,
"entries":            entries,
}))
}

// GetRunningTimers returns all currently running time entries
func GetRunningTimers(c *gin.Context) {
databaseIface, exists := c.Get("database")
if !exists {
c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
return
}
database := databaseIface.(*db.Database)

rows, err := database.Query(`
SELECT te.id, te.entity_type, te.entity_id, te.person_id, te.description,
       te.start_time, te.end_time, te.duration_us, te.is_running,
       te.created_at, te.updated_at,
       p.name as person_name, p.email as person_email
FROM time_entries te
LEFT JOIN people p ON te.person_id = p.id
WHERE te.is_running = 1
ORDER BY te.start_time DESC
`)
if err != nil {
c.JSON(http.StatusInternalServerError, middleware.NewFetchError("running timers"))
return
}

entries, err := scanTimeEntries(rows)
if err != nil {
c.JSON(http.StatusInternalServerError, middleware.NewFetchError("running timers"))
return
}

if entries == nil {
entries = []TimeEntry{}
}

c.JSON(http.StatusOK, middleware.NewSuccessResponse(entries))
}

// StopAllTimers stops all currently running time entries and returns the count and IDs stopped
func StopAllTimers(c *gin.Context) {
databaseIface, exists := c.Get("database")
if !exists {
c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
return
}
database := databaseIface.(*db.Database)

// Find all running entries
rows, err := database.Query(`
SELECT id, start_time FROM time_entries WHERE is_running = 1
`)
if err != nil {
c.JSON(http.StatusInternalServerError, middleware.NewFetchError("running timers"))
return
}
defer rows.Close()

now := time.Now()
var stoppedIDs []string

for rows.Next() {
var id string
var startTime time.Time
if err := rows.Scan(&id, &startTime); err != nil {
continue
}
stoppedIDs = append(stoppedIDs, id)

duration := calculateDurationUs(startTime, now)
_, err = database.Exec(`
UPDATE time_entries
SET end_time = ?, duration_us = ?, is_running = 0, updated_at = ?
WHERE id = ?
`, now.Format(time.RFC3339Nano), duration, now.Format(time.RFC3339Nano), id)
if err != nil {
fmt.Printf("Error stopping timer %s: %v\n", id, err)
}
}

if stoppedIDs == nil {
stoppedIDs = []string{}
}

c.JSON(http.StatusOK, middleware.NewSuccessResponse(gin.H{
"stopped_count": len(stoppedIDs),
"stopped_ids":   stoppedIDs,
}))
}
