package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/celestask/server/internal/db"
	"github.com/celestask/server/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Valid status and priority values
var (
	ValidStatuses   = []string{"backlog", "todo", "in_progress", "review", "done"}
	ValidPriorities = []string{"low", "medium", "high", "urgent"}
)

// Task represents a task in the database
type Task struct {
	ID                       int            `json:"id"`
	ProjectID                int            `json:"project_id"`
	ParentTaskID             sql.NullInt64  `json:"parent_task_id"`
	Title                    string         `json:"title"`
	Description              sql.NullString `json:"description"`
	Status                   string         `json:"status"`
	Priority                 string         `json:"priority"`
	AssigneeID               sql.NullString `json:"assignee_id"`
	DueDate                  sql.NullString `json:"due_date"`
	StartDate                sql.NullString `json:"start_date"`
	EndDate                  sql.NullString `json:"end_date"`
	ProgressPercent          int            `json:"progress_percent"`
	EstimatedDurationMinutes sql.NullInt64  `json:"estimated_duration_minutes"`
	ActualDurationMinutes    sql.NullInt64  `json:"actual_duration_minutes"`
	CreatedAt                string         `json:"created_at"`
	UpdatedAt                string         `json:"updated_at"`
}

// TaskWithRelations represents a task with its related data
type TaskWithRelations struct {
	Task
	Assignee    *Person          `json:"assignee,omitempty"`
	CoAssignees []PersonWithRole `json:"co_assignees,omitempty"`
	Tags        []Tag            `json:"tags,omitempty"`
}

// PersonWithRole represents a person with their role in a task
type PersonWithRole struct {
	Person
	Role         string `json:"role"`
	AssignmentID string `json:"assignment_id"`
}

// Tag represents a tag (local type for this file - uses different pattern)
type Tag struct {
	ID        string        `json:"id"`
	Name      string        `json:"name"`
	Color     string        `json:"color"`
	ProjectID sql.NullInt64 `json:"project_id"`
	CreatedAt string        `json:"created_at"`
	UpdatedAt string        `json:"updated_at"`
}

// TaskProgress represents progress information for a task
type TaskProgress struct {
	TaskID              int             `json:"task_id"`
	ProgressPercent     int             `json:"progress_percent"`
	ChildrenCount       int             `json:"children_count"`
	AllDescendantsCount int             `json:"all_descendants_count,omitempty"`
	RollupType          string          `json:"rollup_type"`
	Children            []ChildProgress `json:"children,omitempty"`
}

// ChildProgress represents progress of a child task
type ChildProgress struct {
	ID              int    `json:"id"`
	Title           string `json:"title"`
	ProgressPercent int    `json:"progress_percent"`
}

// TaskCustomFieldValue represents a custom field value for a task
type TaskCustomFieldValue struct {
	ID            string         `json:"id"`
	TaskID        int            `json:"task_id"`
	CustomFieldID string         `json:"custom_field_id"`
	Value         sql.NullString `json:"value"`
	CreatedAt     string         `json:"created_at"`
	UpdatedAt     string         `json:"updated_at"`
	CustomField   CustomField    `json:"custom_field"`
}

// CreateTaskRequest represents the request body for creating a task
type CreateTaskRequest struct {
	ProjectID                int    `json:"project_id" binding:"required"`
	Title                    string `json:"title" binding:"required"`
	Description              string `json:"description"`
	Status                   string `json:"status"`
	Priority                 string `json:"priority"`
	DueDate                  string `json:"due_date"`
	StartDate                string `json:"start_date"`
	EndDate                  string `json:"end_date"`
	AssigneeID               string `json:"assignee_id"`
	ParentTaskID             *int   `json:"parent_task_id"`
	ProgressPercent          int    `json:"progress_percent"`
	EstimatedDurationMinutes int    `json:"estimated_duration_minutes"`
	ActualDurationMinutes    int    `json:"actual_duration_minutes"`
}

// UpdateTaskRequest represents the request body for updating a task
type UpdateTaskRequest struct {
	ProjectID                *int    `json:"project_id"`
	Title                    string  `json:"title"`
	Description              *string `json:"description"`
	Status                   string  `json:"status"`
	Priority                 string  `json:"priority"`
	DueDate                  *string `json:"due_date"`
	StartDate                *string `json:"start_date"`
	EndDate                  *string `json:"end_date"`
	AssigneeID               *string `json:"assignee_id"`
	ParentTaskID             *int    `json:"parent_task_id"`
	ProgressPercent          *int    `json:"progress_percent"`
	EstimatedDurationMinutes *int    `json:"estimated_duration_minutes"`
	ActualDurationMinutes    *int    `json:"actual_duration_minutes"`
}

// BulkUpdateRequest represents the request body for bulk updates
type BulkUpdateRequest struct {
	TaskIDs []int `json:"task_ids" binding:"required"`
	Updates struct {
		Status     string `json:"status"`
		Priority   string `json:"priority"`
		AssigneeID string `json:"assignee_id"`
	} `json:"updates" binding:"required"`
}

// AddAssigneeRequest represents the request body for adding an assignee
type AddAssigneeRequest struct {
	PersonID string `json:"person_id" binding:"required"`
	Role     string `json:"role"`
}

// AddTagRequest represents the request body for adding a tag
type AddTagRequest struct {
	TagID string `json:"tag_id" binding:"required"`
}

// SetCustomFieldRequest represents the request body for setting a custom field
type SetCustomFieldRequest struct {
	Value interface{} `json:"value"`
}

// isValidStatus checks if the status is valid
func isValidStatus(status string) bool {
	for _, s := range ValidStatuses {
		if s == status {
			return true
		}
	}
	return false
}

// isValidPriority checks if the priority is valid
func isValidPriority(priority string) bool {
	for _, p := range ValidPriorities {
		if p == priority {
			return true
		}
	}
	return false
}

