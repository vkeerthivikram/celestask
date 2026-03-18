package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"github.com/celestask/server/internal/db"
	"github.com/celestask/server/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const validProjectRoles = "lead,member,observer"

// generateUUID generates a new UUID
func generateUUID() string {
	return uuid.New().String()
}

// Project represents a project in the database
type Project struct {
	ID              int            `json:"id"`
	Name            string         `json:"name"`
	Description     sql.NullString `json:"description"`
	Color           string         `json:"color"`
	ParentProjectID sql.NullInt64  `json:"parent_project_id"`
	OwnerID         sql.NullString `json:"owner_id"`
	CreatedAt       string         `json:"created_at"`
	UpdatedAt       string         `json:"updated_at"`
}

// ProjectWithOwner includes owner information
type ProjectWithOwner struct {
	ID               int            `json:"id"`
	Name             string         `json:"name"`
	Description      sql.NullString `json:"description"`
	Color            string         `json:"color"`
	ParentProjectID  sql.NullInt64  `json:"parent_project_id"`
	OwnerID          sql.NullString `json:"owner_id"`
	OwnerName        sql.NullString `json:"owner_name"`
	OwnerEmail       sql.NullString `json:"owner_email"`
	OwnerCompany     sql.NullString `json:"owner_company"`
	OwnerDesignation sql.NullString `json:"owner_designation"`
	CreatedAt        string         `json:"created_at"`
	UpdatedAt        string         `json:"updated_at"`
}

// CreateProjectRequest represents the request body for creating a project
type CreateProjectRequest struct {
	Name            string `json:"name" binding:"required"`
	Description     string `json:"description"`
	Color           string `json:"color"`
	ParentProjectID *int   `json:"parent_project_id"`
}

// UpdateProjectRequest represents the request body for updating a project
type UpdateProjectRequest struct {
	Name            string `json:"name"`
	Description     string `json:"description"`
	Color           string `json:"color"`
	ParentProjectID *int   `json:"parent_project_id"`
}

// MoveProjectRequest represents the request body for moving a project
type MoveProjectRequest struct {
	ParentID *int `json:"parent_id"`
}

// SetOwnerRequest represents the request body for setting project owner
type SetOwnerRequest struct {
	PersonID *string `json:"person_id"`
}

// Assignee represents a person assigned to a project
type Assignee struct {
	ID           string         `json:"id"`
	Name         string         `json:"name"`
	Email        sql.NullString `json:"email"`
	Company      sql.NullString `json:"company"`
	Designation  sql.NullString `json:"designation"`
	ProjectID    sql.NullInt64  `json:"project_id"`
	CreatedAt    string         `json:"created_at"`
	UpdatedAt    string         `json:"updated_at"`
	Role         string         `json:"role"`
	AssignmentID string         `json:"assignment_id"`
	AssignedAt   string         `json:"assigned_at"`
}

// ProjectTree represents a project with its children
type ProjectTree struct {
	Project
	Children []ProjectTree `json:"children"`
}

// GetProjects returns all projects
func GetProjects(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	rows, err := database.Query("SELECT * FROM projects ORDER BY created_at DESC")
	if err != nil {
		panic(middleware.NewFetchError("projects"))
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var p Project
		err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Color, &p.ParentProjectID, &p.OwnerID, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			panic(middleware.NewFetchError("projects"))
		}
		projects = append(projects, p)
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(projects))
}

// GetRootProjects returns only root projects (no parent)
func GetRootProjects(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	rows, err := database.Query(`
		SELECT * FROM projects 
		WHERE parent_project_id IS NULL 
		ORDER BY created_at DESC
	`)
	if err != nil {
		panic(middleware.NewFetchError("root projects"))
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var p Project
		err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Color, &p.ParentProjectID, &p.OwnerID, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			panic(middleware.NewFetchError("root projects"))
		}
		projects = append(projects, p)
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(projects))
}

