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

// Note represents a note in the database
type Note struct {
	ID         string         `json:"id"`
	Content    string         `json:"content"`
	EntityType string         `json:"entity_type"`
	EntityID   string         `json:"entity_id"`
	CreatedAt  sql.NullString `json:"created_at"`
	UpdatedAt  sql.NullString `json:"updated_at"`
}

// Valid entity types for notes
var validEntityTypes = []string{"project", "task", "person"}

// entityTables maps entity types to their corresponding table names
var entityTables = map[string]string{
	"project": "projects",
	"task":    "tasks",
	"person":  "people",
}

// isValidEntityType checks if the given entity type is valid
func isValidEntityType(entityType string) bool {
	for _, valid := range validEntityTypes {
		if entityType == valid {
			return true
		}
	}
	return false
}

// GetNotes retrieves all notes or filters by entity_type and entity_id
// GET /api/notes?entity_type=task&entity_id=123
func GetNotes(c *gin.Context) {
	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	database, ok := databaseIface.(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Invalid database instance"))
		return
	}

	entityType := c.Query("entity_type")
	entityID := c.Query("entity_id")

	var rows *sql.Rows
	var err error

	if entityType != "" && entityID != "" {
		// Validate entity_type
		if !isValidEntityType(entityType) {
			c.JSON(http.StatusBadRequest, middleware.NewValidationError(
				fmt.Sprintf("Invalid entity_type. Must be one of: %s", strings.Join(validEntityTypes, ", "))))
			return
		}

		rows, err = database.Query(`
			SELECT id, content, entity_type, entity_id, created_at, updated_at 
			FROM notes 
			WHERE entity_type = ? AND entity_id = ? 
			ORDER BY created_at DESC
		`, entityType, entityID)
	} else {
		// Return all notes if no filter provided
		rows, err = database.Query(`
			SELECT id, content, entity_type, entity_id, created_at, updated_at 
			FROM notes 
			ORDER BY created_at DESC
		`)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("notes"))
		return
	}
	defer rows.Close()

	notes := []Note{}
	for rows.Next() {
		var note Note
		err := rows.Scan(&note.ID, &note.Content, &note.EntityType, &note.EntityID, &note.CreatedAt, &note.UpdatedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewFetchError("notes"))
			return
		}
		notes = append(notes, note)
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(notes))
}

// GetNote retrieves a single note by ID
// GET /api/notes/:id
func GetNote(c *gin.Context) {
	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	database, ok := databaseIface.(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Invalid database instance"))
		return
	}

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Note ID is required"))
		return
	}

	var note Note
	err := database.QueryRow(`
		SELECT id, content, entity_type, entity_id, created_at, updated_at 
		FROM notes 
		WHERE id = ?
	`, id).Scan(&note.ID, &note.Content, &note.EntityType, &note.EntityID, &note.CreatedAt, &note.UpdatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Note"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("note"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(note))
}

// CreateNoteRequest represents the request body for creating a note
type CreateNoteRequest struct {
	Content    string `json:"content" binding:"required"`
	EntityType string `json:"entity_type" binding:"required"`
	EntityID   string `json:"entity_id" binding:"required"`
}

// CreateNote creates a new note
// POST /api/notes
func CreateNote(c *gin.Context) {
	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	database, ok := databaseIface.(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Invalid database instance"))
		return
	}

	var req CreateNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Invalid request body"))
		return
	}

	// Validate entity_type
	if !isValidEntityType(req.EntityType) {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError(
			fmt.Sprintf("entity_type is required and must be one of: %s", strings.Join(validEntityTypes, ", "))))
		return
	}

	// Validate entity_id is provided
	if req.EntityID == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("entity_id is required"))
		return
	}

	// Validate that the referenced entity exists
	table := entityTables[req.EntityType]
	var count int
	err := database.QueryRow(fmt.Sprintf("SELECT 1 FROM %s WHERE id = ?", table), req.EntityID).Scan(&count)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError(
			fmt.Sprintf("%s with id %s not found", req.EntityType, req.EntityID)))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewCreateError("note"))
		return
	}

	// Generate UUID for the note
	noteID := uuid.New().String()

	// Insert the note
	_, err = database.Exec(`
		INSERT INTO notes (id, content, entity_type, entity_id) 
		VALUES (?, ?, ?, ?)
	`, noteID, strings.TrimSpace(req.Content), req.EntityType, req.EntityID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewCreateError("note"))
		return
	}

	// Fetch the created note
	var note Note
	err = database.QueryRow(`
		SELECT id, content, entity_type, entity_id, created_at, updated_at 
		FROM notes 
		WHERE id = ?
	`, noteID).Scan(&note.ID, &note.Content, &note.EntityType, &note.EntityID, &note.CreatedAt, &note.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("note"))
		return
	}

	c.JSON(http.StatusCreated, middleware.NewSuccessResponse(note))
}

// UpdateNoteRequest represents the request body for updating a note
type UpdateNoteRequest struct {
	Content string `json:"content"`
}

// UpdateNote updates an existing note
// PUT /api/notes/:id
func UpdateNote(c *gin.Context) {
	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	database, ok := databaseIface.(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Invalid database instance"))
		return
	}

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Note ID is required"))
		return
	}

	// Check if note exists
	var count int
	err := database.QueryRow("SELECT 1 FROM notes WHERE id = ?", id).Scan(&count)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Note"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("note"))
		return
	}

	var req UpdateNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Invalid request body"))
		return
	}

	// Update only if content is provided
	if req.Content != "" {
		_, err = database.Exec(`
			UPDATE notes 
			SET content = ?, 
				updated_at = CURRENT_TIMESTAMP 
			WHERE id = ?
		`, strings.TrimSpace(req.Content), id)
	} else {
		_, err = database.Exec(`
			UPDATE notes 
			SET updated_at = CURRENT_TIMESTAMP 
			WHERE id = ?
		`, id)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("note"))
		return
	}

	// Fetch the updated note
	var note Note
	err = database.QueryRow(`
		SELECT id, content, entity_type, entity_id, created_at, updated_at 
		FROM notes 
		WHERE id = ?
	`, id).Scan(&note.ID, &note.Content, &note.EntityType, &note.EntityID, &note.CreatedAt, &note.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("note"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(note))
}

// DeleteNote deletes a note
// DELETE /api/notes/:id
func DeleteNote(c *gin.Context) {
	databaseIface, exists := c.Get("database")
	if !exists {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	database, ok := databaseIface.(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Invalid database instance"))
		return
	}

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Note ID is required"))
		return
	}

	// Check if note exists
	var count int
	err := database.QueryRow("SELECT 1 FROM notes WHERE id = ?", id).Scan(&count)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Note"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewDeleteError("note"))
		return
	}

	// Delete the note
	_, err = database.Exec("DELETE FROM notes WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewDeleteError("note"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(gin.H{"message": "Note deleted successfully"}))
}
