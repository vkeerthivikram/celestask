package handlers

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/celestask/server/internal/db"
	"github.com/celestask/server/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CreateTagRequest represents the request body for creating a tag
type CreateTagRequest struct {
	Name      string `json:"name" binding:"required"`
	Color     string `json:"color"`
	ProjectID *int64 `json:"project_id"`
}

// UpdateTagRequest represents the request body for updating a tag
type UpdateTagRequest struct {
	Name      *string `json:"name"`
	Color     *string `json:"color"`
	ProjectID *int64  `json:"project_id"`
}

// GetTags retrieves all tags, optionally filtered by project_id
func GetTags(c *gin.Context) {
	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	database := databaseIface.(*db.Database)
	projectID := c.Query("project_id")

	var rows *sql.Rows
	var err error

	if projectID != "" {
		// Return global tags + tags for the specific project
		rows, err = database.Query(`
			SELECT id, name, color, project_id, created_at, updated_at 
			FROM tags 
			WHERE project_id IS NULL OR project_id = ? 
			ORDER BY project_id NULLS FIRST, name
		`, projectID)
	} else {
		rows, err = database.Query(`
			SELECT id, name, color, project_id, created_at, updated_at 
			FROM tags 
			ORDER BY project_id NULLS FIRST, name
		`)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("tags"))
		return
	}
	defer rows.Close()

	var tags []Tag
	for rows.Next() {
		var tag Tag
		if err := rows.Scan(&tag.ID, &tag.Name, &tag.Color, &tag.ProjectID, &tag.CreatedAt, &tag.UpdatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewFetchError("tags"))
			return
		}
		tags = append(tags, tag)
	}

	if tags == nil {
		tags = []Tag{}
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(tags))
}

// GetTag retrieves a single tag by ID
func GetTag(c *gin.Context) {
	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	database := databaseIface.(*db.Database)
	id := c.Param("id")

	var tag Tag
	err := database.QueryRow(`
		SELECT id, name, color, project_id, created_at, updated_at 
		FROM tags 
		WHERE id = ?
	`, id).Scan(&tag.ID, &tag.Name, &tag.Color, &tag.ProjectID, &tag.CreatedAt, &tag.UpdatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Tag"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("tag"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(tag))
}

// CreateTag creates a new tag
func CreateTag(c *gin.Context) {
	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	database := databaseIface.(*db.Database)

	var req CreateTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Tag name is required"))
		return
	}

	// Validate name is not empty after trimming
	req.Name = strings.TrimSpace(req.Name)
	if len(req.Name) == 0 {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Tag name is required"))
		return
	}

	// Generate UUID for the new tag
	id := uuid.New().String()

	// Use default color if not provided
	color := "#6B7280"
	if req.Color != "" {
		color = req.Color
	}

	// Handle project_id (can be nil)
	var projectID any
	if req.ProjectID != nil {
		projectID = *req.ProjectID
	}

	_, err := database.Exec(`
		INSERT INTO tags (id, name, color, project_id) 
		VALUES (?, ?, ?, ?)
	`, id, req.Name, color, projectID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewCreateError("tag"))
		return
	}

	// Retrieve the created tag
	var tag Tag
	err = database.QueryRow(`
		SELECT id, name, color, project_id, created_at, updated_at 
		FROM tags 
		WHERE id = ?
	`, id).Scan(&tag.ID, &tag.Name, &tag.Color, &tag.ProjectID, &tag.CreatedAt, &tag.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("tag"))
		return
	}

	c.JSON(http.StatusCreated, middleware.NewSuccessResponse(tag))
}

// UpdateTag updates an existing tag
func UpdateTag(c *gin.Context) {
	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	database := databaseIface.(*db.Database)
	id := c.Param("id")

	var req UpdateTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Invalid request body"))
		return
	}

	// Build the dynamic update query
	query := "UPDATE tags SET "
	args := []any{}
	updates := 0

	if req.Name != nil {
		trimmedName := strings.TrimSpace(*req.Name)
		if len(trimmedName) == 0 {
			c.JSON(http.StatusBadRequest, middleware.NewValidationError("Tag name cannot be blank"))
			return
		}
		query += "name = ?"
		args = append(args, trimmedName)
		updates++
	}

	if req.Color != nil {
		if updates > 0 {
			query += ", "
		}
		query += "color = ?"
		args = append(args, *req.Color)
		updates++
	}

	if req.ProjectID != nil {
		if updates > 0 {
			query += ", "
		}
		query += "project_id = ?"
		args = append(args, *req.ProjectID)
		updates++
	}

	if updates == 0 {
		// No fields to update, just return the existing tag
		var tag Tag
		err := database.QueryRow(`
			SELECT id, name, color, project_id, created_at, updated_at 
			FROM tags 
			WHERE id = ?
		`, id).Scan(&tag.ID, &tag.Name, &tag.Color, &tag.ProjectID, &tag.CreatedAt, &tag.UpdatedAt)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Tag"))
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewFetchError("tag"))
			return
		}

		c.JSON(http.StatusOK, middleware.NewSuccessResponse(tag))
		return
	}

	query += ", updated_at = CURRENT_TIMESTAMP WHERE id = ?"
	args = append(args, id)

	_, err := database.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("tag"))
		return
	}

	// Retrieve the updated tag
	var tag Tag
	err = database.QueryRow(`
		SELECT id, name, color, project_id, created_at, updated_at 
		FROM tags 
		WHERE id = ?
	`, id).Scan(&tag.ID, &tag.Name, &tag.Color, &tag.ProjectID, &tag.CreatedAt, &tag.UpdatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Tag"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("tag"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(tag))
}

// DeleteTag deletes a tag
func DeleteTag(c *gin.Context) {
	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	database := databaseIface.(*db.Database)
	id := c.Param("id")

	result, err := database.Exec("DELETE FROM tags WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewDeleteError("tag"))
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewDeleteError("tag"))
		return
	}

	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Tag"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(gin.H{"message": "Tag deleted successfully"}))
}