// CreateProject creates a new project
func CreateProject(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	var req CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		panic(middleware.NewValidationError("Project name is required"))
	}

	// Trim name
	name := strings.TrimSpace(req.Name)
	if name == "" {
		panic(middleware.NewValidationError("Project name is required"))
	}

	// Validate parent_project_id if provided
	var parentID any
	if req.ParentProjectID != nil {
		var parentProject Project
		err := database.QueryRow("SELECT id FROM projects WHERE id = ?", *req.ParentProjectID).Scan(&parentProject.ID)
		if err == sql.ErrNoRows {
			panic(middleware.NewValidationError("Parent project not found"))
		}
		if err != nil {
			panic(middleware.NewFetchError("parent project"))
		}
		parentID = *req.ParentProjectID
	}

	// Use default color if not provided
	color := req.Color
	if color == "" {
		color = "#3B82F6"
	}

	// Handle description
	var description any
	if req.Description != "" {
		description = strings.TrimSpace(req.Description)
	}

	result, err := database.Exec(`
		INSERT INTO projects (name, description, color, parent_project_id) VALUES (?, ?, ?, ?)
	`, name, description, color, parentID)
	if err != nil {
		panic(middleware.NewCreateError("project"))
	}

	lastID, _ := result.LastInsertId()
	var newProject Project
	err = database.QueryRow("SELECT * FROM projects WHERE id = ?", lastID).Scan(
		&newProject.ID, &newProject.Name, &newProject.Description, &newProject.Color,
		&newProject.ParentProjectID, &newProject.OwnerID, &newProject.CreatedAt, &newProject.UpdatedAt,
	)
	if err != nil {
		panic(middleware.NewFetchError("project"))
	}

	c.JSON(http.StatusCreated, middleware.NewSuccessResponse(newProject))
}

// GetProject returns a single project by ID
func GetProject(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")
	var project Project
	err := database.QueryRow("SELECT * FROM projects WHERE id = ?", id).Scan(
		&project.ID, &project.Name, &project.Description, &project.Color,
		&project.ParentProjectID, &project.OwnerID, &project.CreatedAt, &project.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		panic(middleware.NewNotFoundError("Project"))
	}
	if err != nil {
		panic(middleware.NewFetchError("project"))
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(project))
}

// UpdateProject updates an existing project
func UpdateProject(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")

	// Check if project exists
	var existingProject Project
	err := database.QueryRow("SELECT * FROM projects WHERE id = ?", id).Scan(
		&existingProject.ID, &existingProject.Name, &existingProject.Description, &existingProject.Color,
		&existingProject.ParentProjectID, &existingProject.OwnerID, &existingProject.CreatedAt, &existingProject.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		panic(middleware.NewNotFoundError("Project"))
	}
	if err != nil {
		panic(middleware.NewFetchError("project"))
	}

	var req UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// If no body, just return the project
		c.JSON(http.StatusOK, middleware.NewSuccessResponse(existingProject))
		return
	}

	// Validate parent_project_id if provided (prevent self-reference and cycles)
	if req.ParentProjectID != nil {
		newParent := *req.ParentProjectID
		// 0 means "move to root" – skip existence and cycle checks
		if newParent != 0 {
			if newParent == existingProject.ID {
				panic(middleware.NewValidationError("Project cannot be its own parent"))
			}
			// Check if parent exists
			var parentProject Project
			err := database.QueryRow("SELECT id FROM projects WHERE id = ?", newParent).Scan(&parentProject.ID)
			if err == sql.ErrNoRows {
				panic(middleware.NewValidationError("Parent project not found"))
			}
			// Check for circular reference (if new parent is a descendant of this project)
			descRows, err := database.Query(`
				WITH RECURSIVE descendants AS (
					SELECT id FROM projects WHERE parent_project_id = ?
					UNION ALL
					SELECT p.id FROM projects p
					INNER JOIN descendants d ON p.parent_project_id = d.id
				)
				SELECT id FROM descendants
			`, id)
			if err != nil {
				panic(middleware.NewFetchError("descendants"))
			}
			defer descRows.Close()
			for descRows.Next() {
				var descendantID int
				if err := descRows.Scan(&descendantID); err != nil {
					continue
				}
				if descendantID == newParent {
					panic(middleware.NewValidationError("Cannot set parent to one of the project's descendants"))
				}
			}
		}
	}

	// Build dynamic update query
	name := existingProject.Name
	description := existingProject.Description.String
	color := existingProject.Color
	parentID := existingProject.ParentProjectID

	if req.Name != "" {
		name = strings.TrimSpace(req.Name)
	}
	if req.Description != "" {
		description = strings.TrimSpace(req.Description)
	}
	if req.Color != "" {
		color = req.Color
	}
	if req.ParentProjectID != nil {
		parentID = sql.NullInt64{Int64: int64(*req.ParentProjectID), Valid: true}
		if *req.ParentProjectID == 0 {
			parentID = sql.NullInt64{Valid: false}
		}
	}

	_, err = database.Exec(`
		UPDATE projects 
		SET name = ?, description = ?, color = ?, parent_project_id = ?, updated_at = CURRENT_TIMESTAMP 
		WHERE id = ?
	`, name, description, color, parentID, id)
	if err != nil {
		panic(middleware.NewUpdateError("project"))
	}

	var updatedProject Project
	err = database.QueryRow("SELECT * FROM projects WHERE id = ?", id).Scan(
		&updatedProject.ID, &updatedProject.Name, &updatedProject.Description, &updatedProject.Color,
		&updatedProject.ParentProjectID, &updatedProject.OwnerID, &updatedProject.CreatedAt, &updatedProject.UpdatedAt,
	)
	if err != nil {
		panic(middleware.NewFetchError("project"))
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(updatedProject))
}

