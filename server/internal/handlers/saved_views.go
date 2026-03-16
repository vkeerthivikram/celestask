package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/celestask/server/internal/db"
	"github.com/celestask/server/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Valid view types
var validViewTypes = []string{"list", "kanban", "calendar", "timeline"}

// SavedView represents a saved view in the database
type SavedView struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	ViewType    string         `json:"view_type"`
	ProjectID   sql.NullInt64  `json:"project_id"`
	Filters     string         `json:"filters"`
	SortBy      sql.NullString `json:"sort_by"`
	SortOrder   sql.NullString `json:"sort_order"`
	IsDefault   int            `json:"is_default"`
	CreatedAt   string         `json:"created_at"`
	UpdatedAt   string         `json:"updated_at"`
	ProjectName sql.NullString `json:"project_name"`
}

// SavedViewResponse is the API response format
type SavedViewResponse struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	ViewType    string                 `json:"view_type"`
	ProjectID   *int64                 `json:"project_id"`
	ProjectName *string                `json:"project_name"`
	Filters     map[string]interface{} `json:"filters"`
	SortBy      *string                `json:"sort_by"`
	SortOrder   string                 `json:"sort_order"`
	IsDefault   bool                   `json:"is_default"`
	CreatedAt   string                 `json:"created_at"`
	UpdatedAt   string                 `json:"updated_at"`
}

// CreateSavedViewRequest is the request body for creating a saved view
type CreateSavedViewRequest struct {
	Name      string                 `json:"name" binding:"required"`
	ViewType  string                 `json:"view_type" binding:"required"`
	ProjectID *int64                 `json:"project_id"`
	Filters   map[string]interface{} `json:"filters"`
	SortBy    *string                `json:"sort_by"`
	SortOrder *string                `json:"sort_order"`
	IsDefault *bool                  `json:"is_default"`
}

// UpdateSavedViewRequest is the request body for updating a saved view
type UpdateSavedViewRequest struct {
	Name      *string                `json:"name"`
	ViewType  *string                `json:"view_type"`
	ProjectID *int64                 `json:"project_id"`
	Filters   map[string]interface{} `json:"filters"`
	SortBy    *string                `json:"sort_by"`
	SortOrder *string                `json:"sort_order"`
	IsDefault *bool                  `json:"is_default"`
}

// isValidViewType checks if the view type is valid
func isValidViewType(viewType string) bool {
	for _, vt := range validViewTypes {
		if vt == viewType {
			return true
		}
	}
	return false
}

// parseSavedView converts a database row to API response
func parseSavedView(row *SavedView) SavedViewResponse {
	response := SavedViewResponse{
		ID:        row.ID,
		Name:      row.Name,
		ViewType:  row.ViewType,
		Filters:   make(map[string]interface{}),
		SortOrder: "asc",
		IsDefault: row.IsDefault == 1,
		CreatedAt: row.CreatedAt,
		UpdatedAt: row.UpdatedAt,
	}

	if row.ProjectID.Valid {
		response.ProjectID = &row.ProjectID.Int64
	}

	if row.ProjectName.Valid {
		response.ProjectName = &row.ProjectName.String
	}

	if row.Filters != "" {
		json.Unmarshal([]byte(row.Filters), &response.Filters)
	}

	if row.SortBy.Valid {
		response.SortBy = &row.SortBy.String
	}

	if row.SortOrder.Valid {
		response.SortOrder = row.SortOrder.String
	}

	return response
}

// GetSavedViews retrieves all saved views, optionally filtered by project_id and view_type
func GetSavedViews(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	projectID := c.Query("project_id")
	viewType := c.Query("view_type")

	query := `
		SELECT sv.*, p.name as project_name
		FROM saved_views sv
		LEFT JOIN projects p ON sv.project_id = p.id
		WHERE 1=1
	`
	args := []interface{}{}

	if projectID != "" {
		// Get project-specific views AND global views (project_id IS NULL)
		query += " AND (sv.project_id = ? OR sv.project_id IS NULL)"
		args = append(args, projectID)
	}

	if viewType != "" {
		query += " AND sv.view_type = ?"
		args = append(args, viewType)
	}

	query += " ORDER BY sv.name ASC"

	rows, err := database.Query(query, args...)
	if err != nil {
		panic(middleware.NewFetchError("saved views"))
	}
	defer rows.Close()

	var views []SavedViewResponse
	for rows.Next() {
		var view SavedView
		err := rows.Scan(
			&view.ID,
			&view.Name,
			&view.ViewType,
			&view.ProjectID,
			&view.Filters,
			&view.SortBy,
			&view.SortOrder,
			&view.IsDefault,
			&view.CreatedAt,
			&view.UpdatedAt,
			&view.ProjectName,
		)
		if err != nil {
			panic(middleware.NewFetchError("saved views"))
		}
		parsedView := parseSavedView(&view)
		views = append(views, parsedView)
	}

	if views == nil {
		views = []SavedViewResponse{}
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(views))
}