// Helper to scan a Task from a row
func scanTask(rows *sql.Rows) (Task, error) {
	var t Task
	err := rows.Scan(
		&t.ID,
		&t.ProjectID,
		&t.ParentTaskID,
		&t.Title,
		&t.Description,
		&t.Status,
		&t.Priority,
		&t.AssigneeID,
		&t.DueDate,
		&t.StartDate,
		&t.EndDate,
		&t.ProgressPercent,
		&t.EstimatedDurationMinutes,
		&t.ActualDurationMinutes,
		&t.CreatedAt,
		&t.UpdatedAt,
	)
	return t, err
}

// Helper to scan a Task from a row (single row query)
func scanTaskRow(row *sql.Row) (Task, error) {
	var t Task
	err := row.Scan(
		&t.ID,
		&t.ProjectID,
		&t.ParentTaskID,
		&t.Title,
		&t.Description,
		&t.Status,
		&t.Priority,
		&t.AssigneeID,
		&t.DueDate,
		&t.StartDate,
		&t.EndDate,
		&t.ProgressPercent,
		&t.EstimatedDurationMinutes,
		&t.ActualDurationMinutes,
		&t.CreatedAt,
		&t.UpdatedAt,
	)
	return t, err
}

// GetTasks handles GET /api/tasks - List all tasks with optional filters
func GetTasks(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)

	projectID := c.Query("projectId")
	status := c.Query("status")
	priority := c.Query("priority")
	search := c.Query("search")
	assigneeID := c.Query("assignee_id")
	tagID := c.Query("tag_id")
	parentTaskID := c.Query("parent_task_id")

	query := "SELECT DISTINCT t.* FROM tasks t WHERE 1=1"
	var params []interface{}

	if projectID != "" {
		query += " AND t.project_id = ?"
		params = append(params, projectID)
	}

	if status != "" {
		query += " AND t.status = ?"
		params = append(params, status)
	}

	if priority != "" {
		query += " AND t.priority = ?"
		params = append(params, priority)
	}

	if search != "" {
		query += " AND (t.title LIKE ? OR t.description LIKE ?)"
		searchTerm := "%" + search + "%"
		params = append(params, searchTerm, searchTerm)
	}

	if assigneeID != "" {
		query += ` AND (t.assignee_id = ? OR EXISTS (
			SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.person_id = ?
		))`
		params = append(params, assigneeID, assigneeID)
	}

	if tagID != "" {
		query += ` AND EXISTS (
			SELECT 1 FROM task_tags tt WHERE tt.task_id = t.id AND tt.tag_id = ?
		)`
		params = append(params, tagID)
	}

	if parentTaskID != "" {
		if parentTaskID == "null" {
			query += " AND t.parent_task_id IS NULL"
		} else {
			query += " AND t.parent_task_id = ?"
			params = append(params, parentTaskID)
		}
	}

	query += " ORDER BY t.created_at DESC"

	rows, err := database.Query(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("tasks"))
		return
	}
	defer rows.Close()

	var tasks []Task
	for rows.Next() {
		task, err := scanTask(rows)
		if err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewFetchError("tasks"))
			return
		}
		tasks = append(tasks, task)
	}

	if tasks == nil {
		tasks = []Task{}
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(tasks))
}

// GetTask handles GET /api/tasks/:id - Get single task with assignees and tags
func GetTask(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")

	// Get the task
	var task Task
	err := database.QueryRow(`
		SELECT id, project_id, parent_task_id, title, description, status, priority,
		       assignee_id, due_date, start_date, end_date, progress_percent,
		       estimated_duration_minutes, actual_duration_minutes, created_at, updated_at
		FROM tasks WHERE id = ?`, taskID).Scan(
		&task.ID,
		&task.ProjectID,
		&task.ParentTaskID,
		&task.Title,
		&task.Description,
		&task.Status,
		&task.Priority,
		&task.AssigneeID,
		&task.DueDate,
		&task.StartDate,
		&task.EndDate,
		&task.ProgressPercent,
		&task.EstimatedDurationMinutes,
		&task.ActualDurationMinutes,
		&task.CreatedAt,
		&task.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Task"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("Task"))
		return
	}

	// Get primary assignee info
	var assignee *Person
	if task.AssigneeID.Valid {
		var p Person
		err := database.QueryRow(`
			SELECT id, name, email, company, designation, project_id, created_at, updated_at
			FROM people WHERE id = ?`, task.AssigneeID.String).Scan(
			&p.ID, &p.Name, &p.Email, &p.Company, &p.Designation, &p.ProjectID, &p.CreatedAt, &p.UpdatedAt,
		)
		if err == nil {
			assignee = &p
		}
	}

	// Get co-assignees
	coAssigneesRows, err := database.Query(`
		SELECT p.id, p.name, p.email, p.company, p.designation, p.project_id, p.created_at, p.updated_at, ta.role, ta.id
		FROM people p 
		JOIN task_assignees ta ON p.id = ta.person_id 
		WHERE ta.task_id = ?`, taskID)
	var coAssignees []PersonWithRole
	if err == nil {
		defer coAssigneesRows.Close()
		for coAssigneesRows.Next() {
			var pwr PersonWithRole
			var role, assignmentID string
			coAssigneesRows.Scan(
				&pwr.ID, &pwr.Name, &pwr.Email, &pwr.Company, &pwr.Designation,
				&pwr.ProjectID, &pwr.CreatedAt, &pwr.UpdatedAt, &role, &assignmentID,
			)
			pwr.Role = role
			pwr.AssignmentID = assignmentID
			coAssignees = append(coAssignees, pwr)
		}
	}

	// Get tags
	tagsRows, err := database.Query(`
		SELECT tg.id, tg.name, tg.color, tg.project_id, tg.created_at, tg.updated_at
		FROM tags tg 
		JOIN task_tags tt ON tg.id = tt.tag_id 
		WHERE tt.task_id = ?`, taskID)
	var tags []Tag
	if err == nil {
		defer tagsRows.Close()
		for tagsRows.Next() {
			var t Tag
			tagsRows.Scan(&t.ID, &t.Name, &t.Color, &t.ProjectID, &t.CreatedAt, &t.UpdatedAt)
			tags = append(tags, t)
		}
	}

	taskWithRelations := TaskWithRelations{
		Task:        task,
		Assignee:    assignee,
		CoAssignees: coAssignees,
		Tags:        tags,
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(taskWithRelations))
}