// DeleteProject deletes a project
func DeleteProject(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")

	// Check if project exists
	var project Project
	err := database.QueryRow("SELECT id FROM projects WHERE id = ?", id).Scan(&project.ID)
	if err == sql.ErrNoRows {
		panic(middleware.NewNotFoundError("Project"))
	}
	if err != nil {
		panic(middleware.NewFetchError("project"))
	}

	_, err = database.Exec("DELETE FROM projects WHERE id = ?", id)
	if err != nil {
		panic(middleware.NewDeleteError("project"))
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(gin.H{"message": "Project deleted successfully"}))
}

// GetProjectChildren returns direct children of a project
func GetProjectChildren(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")

	// Check if project exists
	var project Project
	err := database.QueryRow("SELECT id FROM projects WHERE id = ?", id).Scan(&project.ID)
	if err == sql.ErrNoRows {
		panic(middleware.NewNotFoundError("Project"))
	}
	if err != nil {
		panic(middleware.NewFetchError("project"))
	}

	rows, err := database.Query(`
		SELECT * FROM projects 
		WHERE parent_project_id = ? 
		ORDER BY created_at DESC
	`, id)
	if err != nil {
		panic(middleware.NewFetchError("project children"))
	}
	defer rows.Close()

	var children []Project
	for rows.Next() {
		var p Project
		err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Color, &p.ParentProjectID, &p.OwnerID, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			panic(middleware.NewFetchError("project children"))
		}
		children = append(children, p)
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(children))
}

// GetProjectDescendants returns all descendants using recursive CTE
func GetProjectDescendants(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")

	// Check if project exists
	var project Project
	err := database.QueryRow("SELECT id FROM projects WHERE id = ?", id).Scan(&project.ID)
	if err == sql.ErrNoRows {
		panic(middleware.NewNotFoundError("Project"))
	}
	if err != nil {
		panic(middleware.NewFetchError("project"))
	}

	rows, err := database.Query(`
		WITH RECURSIVE descendants AS (
			SELECT * FROM projects WHERE parent_project_id = ?
			UNION ALL
			SELECT p.* FROM projects p
			INNER JOIN descendants d ON p.parent_project_id = d.id
		)
		SELECT * FROM descendants ORDER BY created_at DESC
	`, id)
	if err != nil {
		panic(middleware.NewFetchError("project descendants"))
	}
	defer rows.Close()

	var descendants []Project
	for rows.Next() {
		var p Project
		err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Color, &p.ParentProjectID, &p.OwnerID, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			panic(middleware.NewFetchError("project descendants"))
		}
		descendants = append(descendants, p)
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(descendants))
}