// GetSavedView retrieves a single saved view by ID
func GetSavedView(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")

	var view SavedView
	err := database.QueryRow(`
		SELECT sv.*, p.name as project_name
		FROM saved_views sv
		LEFT JOIN projects p ON sv.project_id = p.id
		WHERE sv.id = ?
	`, id).Scan(
		&view.ID,
		&view.Name,
		&view.ViewType,
		&view.ProjectID,
		&view.Filters,
		&view.SortBy,
		&view.SortOrder,
		&view.IsDefault,
		&view.CreatedAt,
		&view.UpdatedAt,
		&view.ProjectName,
	)

	if err == sql.ErrNoRows {
		panic(middleware.NewNotFoundError("Saved view"))
	}

	if err != nil {
		panic(middleware.NewFetchError("saved view"))
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(parseSavedView(&view)))
}

// CreateSavedView creates a new saved view
func CreateSavedView(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	var req CreateSavedViewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		panic(middleware.NewValidationError("Name and view_type are required"))
	}

	// Validate view_type
	if !isValidViewType(req.ViewType) {
		panic(middleware.NewValidationError("view_type must be one of: list, kanban, calendar, timeline"))
	}

	id := uuid.New().String()
	now := time.Now().Format(time.RFC3339)

	filtersJSON := "{}"
	if req.Filters != nil {
		filtersBytes, _ := json.Marshal(req.Filters)
		filtersJSON = string(filtersBytes)
	}

	sortOrder := "asc"
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}

	isDefault := 0
	if req.IsDefault != nil && *req.IsDefault {
		isDefault = 1
		// Unset any existing default for the same project and view_type
		if req.ProjectID != nil {
			database.Exec("UPDATE saved_views SET is_default = 0 WHERE project_id = ? AND view_type = ?", *req.ProjectID, req.ViewType)
		} else {
			database.Exec("UPDATE saved_views SET is_default = 0 WHERE project_id IS NULL AND view_type = ?", req.ViewType)
		}
	}

	var projectID interface{}
	if req.ProjectID != nil {
		projectID = *req.ProjectID
	} else {
		projectID = nil
	}

	_, err := database.Exec(`
		INSERT INTO saved_views (id, name, view_type, project_id, filters, sort_by, sort_order, is_default, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, id, req.Name, req.ViewType, projectID, filtersJSON, req.SortBy, sortOrder, isDefault, now, now)

	if err != nil {
		panic(middleware.NewCreateError("saved view"))
	}

	// Fetch the created view
	var view SavedView
	err = database.QueryRow(`
		SELECT sv.*, p.name as project_name
		FROM saved_views sv
		LEFT JOIN projects p ON sv.project_id = p.id
		WHERE sv.id = ?
	`, id).Scan(
		&view.ID,
		&view.Name,
		&view.ViewType,
		&view.ProjectID,
		&view.Filters,
		&view.SortBy,
		&view.SortOrder,
		&view.IsDefault,
		&view.CreatedAt,
		&view.UpdatedAt,
		&view.ProjectName,
	)

	if err != nil {
		panic(middleware.NewFetchError("saved view"))
	}

	c.JSON(http.StatusCreated, middleware.NewSuccessResponse(parseSavedView(&view)))
}

// UpdateSavedView updates an existing saved view
func UpdateSavedView(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")

	var req UpdateSavedViewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		panic(middleware.NewValidationError("Invalid request body"))
	}

	// Check if view exists
	var existingView SavedView
	err := database.QueryRow("SELECT * FROM saved_views WHERE id = ?", id).Scan(
		&existingView.ID,
		&existingView.Name,
		&existingView.ViewType,
		&existingView.ProjectID,
		&existingView.Filters,
		&existingView.SortBy,
		&existingView.SortOrder,
		&existingView.IsDefault,
		&existingView.CreatedAt,
		&existingView.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		panic(middleware.NewNotFoundError("Saved view"))
	}

	// Validate view_type if provided
	if req.ViewType != nil && !isValidViewType(*req.ViewType) {
		panic(middleware.NewValidationError("view_type must be one of: list, kanban, calendar, timeline"))
	}

	now := time.Now().Format(time.RFC3339)

	name := existingView.Name
	if req.Name != nil {
		name = *req.Name
	}

	viewType := existingView.ViewType
	if req.ViewType != nil {
		viewType = *req.ViewType
	}

	var projectID interface{}
	if req.ProjectID != nil {
		projectID = *req.ProjectID
	} else {
		projectID = existingView.ProjectID
	}

	filtersJSON := existingView.Filters
	if req.Filters != nil {
		filtersBytes, _ := json.Marshal(req.Filters)
		filtersJSON = string(filtersBytes)
	}

	sortBy := existingView.SortBy.String
	if req.SortBy != nil {
		sortBy = *req.SortBy
	}

	sortOrder := existingView.SortOrder.String
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}

	isDefault := existingView.IsDefault
	if req.IsDefault != nil {
		if *req.IsDefault {
			isDefault = 1
			// Unset any existing default for the same project and view_type
			if projectID != nil {
				database.Exec("UPDATE saved_views SET is_default = 0 WHERE project_id = ? AND view_type = ? AND id != ?", projectID, viewType, id)
			} else {
				database.Exec("UPDATE saved_views SET is_default = 0 WHERE project_id IS NULL AND view_type = ? AND id != ?", viewType, id)
			}
		} else {
			isDefault = 0
		}
	}

	_, err = database.Exec(`
		UPDATE saved_views 
		SET name = ?, view_type = ?, project_id = ?, filters = ?, sort_by = ?, sort_order = ?, is_default = ?, updated_at = ?
		WHERE id = ?
	`, name, viewType, projectID, filtersJSON, sortBy, sortOrder, isDefault, now, id)

	if err != nil {
		panic(middleware.NewUpdateError("saved view"))
	}

	// Fetch the updated view
	var view SavedView
	err = database.QueryRow(`
		SELECT sv.*, p.name as project_name
		FROM saved_views sv
		LEFT JOIN projects p ON sv.project_id = p.id
		WHERE sv.id = ?
	`, id).Scan(
		&view.ID,
		&view.Name,
		&view.ViewType,
		&view.ProjectID,
		&view.Filters,
		&view.SortBy,
		&view.SortOrder,
		&view.IsDefault,
		&view.CreatedAt,
		&view.UpdatedAt,
		&view.ProjectName,
	)

	if err != nil {
		panic(middleware.NewFetchError("saved view"))
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(parseSavedView(&view)))
}

// DeleteSavedView deletes a saved view
func DeleteSavedView(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")

	// Check if view exists
	var existingView SavedView
	err := database.QueryRow("SELECT * FROM saved_views WHERE id = ?", id).Scan(
		&existingView.ID,
		&existingView.Name,
		&existingView.ViewType,
		&existingView.ProjectID,
		&existingView.Filters,
		&existingView.SortBy,
		&existingView.SortOrder,
		&existingView.IsDefault,
		&existingView.CreatedAt,
		&existingView.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		panic(middleware.NewNotFoundError("Saved view"))
	}

	if err != nil {
		panic(middleware.NewFetchError("saved view"))
	}

	_, err = database.Exec("DELETE FROM saved_views WHERE id = ?", id)
	if err != nil {
		panic(middleware.NewDeleteError("saved view"))
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(gin.H{
		"id":      id,
		"message": "Saved view deleted successfully",
	}))
}

// SetDefaultView sets a saved view as the default for its project/type combination
func SetDefaultView(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")

	// Check if view exists
	var existingView SavedView
	err := database.QueryRow("SELECT * FROM saved_views WHERE id = ?", id).Scan(
		&existingView.ID,
		&existingView.Name,
		&existingView.ViewType,
		&existingView.ProjectID,
		&existingView.Filters,
		&existingView.SortBy,
		&existingView.SortOrder,
		&existingView.IsDefault,
		&existingView.CreatedAt,
		&existingView.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		panic(middleware.NewNotFoundError("Saved view"))
	}

	if err != nil {
		panic(middleware.NewFetchError("saved view"))
	}

	now := time.Now().Format(time.RFC3339)

	// Unset any existing default for the same project and view_type
	if existingView.ProjectID.Valid {
		database.Exec("UPDATE saved_views SET is_default = 0 WHERE project_id = ? AND view_type = ?", existingView.ProjectID.Int64, existingView.ViewType)
	} else {
		database.Exec("UPDATE saved_views SET is_default = 0 WHERE project_id IS NULL AND view_type = ?", existingView.ViewType)
	}

	// Set this view as default
	_, err = database.Exec("UPDATE saved_views SET is_default = 1, updated_at = ? WHERE id = ?", now, id)
	if err != nil {
		panic(middleware.NewUpdateError("saved view"))
	}

	// Fetch the updated view
	var view SavedView
	err = database.QueryRow(`
		SELECT sv.*, p.name as project_name
		FROM saved_views sv
		LEFT JOIN projects p ON sv.project_id = p.id
		WHERE sv.id = ?
	`, id).Scan(
		&view.ID,
		&view.Name,
		&view.ViewType,
		&view.ProjectID,
		&view.Filters,
		&view.SortBy,
		&view.SortOrder,
		&view.IsDefault,
		&view.CreatedAt,
		&view.UpdatedAt,
		&view.ProjectName,
	)

	if err != nil {
		panic(middleware.NewFetchError("saved view"))
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(parseSavedView(&view)))
}