// CreateTask handles POST /api/tasks - Create new task
func CreateTask(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)

	var req CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError(err.Error()))
		return
	}

	// Validation
	if req.Title == "" || strings.TrimSpace(req.Title) == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Task title is required"))
		return
	}

	if req.ProjectID == 0 {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Project ID is required"))
		return
	}

	// Validate status
	status := "todo"
	if req.Status != "" {
		if !isValidStatus(req.Status) {
			c.JSON(http.StatusBadRequest, middleware.NewValidationError(fmt.Sprintf("Invalid status. Must be one of: %s", strings.Join(ValidStatuses, ", "))))
			return
		}
		status = req.Status
	}

	// Validate priority
	priority := "medium"
	if req.Priority != "" {
		if !isValidPriority(req.Priority) {
			c.JSON(http.StatusBadRequest, middleware.NewValidationError(fmt.Sprintf("Invalid priority. Must be one of: %s", strings.Join(ValidPriorities, ", "))))
			return
		}
		priority = req.Priority
	}

	// Validate progress_percent
	progress := req.ProgressPercent
	if progress < 0 || progress > 100 {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Progress percent must be between 0 and 100"))
		return
	}

	// Check project exists
	var projectExists bool
	err := database.QueryRow("SELECT 1 FROM projects WHERE id = ?", req.ProjectID).Scan(&projectExists)
	if err != nil || !projectExists {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Project not found"))
		return
	}

	// Check assignee exists if provided
	if req.AssigneeID != "" {
		var personExists bool
		err := database.QueryRow("SELECT 1 FROM people WHERE id = ?", req.AssigneeID).Scan(&personExists)
		if err != nil || !personExists {
			c.JSON(http.StatusBadRequest, middleware.NewValidationError("Assignee not found"))
			return
		}
	}

	// Check parent task exists if provided
	var parentTaskID interface{}
	if req.ParentTaskID != nil {
		var parentTaskExists bool
		err := database.QueryRow("SELECT 1 FROM tasks WHERE id = ?", *req.ParentTaskID).Scan(&parentTaskExists)
		if err != nil || !parentTaskExists {
			c.JSON(http.StatusBadRequest, middleware.NewValidationError("Parent task not found"))
			return
		}
		parentTaskID = *req.ParentTaskID
	}

	result, err := database.Exec(`
		INSERT INTO tasks (
			project_id, title, description, status, priority, 
			due_date, start_date, end_date, assignee_id, parent_task_id,
			progress_percent, estimated_duration_minutes, actual_duration_minutes
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		req.ProjectID,
		strings.TrimSpace(req.Title),
		nullString(req.Description),
		status,
		priority,
		nullString(req.DueDate),
		nullString(req.StartDate),
		nullString(req.EndDate),
		nullString(req.AssigneeID),
		parentTaskID,
		progress,
		nullInt(req.EstimatedDurationMinutes),
		nullInt(req.ActualDurationMinutes),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewCreateError("task"))
		return
	}

	lastID, _ := result.LastInsertId()

	// Fetch the created task
	task, err := scanTaskRow(database.QueryRow("SELECT * FROM tasks WHERE id = ?", lastID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("task"))
		return
	}

	c.JSON(http.StatusCreated, middleware.NewSuccessResponse(task))
}

// UpdateTask handles PUT /api/tasks/:id - Update task
func UpdateTask(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")

	var req UpdateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError(err.Error()))
		return
	}

	// Check task exists
	var exists bool
	err := database.QueryRow("SELECT 1 FROM tasks WHERE id = ?", taskID).Scan(&exists)
	if err != nil || !exists {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Task"))
		return
	}

	// Validate status if provided
	if req.Status != "" && !isValidStatus(req.Status) {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError(fmt.Sprintf("Invalid status. Must be one of: %s", strings.Join(ValidStatuses, ", "))))
		return
	}

	// Validate priority if provided
	if req.Priority != "" && !isValidPriority(req.Priority) {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError(fmt.Sprintf("Invalid priority. Must be one of: %s", strings.Join(ValidPriorities, ", "))))
		return
	}

	// Validate parent_task_id if provided (prevent self-reference and cycles)
	if req.ParentTaskID != nil {
		if *req.ParentTaskID != 0 {
			taskIDInt, _ := strconv.Atoi(taskID)
			if *req.ParentTaskID == taskIDInt {
				c.JSON(http.StatusBadRequest, middleware.NewValidationError("Task cannot be its own parent"))
				return
			}
			var parentExists bool
			err := database.QueryRow("SELECT 1 FROM tasks WHERE id = ?", *req.ParentTaskID).Scan(&parentExists)
			if err != nil || !parentExists {
				c.JSON(http.StatusBadRequest, middleware.NewValidationError("Parent task not found"))
				return
			}
			// Check for cycles: new parent must not be a descendant of this task
			descRows, err := database.Query(`
				WITH RECURSIVE descendants AS (
					SELECT id FROM tasks WHERE parent_task_id = ?
					UNION ALL
					SELECT t.id FROM tasks t
					INNER JOIN descendants d ON t.parent_task_id = d.id
				)
				SELECT id FROM descendants
			`, taskIDInt)
			if err != nil {
				c.JSON(http.StatusInternalServerError, middleware.NewFetchError("descendants"))
				return
			}
			defer descRows.Close()
			for descRows.Next() {
				var descendantID int
				if err := descRows.Scan(&descendantID); err != nil {
					continue
				}
				if descendantID == *req.ParentTaskID {
					c.JSON(http.StatusBadRequest, middleware.NewValidationError("Parent task is a descendant of this task"))
					return
				}
			}
		}
	}

	// Validate progress_percent if provided
	if req.ProgressPercent != nil {
		if *req.ProgressPercent < 0 || *req.ProgressPercent > 100 {
			c.JSON(http.StatusBadRequest, middleware.NewValidationError("Progress percent must be between 0 and 100"))
			return
		}
	}

	// Build update query dynamically
	setClauses := []string{"updated_at = CURRENT_TIMESTAMP"}
	var params []interface{}

	if req.Title != "" {
		setClauses = append(setClauses, "title = ?")
		params = append(params, strings.TrimSpace(req.Title))
	}

	if req.Description != nil {
		setClauses = append(setClauses, "description = ?")
		params = append(params, nullString(*req.Description))
	}

	if req.Status != "" {
		setClauses = append(setClauses, "status = ?")
		params = append(params, req.Status)
	}

	if req.Priority != "" {
		setClauses = append(setClauses, "priority = ?")
		params = append(params, req.Priority)
	}

	if req.DueDate != nil {
		setClauses = append(setClauses, "due_date = ?")
		params = append(params, nullString(*req.DueDate))
	}

	if req.StartDate != nil {
		setClauses = append(setClauses, "start_date = ?")
		params = append(params, nullString(*req.StartDate))
	}

	if req.EndDate != nil {
		setClauses = append(setClauses, "end_date = ?")
		params = append(params, nullString(*req.EndDate))
	}

	if req.AssigneeID != nil {
		setClauses = append(setClauses, "assignee_id = ?")
		params = append(params, nullString(*req.AssigneeID))
	}

	if req.ParentTaskID != nil {
		setClauses = append(setClauses, "parent_task_id = ?")
		if *req.ParentTaskID == 0 {
			params = append(params, nil)
		} else {
			params = append(params, *req.ParentTaskID)
		}
	}

	if req.ProgressPercent != nil {
		setClauses = append(setClauses, "progress_percent = ?")
		params = append(params, *req.ProgressPercent)
	}

	if req.EstimatedDurationMinutes != nil {
		setClauses = append(setClauses, "estimated_duration_minutes = ?")
		if *req.EstimatedDurationMinutes == 0 {
			params = append(params, nil)
		} else {
			params = append(params, *req.EstimatedDurationMinutes)
		}
	}

	if req.ActualDurationMinutes != nil {
		setClauses = append(setClauses, "actual_duration_minutes = ?")
		if *req.ActualDurationMinutes == 0 {
			params = append(params, nil)
		} else {
			params = append(params, *req.ActualDurationMinutes)
		}
	}

	params = append(params, taskID)

	query := "UPDATE tasks SET " + strings.Join(setClauses, ", ") + " WHERE id = ?"
	_, err = database.Exec(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("task"))
		return
	}

	task, err := scanTaskRow(database.QueryRow("SELECT * FROM tasks WHERE id = ?", taskID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("task"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(task))
}

// DeleteTask handles DELETE /api/tasks/:id - Delete task
func DeleteTask(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")

	result, err := database.Exec("DELETE FROM tasks WHERE id = ?", taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewDeleteError("task"))
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Task"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(gin.H{"message": "Task deleted successfully"}))
}

// UpdateTaskStatus handles PATCH /api/tasks/:id/status - Quick status update (for Kanban)
func UpdateTaskStatus(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError(err.Error()))
		return
	}

	// Validate status
	if !isValidStatus(req.Status) {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError(fmt.Sprintf("Invalid status. Must be one of: %s", strings.Join(ValidStatuses, ", "))))
		return
	}

	// Check if task exists
	var exists bool
	err := database.QueryRow("SELECT 1 FROM tasks WHERE id = ?", taskID).Scan(&exists)
	if err != nil || !exists {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Task"))
		return
	}

	_, err = database.Exec("UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", req.Status, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("task status"))
		return
	}

	task, err := scanTaskRow(database.QueryRow("SELECT * FROM tasks WHERE id = ?", taskID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("task"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(task))
}

// BulkUpdateTasks handles PUT /api/tasks/bulk - Bulk update tasks
func BulkUpdateTasks(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)

	var req BulkUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError(err.Error()))
		return
	}

	// Validate taskIds
	if len(req.TaskIDs) == 0 {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("taskIds must be a non-empty array"))
		return
	}

	// Validate status if provided
	if req.Updates.Status != "" && !isValidStatus(req.Updates.Status) {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError(fmt.Sprintf("Invalid status. Must be one of: %s", strings.Join(ValidStatuses, ", "))))
		return
	}

	// Validate priority if provided
	if req.Updates.Priority != "" && !isValidPriority(req.Updates.Priority) {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError(fmt.Sprintf("Invalid priority. Must be one of: %s", strings.Join(ValidPriorities, ", "))))
		return
	}

	// Validate assignee_id if provided
	if req.Updates.AssigneeID != "" {
		var personExists bool
		err := database.QueryRow("SELECT 1 FROM people WHERE id = ?", req.Updates.AssigneeID).Scan(&personExists)
		if err != nil || !personExists {
			c.JSON(http.StatusBadRequest, middleware.NewValidationError("Assignee not found"))
			return
		}
	}

	// Build the update query dynamically
	setClauses := []string{"updated_at = CURRENT_TIMESTAMP"}
	var params []interface{}

	if req.Updates.Status != "" {
		setClauses = append(setClauses, "status = ?")
		params = append(params, req.Updates.Status)
	}

	if req.Updates.Priority != "" {
		setClauses = append(setClauses, "priority = ?")
		params = append(params, req.Updates.Priority)
	}

	if req.Updates.AssigneeID != "" {
		setClauses = append(setClauses, "assignee_id = ?")
		params = append(params, req.Updates.AssigneeID)
	}

	if len(setClauses) == 1 {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("No valid updates provided"))
		return
	}

	// Build the WHERE clause with placeholders
	placeholders := make([]string, len(req.TaskIDs))
	for i := range req.TaskIDs {
		placeholders[i] = "?"
	}
	updateQuery := "UPDATE tasks SET " + strings.Join(setClauses, ", ") + " WHERE id IN (" + strings.Join(placeholders, ",") + ")"

	// Combine params with taskIds
	allParams := append(params, intSliceToInterfaceSlice(req.TaskIDs)...)

	// Execute the bulk update
	result, err := database.Exec(updateQuery, allParams...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("tasks"))
		return
	}

	// Fetch the updated tasks
	fetchPlaceholders := make([]string, len(req.TaskIDs))
	for i := range req.TaskIDs {
		fetchPlaceholders[i] = "?"
	}
	fetchQuery := "SELECT * FROM tasks WHERE id IN (" + strings.Join(fetchPlaceholders, ",") + ")"
	rows, err := database.Query(fetchQuery, intSliceToInterfaceSlice(req.TaskIDs)...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("tasks"))
		return
	}
	defer rows.Close()

	var updatedTasks []Task
	for rows.Next() {
		task, err := scanTask(rows)
		if err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewFetchError("tasks"))
			return
		}
		updatedTasks = append(updatedTasks, task)
	}

	rowsAffected, _ := result.RowsAffected()

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(gin.H{
		"updated": rowsAffected,
		"tasks":   updatedTasks,
	}))
}

// GetTaskChildren handles GET /api/tasks/:id/children - Get child tasks
func GetTaskChildren(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")

	// Check task exists
	var exists bool
	err := database.QueryRow("SELECT 1 FROM tasks WHERE id = ?", taskID).Scan(&exists)
	if err != nil || !exists {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Task"))
		return
	}

	rows, err := database.Query(`
		SELECT * FROM tasks 
		WHERE parent_task_id = ? 
		ORDER BY created_at DESC`, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("children"))
		return
	}
	defer rows.Close()

	var children []Task
	for rows.Next() {
		task, err := scanTask(rows)
		if err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewFetchError("children"))
			return
		}
		children = append(children, task)
	}

	if children == nil {
		children = []Task{}
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(children))
}

// GetTaskDescendants handles GET /api/tasks/:id/descendants - Get all descendants (recursive CTE)
func GetTaskDescendants(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")

	// Check task exists
	var exists bool
	err := database.QueryRow("SELECT 1 FROM tasks WHERE id = ?", taskID).Scan(&exists)
	if err != nil || !exists {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Task"))
		return
	}

	rows, err := database.Query(`
		WITH RECURSIVE descendants AS (
			SELECT * FROM tasks WHERE parent_task_id = ?
			UNION ALL
			SELECT t.* FROM tasks t
			INNER JOIN descendants d ON t.parent_task_id = d.id
		)
		SELECT * FROM descendants ORDER BY created_at DESC`, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("descendants"))
		return
	}
	defer rows.Close()

	var descendants []Task
	for rows.Next() {
		task, err := scanTask(rows)
		if err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewFetchError("descendants"))
			return
		}
		descendants = append(descendants, task)
	}

	if descendants == nil {
		descendants = []Task{}
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(descendants))
}

// GetTaskAncestors handles GET /api/tasks/:id/ancestors - Get all ancestors (recursive CTE)
func GetTaskAncestors(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")

	// Check task exists
	var exists bool
	err := database.QueryRow("SELECT 1 FROM tasks WHERE id = ?", taskID).Scan(&exists)
	if err != nil || !exists {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Task"))
		return
	}

	rows, err := database.Query(`
		WITH RECURSIVE ancestors AS (
			SELECT * FROM tasks WHERE id = (SELECT parent_task_id FROM tasks WHERE id = ?)
			UNION ALL
			SELECT t.* FROM tasks t
			INNER JOIN ancestors a ON t.id = (SELECT parent_task_id FROM tasks WHERE id = a.id)
		)
		SELECT * FROM ancestors WHERE id IS NOT NULL ORDER BY created_at ASC`, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("ancestors"))
		return
	}
	defer rows.Close()

	var ancestors []Task
	for rows.Next() {
		task, err := scanTask(rows)
		if err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewFetchError("ancestors"))
			return
		}
		ancestors = append(ancestors, task)
	}

	if ancestors == nil {
		ancestors = []Task{}
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(ancestors))
}

// GetTaskProgress handles GET /api/tasks/:id/progress - Get task progress
func GetTaskProgress(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")

	var progress TaskProgress
	err := database.QueryRow(`
		SELECT id, progress_percent FROM tasks WHERE id = ?`, taskID).Scan(
		&progress.TaskID, &progress.ProgressPercent)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Task"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("progress"))
		return
	}

	// Get children count
	database.QueryRow("SELECT COUNT(*) FROM tasks WHERE parent_task_id = ?", taskID).Scan(&progress.ChildrenCount)

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(progress))
}

// UpdateTaskProgress handles PUT /api/tasks/:id/progress - Update progress
func UpdateTaskProgress(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")

	var req struct {
		ProgressPercent          *int `json:"progress_percent"`
		EstimatedDurationMinutes *int `json:"estimated_duration_minutes"`
		ActualDurationMinutes    *int `json:"actual_duration_minutes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError(err.Error()))
		return
	}

	// Check task exists
	var exists bool
	err := database.QueryRow("SELECT 1 FROM tasks WHERE id = ?", taskID).Scan(&exists)
	if err != nil || !exists {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Task"))
		return
	}

	// Validate progress_percent if provided
	if req.ProgressPercent != nil && (*req.ProgressPercent < 0 || *req.ProgressPercent > 100) {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Progress percent must be between 0 and 100"))
		return
	}

	// Build update query
	setClauses := []string{"updated_at = CURRENT_TIMESTAMP"}
	var params []interface{}

	if req.ProgressPercent != nil {
		setClauses = append(setClauses, "progress_percent = ?")
		params = append(params, *req.ProgressPercent)
	}

	if req.EstimatedDurationMinutes != nil {
		setClauses = append(setClauses, "estimated_duration_minutes = ?")
		if *req.EstimatedDurationMinutes == 0 {
			params = append(params, nil)
		} else {
			params = append(params, *req.EstimatedDurationMinutes)
		}
	}

	if req.ActualDurationMinutes != nil {
		setClauses = append(setClauses, "actual_duration_minutes = ?")
		if *req.ActualDurationMinutes == 0 {
			params = append(params, nil)
		} else {
			params = append(params, *req.ActualDurationMinutes)
		}
	}

	params = append(params, taskID)
	query := "UPDATE tasks SET " + strings.Join(setClauses, ", ") + " WHERE id = ?"

	_, err = database.Exec(query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("progress"))
		return
	}

	task, err := scanTaskRow(database.QueryRow("SELECT * FROM tasks WHERE id = ?", taskID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("task"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(task))
}

// GetTaskProgressRollup handles GET /api/tasks/:id/progress/rollup - Get rolled-up progress from subtasks
func GetTaskProgressRollup(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")

	// Get the task
	var task Task
	err := database.QueryRow(`
		SELECT id, progress_percent FROM tasks WHERE id = ?`, taskID).Scan(
		&task.ID, &task.ProgressPercent)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Task"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("task"))
		return
	}

	// Get all descendants
	descendantsRows, err := database.Query(`
		WITH RECURSIVE descendants AS (
			SELECT * FROM tasks WHERE parent_task_id = ?
			UNION ALL
			SELECT t.* FROM tasks t
			INNER JOIN descendants d ON t.parent_task_id = d.id
		)
		SELECT * FROM descendants`, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("descendants"))
		return
	}
	defer descendantsRows.Close()

	var allDescendants []Task
	for descendantsRows.Next() {
		t, err := scanTask(descendantsRows)
		if err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewFetchError("descendants"))
			return
		}
		allDescendants = append(allDescendants, t)
	}

	// Get direct children
	taskIDInt, _ := strconv.Atoi(taskID)
	var directChildren []Task
	for _, d := range allDescendants {
		if d.ParentTaskID.Valid && int(d.ParentTaskID.Int64) == taskIDInt {
			directChildren = append(directChildren, d)
		}
	}

	response := TaskProgress{
		TaskID:          task.ID,
		RollupType:      "self",
		ProgressPercent: task.ProgressPercent,
		ChildrenCount:   0,
	}

	if len(directChildren) > 0 {
		// Calculate average progress from direct children
		var totalProgress int
		for _, child := range directChildren {
			totalProgress += child.ProgressPercent
		}
		avgProgress := totalProgress / len(directChildren)

		var children []ChildProgress
		for _, child := range directChildren {
			children = append(children, ChildProgress{
				ID:              child.ID,
				Title:           child.Title,
				ProgressPercent: child.ProgressPercent,
			})
		}

		response = TaskProgress{
			TaskID:              task.ID,
			ProgressPercent:     avgProgress,
			ChildrenCount:       len(directChildren),
			AllDescendantsCount: len(allDescendants),
			RollupType:          "children_average",
			Children:            children,
		}
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(response))
}