// GetProjectAncestors returns all ancestors using recursive CTE
func GetProjectAncestors(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")

	// Check if project exists
	var project Project
	err := database.QueryRow("SELECT * FROM projects WHERE id = ?", id).Scan(
		&project.ID, &project.Name, &project.Description, &project.Color,
		&project.ParentProjectID, &project.OwnerID, &project.CreatedAt, &project.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		panic(middleware.NewNotFoundError("Project"))
	}
	if err != nil {
		panic(middleware.NewFetchError("project"))
	}

	rows, err := database.Query(`
		WITH RECURSIVE ancestors AS (
			SELECT * FROM projects WHERE id = (SELECT parent_project_id FROM projects WHERE id = ?)
			UNION ALL
			SELECT p.* FROM projects p
			INNER JOIN ancestors a ON p.id = (SELECT parent_project_id FROM projects WHERE id = a.id)
		)
		SELECT * FROM ancestors WHERE id IS NOT NULL ORDER BY created_at ASC
	`, id)
	if err != nil {
		panic(middleware.NewFetchError("project ancestors"))
	}
	defer rows.Close()

	var ancestors []Project
	for rows.Next() {
		var p Project
		err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Color, &p.ParentProjectID, &p.OwnerID, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			panic(middleware.NewFetchError("project ancestors"))
		}
		ancestors = append(ancestors, p)
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(ancestors))
}

// GetProjectTree returns full tree as nested JSON
func GetProjectTree(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")

	// Check if project exists
	var project Project
	err := database.QueryRow("SELECT * FROM projects WHERE id = ?", id).Scan(
		&project.ID, &project.Name, &project.Description, &project.Color,
		&project.ParentProjectID, &project.OwnerID, &project.CreatedAt, &project.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		panic(middleware.NewNotFoundError("Project"))
	}
	if err != nil {
		panic(middleware.NewFetchError("project"))
	}

	// Build tree recursively
	tree := buildProjectTree(database, id)

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(tree))
}

func buildProjectTree(database *db.Database, projectID string) ProjectTree {
	var project Project
	err := database.QueryRow("SELECT * FROM projects WHERE id = ?", projectID).Scan(
		&project.ID, &project.Name, &project.Description, &project.Color,
		&project.ParentProjectID, &project.OwnerID, &project.CreatedAt, &project.UpdatedAt,
	)
	if err != nil {
		return ProjectTree{}
	}

	rows, err := database.Query(`
		SELECT * FROM projects WHERE parent_project_id = ? ORDER BY created_at DESC
	`, projectID)
	if err != nil {
		return ProjectTree{Project: project}
	}
	defer rows.Close()

	var children []ProjectTree
	for rows.Next() {
		var child Project
		err := rows.Scan(&child.ID, &child.Name, &child.Description, &child.Color, &child.ParentProjectID, &child.OwnerID, &child.CreatedAt, &child.UpdatedAt)
		if err != nil {
			continue
		}
		children = append(children, buildProjectTree(database, fmt.Sprintf("%d", child.ID)))
	}

	return ProjectTree{
		Project:  project,
		Children: children,
	}
}