// GetTaskAssignees handles GET /api/tasks/:id/assignees - Get task assignees
func GetTaskAssignees(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")

	// Check task exists
	var exists bool
	err := database.QueryRow("SELECT 1 FROM tasks WHERE id = ?", taskID).Scan(&exists)
	if err != nil || !exists {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Task"))
		return
	}

	rows, err := database.Query(`
		SELECT p.id, p.name, p.email, p.company, p.designation, p.project_id, p.created_at, p.updated_at, ta.role, ta.id
		FROM people p 
		JOIN task_assignees ta ON p.id = ta.person_id 
		WHERE ta.task_id = ?`, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("assignees"))
		return
	}
	defer rows.Close()

	var assignees []PersonWithRole
	for rows.Next() {
		var pwr PersonWithRole
		err := rows.Scan(
			&pwr.ID, &pwr.Name, &pwr.Email, &pwr.Company, &pwr.Designation,
			&pwr.ProjectID, &pwr.CreatedAt, &pwr.UpdatedAt, &pwr.Role, &pwr.AssignmentID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewFetchError("assignees"))
			return
		}
		assignees = append(assignees, pwr)
	}

	if assignees == nil {
		assignees = []PersonWithRole{}
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(assignees))
}

// AddTaskAssignee handles POST /api/tasks/:id/assignees - Add assignee
func AddTaskAssignee(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")

	var req AddAssigneeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError(err.Error()))
		return
	}

	if req.PersonID == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Person ID is required"))
		return
	}

	// Check task exists
	var exists bool
	err := database.QueryRow("SELECT 1 FROM tasks WHERE id = ?", taskID).Scan(&exists)
	if err != nil || !exists {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Task"))
		return
	}

	// Check if person exists
	var person Person
	err = database.QueryRow(`
		SELECT id, name, email, company, designation, project_id, created_at, updated_at
		FROM people WHERE id = ?`, req.PersonID).Scan(
		&person.ID, &person.Name, &person.Email, &person.Company, &person.Designation, &person.ProjectID, &person.CreatedAt, &person.UpdatedAt)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Person"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("person"))
		return
	}

	// Check if already assigned
	var existingID string
	err = database.QueryRow("SELECT id FROM task_assignees WHERE task_id = ? AND person_id = ?", taskID, req.PersonID).Scan(&existingID)
	if err == nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Person is already assigned to this task"))
		return
	}
	if err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("assignment"))
		return
	}

	assignmentID := uuid.New().String()
	role := "collaborator"
	if req.Role != "" {
		role = req.Role
	}

	_, err = database.Exec(`
		INSERT INTO task_assignees (id, task_id, person_id, role) 
		VALUES (?, ?, ?, ?)`, assignmentID, taskID, req.PersonID, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewCreateError("assignment"))
		return
	}

	c.JSON(http.StatusCreated, middleware.NewSuccessResponse(gin.H{
		"id":            person.ID,
		"name":          person.Name,
		"email":         person.Email,
		"company":       person.Company,
		"designation":   person.Designation,
		"project_id":    person.ProjectID,
		"created_at":    person.CreatedAt,
		"updated_at":    person.UpdatedAt,
		"role":          role,
		"assignment_id": assignmentID,
	}))
}

// RemoveTaskAssignee handles DELETE /api/tasks/:id/assignees/:personId - Remove assignee
func RemoveTaskAssignee(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")
	personID := c.Param("personId")

	result, err := database.Exec("DELETE FROM task_assignees WHERE task_id = ? AND person_id = ?", taskID, personID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewDeleteError("assignment"))
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Assignment"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(gin.H{"message": "Assignee removed from task"}))
}

// GetTaskTags handles GET /api/tasks/:id/tags - Get task tags
func GetTaskTags(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")

	// Check task exists
	var exists bool
	err := database.QueryRow("SELECT 1 FROM tasks WHERE id = ?", taskID).Scan(&exists)
	if err != nil || !exists {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Task"))
		return
	}

	rows, err := database.Query(`
		SELECT tg.id, tg.name, tg.color, tg.project_id, tg.created_at, tg.updated_at
		FROM tags tg 
		JOIN task_tags tt ON tg.id = tt.tag_id 
		WHERE tt.task_id = ?`, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("tags"))
		return
	}
	defer rows.Close()

	var tags []Tag
	for rows.Next() {
		var t Tag
		err := rows.Scan(&t.ID, &t.Name, &t.Color, &t.ProjectID, &t.CreatedAt, &t.UpdatedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewFetchError("tags"))
			return
		}
		tags = append(tags, t)
	}

	if tags == nil {
		tags = []Tag{}
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(tags))
}