// MoveProject moves a project to a new parent
func MoveProject(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")

	// Check if project exists
	var project Project
	err := database.QueryRow("SELECT * FROM projects WHERE id = ?", id).Scan(
		&project.ID, &project.Name, &project.Description, &project.Color,
		&project.ParentProjectID, &project.OwnerID, &project.CreatedAt, &project.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		panic(middleware.NewNotFoundError("Project"))
	}
	if err != nil {
		panic(middleware.NewFetchError("project"))
	}

	var req MoveProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		panic(middleware.NewValidationError("Invalid request body"))
	}

	// Validate parent_id if provided
	if req.ParentID != nil {
		parentID := *req.ParentID
		// Prevent self-reference
		if parentID == project.ID {
			panic(middleware.NewValidationError("Project cannot be moved to itself"))
		}

		// Check if parent exists
		var parentProject Project
		err := database.QueryRow("SELECT id FROM projects WHERE id = ?", parentID).Scan(&parentProject.ID)
		if err == sql.ErrNoRows {
			panic(middleware.NewNotFoundError("Parent project"))
		}

		// Check for circular reference (if parent is a descendant)
		rows, err := database.Query(`
			WITH RECURSIVE descendants AS (
				SELECT id FROM projects WHERE parent_project_id = ?
				UNION ALL
				SELECT p.id FROM projects p
				INNER JOIN descendants d ON p.parent_project_id = d.id
			)
			SELECT id FROM descendants
		`, id)
		if err != nil {
			panic(middleware.NewFetchError("descendants"))
		}
		defer rows.Close()

		for rows.Next() {
			var descendantID int
			if err := rows.Scan(&descendantID); err != nil {
				continue
			}
			if descendantID == parentID {
				panic(middleware.NewValidationError("Cannot move project to one of its descendants"))
			}
		}

		// Update the parent
		_, err = database.Exec(`
			UPDATE projects 
			SET parent_project_id = ?, updated_at = CURRENT_TIMESTAMP 
			WHERE id = ?
		`, parentID, id)
		if err != nil {
			panic(middleware.NewUpdateError("project"))
		}
	} else {
		// Remove parent (move to root)
		_, err = database.Exec(`
			UPDATE projects 
			SET parent_project_id = NULL, updated_at = CURRENT_TIMESTAMP 
			WHERE id = ?
		`, id)
		if err != nil {
			panic(middleware.NewUpdateError("project"))
		}
	}

	var updatedProject Project
	err = database.QueryRow("SELECT * FROM projects WHERE id = ?", id).Scan(
		&updatedProject.ID, &updatedProject.Name, &updatedProject.Description, &updatedProject.Color,
		&updatedProject.ParentProjectID, &updatedProject.OwnerID, &updatedProject.CreatedAt, &updatedProject.UpdatedAt,
	)
	if err != nil {
		panic(middleware.NewFetchError("project"))
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(updatedProject))
}

// SetProjectOwner sets the project owner
func SetProjectOwner(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")

	// Check if project exists
	var project Project
	err := database.QueryRow("SELECT * FROM projects WHERE id = ?", id).Scan(
		&project.ID, &project.Name, &project.Description, &project.Color,
		&project.ParentProjectID, &project.OwnerID, &project.CreatedAt, &project.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		panic(middleware.NewNotFoundError("Project"))
	}
	if err != nil {
		panic(middleware.NewFetchError("project"))
	}

	var req SetOwnerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		panic(middleware.NewValidationError("Invalid request body"))
	}

	// Validate person_id if provided (null means remove owner)
	if req.PersonID != nil && *req.PersonID != "" {
		var person struct {
			ID string
		}
		err := database.QueryRow("SELECT id FROM people WHERE id = ?", *req.PersonID).Scan(&person.ID)
		if err == sql.ErrNoRows {
			panic(middleware.NewNotFoundError("Person"))
		}
		if err != nil {
			panic(middleware.NewFetchError("person"))
		}
	}

	// Update owner_id
	var ownerID any
	if req.PersonID != nil {
		ownerID = *req.PersonID
	}

	_, err = database.Exec(`
		UPDATE projects 
		SET owner_id = ?, updated_at = CURRENT_TIMESTAMP 
		WHERE id = ?
	`, ownerID, id)
	if err != nil {
		panic(middleware.NewUpdateError("project owner"))
	}

	// Get updated project with owner info
	var updatedProject ProjectWithOwner
	err = database.QueryRow(`
		SELECT p.id, p.name, p.description, p.color, p.parent_project_id, p.owner_id,
			o.name as owner_name, o.email as owner_email,
			o.company as owner_company, o.designation as owner_designation,
			p.created_at, p.updated_at
		FROM projects p
		LEFT JOIN people o ON p.owner_id = o.id
		WHERE p.id = ?
	`, id).Scan(
		&updatedProject.ID, &updatedProject.Name, &updatedProject.Description, &updatedProject.Color,
		&updatedProject.ParentProjectID, &updatedProject.OwnerID,
		&updatedProject.OwnerName, &updatedProject.OwnerEmail, &updatedProject.OwnerCompany, &updatedProject.OwnerDesignation,
		&updatedProject.CreatedAt, &updatedProject.UpdatedAt,
	)
	if err != nil {
		panic(middleware.NewFetchError("project"))
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(updatedProject))
}