// AddTaskTag handles POST /api/tasks/:id/tags - Add tag to task
func AddTaskTag(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")

	var req AddTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError(err.Error()))
		return
	}

	if req.TagID == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Tag ID is required"))
		return
	}

	// Check task exists
	var exists bool
	err := database.QueryRow("SELECT 1 FROM tasks WHERE id = ?", taskID).Scan(&exists)
	if err != nil || !exists {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Task"))
		return
	}

	// Check if tag exists
	var tag Tag
	err = database.QueryRow(`
		SELECT id, name, color, project_id, created_at, updated_at
		FROM tags WHERE id = ?`, req.TagID).Scan(
		&tag.ID, &tag.Name, &tag.Color, &tag.ProjectID, &tag.CreatedAt, &tag.UpdatedAt)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Tag"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("tag"))
		return
	}

	// Check if tag is already applied
	var existingID string
	err = database.QueryRow("SELECT id FROM task_tags WHERE task_id = ? AND tag_id = ?", taskID, req.TagID).Scan(&existingID)
	if err == nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Tag is already applied to this task"))
		return
	}
	if err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("task tag"))
		return
	}

	taskTagID := uuid.New().String()

	_, err = database.Exec(`
		INSERT INTO task_tags (id, task_id, tag_id) 
		VALUES (?, ?, ?)`, taskTagID, taskID, req.TagID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewCreateError("task tag"))
		return
	}

	c.JSON(http.StatusCreated, middleware.NewSuccessResponse(gin.H{
		"id":          tag.ID,
		"name":        tag.Name,
		"color":       tag.Color,
		"project_id":  tag.ProjectID,
		"created_at":  tag.CreatedAt,
		"updated_at":  tag.UpdatedAt,
		"task_tag_id": taskTagID,
	}))
}

// RemoveTaskTag handles DELETE /api/tasks/:id/tags/:tagId - Remove tag from task
func RemoveTaskTag(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")
	tagID := c.Param("tagId")

	result, err := database.Exec("DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?", taskID, tagID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewDeleteError("tag association"))
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Tag association"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(gin.H{"message": "Tag removed from task"}))
}

// GetTaskCustomFields handles GET /api/tasks/:id/custom-fields - Get custom field values
func GetTaskCustomFields(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")

	// Check task exists
	var exists bool
	err := database.QueryRow("SELECT 1 FROM tasks WHERE id = ?", taskID).Scan(&exists)
	if err != nil || !exists {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Task"))
		return
	}

	rows, err := database.Query(`
		SELECT cfv.id, cfv.task_id, cfv.custom_field_id, cfv.value, 
		       cfv.created_at, cfv.updated_at,
		       cf.id, cf.name, cf.field_type, cf.project_id,
		       cf.options, cf.required, cf.sort_order
		FROM custom_field_values cfv
		JOIN custom_fields cf ON cfv.custom_field_id = cf.id
		WHERE cfv.task_id = ?
		ORDER BY cf.sort_order ASC`, taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("custom field values"))
		return
	}
	defer rows.Close()

	var fieldValues []TaskCustomFieldValue
	for rows.Next() {
		var fv TaskCustomFieldValue
		var cf CustomField
		var projectID *int
		var options json.RawMessage

		err := rows.Scan(
			&fv.ID, &fv.TaskID, &fv.CustomFieldID, &fv.Value,
			&fv.CreatedAt, &fv.UpdatedAt,
			&cf.ID, &cf.Name, &cf.FieldType, &projectID,
			&options, &cf.Required, &cf.SortOrder,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewFetchError("custom field values"))
			return
		}

		cf.Options = options
		cf.ProjectID = projectID
		cf.CreatedAt = fv.CreatedAt
		cf.UpdatedAt = fv.UpdatedAt

		fv.CustomField = cf
		fieldValues = append(fieldValues, fv)
	}

	if fieldValues == nil {
		fieldValues = []TaskCustomFieldValue{}
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(fieldValues))
}