// GetProjectAssignees returns all assignees for a project
func GetProjectAssignees(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")

	// Check if project exists
	var project Project
	err := database.QueryRow("SELECT id FROM projects WHERE id = ?", id).Scan(&project.ID)
	if err == sql.ErrNoRows {
		panic(middleware.NewNotFoundError("Project"))
	}
	if err != nil {
		panic(middleware.NewFetchError("project"))
	}

	rows, err := database.Query(`
		SELECT p.*, pa.role, pa.id as assignment_id, pa.created_at as assigned_at
		FROM people p 
		JOIN project_assignees pa ON p.id = pa.person_id 
		WHERE pa.project_id = ?
		ORDER BY pa.created_at ASC
	`, id)
	if err != nil {
		panic(middleware.NewFetchError("project assignees"))
	}
	defer rows.Close()

	var assignees []Assignee
	for rows.Next() {
		var a Assignee
		err := rows.Scan(
			&a.ID, &a.Name, &a.Email, &a.Company, &a.Designation, &a.ProjectID, &a.CreatedAt, &a.UpdatedAt,
			&a.Role, &a.AssignmentID, &a.AssignedAt,
		)
		if err != nil {
			panic(middleware.NewFetchError("project assignees"))
		}
		assignees = append(assignees, a)
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(assignees))
}

// AddProjectAssignee adds an assignee to a project
func AddProjectAssignee(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")

	var req AddAssigneeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		panic(middleware.NewValidationError("Person ID is required"))
	}

	// Check if project exists
	var project Project
	err := database.QueryRow("SELECT id FROM projects WHERE id = ?", id).Scan(&project.ID)
	if err == sql.ErrNoRows {
		panic(middleware.NewNotFoundError("Project"))
	}
	if err != nil {
		panic(middleware.NewFetchError("project"))
	}

	// Check if person exists
	var person struct {
		ID          string
		Name        string
		Email       sql.NullString
		Company     sql.NullString
		Designation sql.NullString
	}
	err = database.QueryRow("SELECT * FROM people WHERE id = ?", req.PersonID).Scan(
		&person.ID, &person.Name, &person.Email, &person.Company, &person.Designation,
	)
	if err == sql.ErrNoRows {
		panic(middleware.NewNotFoundError("Person"))
	}
	if err != nil {
		panic(middleware.NewFetchError("person"))
	}

	// Validate role
	assignmentRole := "member"
	if req.Role != "" {
		assignmentRole = req.Role
	}
	if assignmentRole != "lead" && assignmentRole != "member" && assignmentRole != "observer" {
		panic(middleware.NewValidationError(fmt.Sprintf("Invalid role. Must be one of: %s", validProjectRoles)))
	}

	// Check if already assigned (handle UNIQUE constraint)
	var existingID string
	err = database.QueryRow("SELECT id FROM project_assignees WHERE project_id = ? AND person_id = ?", id, req.PersonID).Scan(&existingID)
	if err == nil {
		panic(middleware.NewValidationError("Person is already assigned to this project"))
	}
	if err != sql.ErrNoRows {
		panic(middleware.NewFetchError("project assignee"))
	}

	// Generate UUID for assignment
	assignmentID := generateUUID()

	// Insert assignment
	_, err = database.Exec(`
		INSERT INTO project_assignees (id, project_id, person_id, role) 
		VALUES (?, ?, ?, ?)
	`, assignmentID, id, req.PersonID, assignmentRole)
	if err != nil {
		panic(middleware.NewCreateError("project assignee"))
	}

	c.JSON(http.StatusCreated, middleware.NewSuccessResponse(gin.H{
		"id":            person.ID,
		"name":          person.Name,
		"email":         person.Email,
		"company":       person.Company,
		"designation":   person.Designation,
		"role":          assignmentRole,
		"assignment_id": assignmentID,
	}))
}

// RemoveProjectAssignee removes an assignee from a project
func RemoveProjectAssignee(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")
	assigneeID := c.Param("personId")

	result, err := database.Exec("DELETE FROM project_assignees WHERE project_id = ? AND id = ?", id, assigneeID)
	if err != nil {
		panic(middleware.NewDeleteError("project assignee"))
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		panic(middleware.NewNotFoundError("Assignment"))
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(gin.H{"message": "Assignee removed from project"}))
}