// SetTaskCustomField handles PUT /api/tasks/:id/custom-fields/:fieldId - Set custom field value
func SetTaskCustomField(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")
	fieldID := c.Param("fieldId")

	var req SetCustomFieldRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError(err.Error()))
		return
	}

	// Check task exists and get its project_id
	var taskProjectID int
	err := database.QueryRow("SELECT project_id FROM tasks WHERE id = ?", taskID).Scan(&taskProjectID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Task"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("task"))
		return
	}

	// Check if custom field exists
	var customField CustomField
	err = database.QueryRow(`
		SELECT id, name, field_type, project_id, options, required, sort_order
		FROM custom_fields WHERE id = ?`, fieldID).Scan(
		&customField.ID, &customField.Name, &customField.FieldType, &customField.ProjectID, &customField.Options, &customField.Required, &customField.SortOrder)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Custom field"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("custom field"))
		return
	}

	// Check if field is global or belongs to the task's project
	if customField.ProjectID != nil && *customField.ProjectID != taskProjectID {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Custom field does not belong to this task's project"))
		return
	}

	// Validate value based on field type
	if req.Value != nil {
		switch customField.FieldType {
		case "number":
			if _, ok := req.Value.(float64); !ok {
				c.JSON(http.StatusBadRequest, middleware.NewValidationError("Value must be a number for number field type"))
				return
			}
		case "checkbox":
			if _, ok := req.Value.(bool); !ok {
				c.JSON(http.StatusBadRequest, middleware.NewValidationError("Value must be a boolean for checkbox field type"))
				return
			}
		case "select":
			if len(customField.Options) > 0 {
				var options []string
				json.Unmarshal(customField.Options, &options)
				found := false
				for _, opt := range options {
					if opt == req.Value {
						found = true
						break
					}
				}
				if !found {
					var optStrs []string
					json.Unmarshal(customField.Options, &optStrs)
					c.JSON(http.StatusBadRequest, middleware.NewValidationError(fmt.Sprintf("Value must be one of: %s", strings.Join(optStrs, ", "))))
					return
				}
			}
		case "multiselect":
			valueArr, ok := req.Value.([]interface{})
			if !ok {
				c.JSON(http.StatusBadRequest, middleware.NewValidationError("Value must be an array for multiselect field type"))
				return
			}
			if len(customField.Options) > 0 {
				var options []string
				json.Unmarshal(customField.Options, &options)
				for _, v := range valueArr {
					found := false
					for _, opt := range options {
						if opt == v {
							found = true
							break
						}
					}
					if !found {
						var optStrs []string
						json.Unmarshal(customField.Options, &optStrs)
						c.JSON(http.StatusBadRequest, middleware.NewValidationError(fmt.Sprintf("Invalid value. Must be one of: %s", strings.Join(optStrs, ", "))))
						return
					}
				}
			}
		case "date":
			if str, ok := req.Value.(string); !ok || len(str) < 10 {
				c.JSON(http.StatusBadRequest, middleware.NewValidationError("Value must be a valid date string (YYYY-MM-DD) for date field type"))
				return
			}
		}
	}

	// Serialize value for storage
	var storedValue *string
	if req.Value == nil {
		storedValue = nil
	} else {
		var strVal string
		switch v := req.Value.(type) {
		case bool:
			if v {
				strVal = "true"
			} else {
				strVal = "false"
			}
		case float64:
			strVal = fmt.Sprintf("%v", v)
		case string:
			strVal = v
		case []interface{}:
			b, _ := json.Marshal(v)
			strVal = string(b)
		default:
			strVal = fmt.Sprintf("%v", v)
		}
		storedValue = &strVal
	}

	// Check if value already exists
	var existingID string
	err = database.QueryRow(`
		SELECT id FROM custom_field_values WHERE task_id = ? AND custom_field_id = ?`, taskID, fieldID).Scan(&existingID)

	if err == nil {
		// Update existing value
		_, err = database.Exec(`
			UPDATE custom_field_values 
			SET value = ?, updated_at = CURRENT_TIMESTAMP 
			WHERE id = ?`, storedValue, existingID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("custom field value"))
			return
		}
	} else if err == sql.ErrNoRows {
		// Create new value
		existingID = uuid.New().String()
		_, err = database.Exec(`
			INSERT INTO custom_field_values (id, task_id, custom_field_id, value) 
			VALUES (?, ?, ?, ?)`, existingID, taskID, fieldID, storedValue)
		if err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewCreateError("custom field value"))
			return
		}
	} else {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("custom field value"))
		return
	}

	// Fetch the result
	var fv TaskCustomFieldValue
	var valueStr sql.NullString
	err = database.QueryRow(`
		SELECT cfv.id, cfv.task_id, cfv.custom_field_id, cfv.value, 
		       cfv.created_at, cfv.updated_at
		FROM custom_field_values cfv
		WHERE cfv.task_id = ? AND cfv.custom_field_id = ?`, taskID, fieldID).Scan(
		&fv.ID, &fv.TaskID, &fv.CustomFieldID, &valueStr, &fv.CreatedAt, &fv.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("custom field value"))
		return
	}
	fv.Value = valueStr
	fv.CustomField = customField

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(fv))
}

// RemoveTaskCustomField handles DELETE /api/tasks/:id/custom-fields/:fieldId - Remove custom field value
func RemoveTaskCustomField(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)
	taskID := c.Param("id")
	fieldID := c.Param("fieldId")

	result, err := database.Exec(`
		DELETE FROM custom_field_values WHERE task_id = ? AND custom_field_id = ?`, taskID, fieldID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewDeleteError("custom field value"))
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Custom field value for this task"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(gin.H{"message": "Custom field value removed from task"}))
}

// Helper function to convert string to sql.NullString
func nullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: s, Valid: true}
}

// Helper function to convert int to sql.NullInt64
func nullInt(n int) sql.NullInt64 {
	if n == 0 {
		return sql.NullInt64{Valid: false}
	}
	return sql.NullInt64{Int64: int64(n), Valid: true}
}

// Helper function to convert int slice to interface slice
func intSliceToInterfaceSlice(ints []int) []interface{} {
	res := make([]interface{}, len(ints))
	for i, v := range ints {
		res[i] = v
	}
	return res
}
