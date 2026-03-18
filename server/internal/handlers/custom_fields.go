package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/celestask/server/internal/db"
	"github.com/celestask/server/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Valid field types
var validFieldTypes = []string{"text", "number", "date", "select", "multiselect", "checkbox", "url"}

// CustomField represents a custom field entity
type CustomField struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	FieldType   string          `json:"field_type"`
	ProjectID   *int            `json:"project_id"`
	ProjectName *string         `json:"project_name"`
	Options     json.RawMessage `json:"options"`
	Required    bool            `json:"required"`
	SortOrder   int             `json:"sort_order"`
	CreatedAt   string          `json:"created_at"`
	UpdatedAt   string          `json:"updated_at"`
}

// CreateCustomFieldRequest represents the request body for creating a custom field
type CreateCustomFieldRequest struct {
	Name      string          `json:"name" binding:"required"`
	FieldType string          `json:"field_type" binding:"required"`
	ProjectID *int            `json:"project_id"`
	Options   json.RawMessage `json:"options"`
	Required  bool            `json:"required"`
	SortOrder int             `json:"sort_order"`
}

// UpdateCustomFieldRequest represents the request body for updating a custom field
type UpdateCustomFieldRequest struct {
	Name      *string         `json:"name"`
	FieldType *string         `json:"field_type"`
	ProjectID *int            `json:"project_id"`
	Options   json.RawMessage `json:"options"`
	Required  *bool           `json:"required"`
	SortOrder *int            `json:"sort_order"`
}

// isValidFieldType checks if the field type is valid
func isValidFieldType(fieldType string) bool {
	for _, ft := range validFieldTypes {
		if ft == fieldType {
			return true
		}
	}
	return false
}

// GetCustomFields handles GET /api/custom-fields
// Lists custom fields, optionally filtered by project_id
func GetCustomFields(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	projectID := c.Query("project_id")

	var rows *sql.Rows
	var err error

	if projectID != "" {
		// Get project-specific fields AND global fields (project_id IS NULL)
		rows, err = database.Query(`
			SELECT cf.id, cf.name, cf.field_type, cf.project_id, cf.options, cf.required, cf.sort_order, cf.created_at, cf.updated_at, p.name as project_name
			FROM custom_fields cf
			LEFT JOIN projects p ON cf.project_id = p.id
			WHERE cf.project_id = ? OR cf.project_id IS NULL
			ORDER BY cf.sort_order ASC, cf.created_at ASC
		`, projectID)
	} else {
		rows, err = database.Query(`
			SELECT cf.id, cf.name, cf.field_type, cf.project_id, cf.options, cf.required, cf.sort_order, cf.created_at, cf.updated_at, p.name as project_name
			FROM custom_fields cf
			LEFT JOIN projects p ON cf.project_id = p.id
			ORDER BY cf.sort_order ASC, cf.created_at ASC
		`)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("custom fields"))
		return
	}
	defer rows.Close()

	fields := []CustomField{}
	for rows.Next() {
		var field CustomField
		var projectID sql.NullInt64
		var projectName sql.NullString
		var options []byte
		var required int

		err := rows.Scan(
			&field.ID,
			&field.Name,
			&field.FieldType,
			&projectID,
			&options,
			&required,
			&field.SortOrder,
			&field.CreatedAt,
			&field.UpdatedAt,
			&projectName,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewFetchError("custom fields"))
			return
		}

		if projectID.Valid {
			id := int(projectID.Int64)
			field.ProjectID = &id
		}
		if projectName.Valid {
			field.ProjectName = &projectName.String
		}
		if options != nil {
			field.Options = options
		}
		field.Required = required == 1

		fields = append(fields, field)
	}

	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("custom fields"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(fields))
}

// GetCustomField handles GET /api/custom-fields/:id
// Gets a single custom field by ID
func GetCustomField(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")

	var field CustomField
	var projectID sql.NullInt64
	var projectName sql.NullString
	var options []byte
	var required int

	err := database.QueryRow(`
		SELECT cf.id, cf.name, cf.field_type, cf.project_id, cf.options, cf.required, cf.sort_order, cf.created_at, cf.updated_at, p.name as project_name
		FROM custom_fields cf
		LEFT JOIN projects p ON cf.project_id = p.id
		WHERE cf.id = ?
	`, id).Scan(
		&field.ID,
		&field.Name,
		&field.FieldType,
		&projectID,
		&options,
		&required,
		&field.SortOrder,
		&field.CreatedAt,
		&field.UpdatedAt,
		&projectName,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Custom field"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("custom field"))
		return
	}

	if projectID.Valid {
		id := int(projectID.Int64)
		field.ProjectID = &id
	}
	if projectName.Valid {
		field.ProjectName = &projectName.String
	}
	if options != nil {
		field.Options = options
	}
	field.Required = required == 1

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(field))
}

// CreateCustomField handles POST /api/custom-fields
// Creates a new custom field
func CreateCustomField(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	var req CreateCustomFieldRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Name and field_type are required"))
		return
	}

	// Validate field type
	if !isValidFieldType(req.FieldType) {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("field_type must be one of: text, number, date, select, multiselect, checkbox, url"))
		return
	}

	// Validate options for select/multiselect fields
	if (req.FieldType == "select" || req.FieldType == "multiselect") && len(req.Options) == 0 {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Options are required for select/multiselect fields"))
		return
	}

	// Validate project_id if provided
	if req.ProjectID != nil && *req.ProjectID != 0 {
		var projExists bool
		if err := database.QueryRow("SELECT 1 FROM projects WHERE id = ?", *req.ProjectID).Scan(&projExists); err != nil {
			c.JSON(http.StatusBadRequest, middleware.NewValidationError("Project not found"))
			return
		}
	}

	id := uuid.New().String()
	sortOrder := req.SortOrder
	if sortOrder == 0 {
		sortOrder = 0
	}

	var options []byte
	if req.Options != nil {
		options = req.Options
	}

	_, err := database.Exec(`
		INSERT INTO custom_fields (id, name, field_type, project_id, options, required, sort_order, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
	`,
		id,
		req.Name,
		req.FieldType,
		req.ProjectID,
		options,
		req.Required,
		sortOrder,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewCreateError("custom field"))
		return
	}

	// Fetch the created field
	var field CustomField
	var projectID sql.NullInt64
	var projectName sql.NullString
	var required int

	err = database.QueryRow(`
		SELECT cf.id, cf.name, cf.field_type, cf.project_id, cf.options, cf.required, cf.sort_order, cf.created_at, cf.updated_at, p.name as project_name
		FROM custom_fields cf
		LEFT JOIN projects p ON cf.project_id = p.id
		WHERE cf.id = ?
	`, id).Scan(
		&field.ID,
		&field.Name,
		&field.FieldType,
		&projectID,
		&options,
		&required,
		&field.SortOrder,
		&field.CreatedAt,
		&field.UpdatedAt,
		&projectName,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("custom field"))
		return
	}

	if projectID.Valid {
		id := int(projectID.Int64)
		field.ProjectID = &id
	}
	if projectName.Valid {
		field.ProjectName = &projectName.String
	}
	if options != nil {
		field.Options = options
	}
	field.Required = required == 1

	c.JSON(http.StatusCreated, middleware.NewSuccessResponse(field))
}

// UpdateCustomField handles PUT /api/custom-fields/:id
// Updates an existing custom field
func UpdateCustomField(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")

	// Check if field exists
	var existingField CustomField
	var existingProjectID sql.NullInt64
	var existingOptions []byte
	var existingRequired int

	err := database.QueryRow(`
		SELECT id, name, field_type, project_id, options, required, sort_order
		FROM custom_fields WHERE id = ?
	`, id).Scan(
		&existingField.ID,
		&existingField.Name,
		&existingField.FieldType,
		&existingProjectID,
		&existingOptions,
		&existingRequired,
		&existingField.SortOrder,
	)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Custom field"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("custom field"))
		return
	}

	var req UpdateCustomFieldRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Invalid request body"))
		return
	}

	// Validate field_type if provided
	if req.FieldType != nil && !isValidFieldType(*req.FieldType) {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("field_type must be one of: text, number, date, select, multiselect, checkbox, url"))
		return
	}

	// Build update query dynamically
	name := existingField.Name
	if req.Name != nil {
		name = *req.Name
	}

	fieldType := existingField.FieldType
	if req.FieldType != nil {
		fieldType = *req.FieldType
	}

	projectID := existingProjectID
	if req.ProjectID != nil {
		if *req.ProjectID == 0 {
			projectID = sql.NullInt64{Valid: false}
		} else {
			// Validate project exists
			var projExists bool
			if err := database.QueryRow("SELECT 1 FROM projects WHERE id = ?", *req.ProjectID).Scan(&projExists); err != nil {
				c.JSON(http.StatusBadRequest, middleware.NewValidationError("Project not found"))
				return
			}
			projectID = sql.NullInt64{Int64: int64(*req.ProjectID), Valid: true}
		}
	}

	options := existingOptions
	if req.Options != nil {
		options = req.Options
	}

	// Re-run select/multiselect invariant after computing the final field_type
	if (fieldType == "select" || fieldType == "multiselect") && len(options) == 0 {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Options are required for select/multiselect fields"))
		return
	}

	required := existingRequired
	if req.Required != nil {
		if *req.Required {
			required = 1
		} else {
			required = 0
		}
	}

	sortOrder := existingField.SortOrder
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}

	_, err = database.Exec(`
		UPDATE custom_fields 
		SET name = ?, field_type = ?, project_id = ?, options = ?, required = ?, sort_order = ?, updated_at = datetime('now')
		WHERE id = ?
	`,
		name,
		fieldType,
		projectID,
		options,
		required,
		sortOrder,
		id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("custom field"))
		return
	}

	// Fetch the updated field
	var field CustomField
	var newProjectID sql.NullInt64
	var projectName sql.NullString
	var newOptions []byte
	var newRequired int

	err = database.QueryRow(`
		SELECT cf.id, cf.name, cf.field_type, cf.project_id, cf.options, cf.required, cf.sort_order, cf.created_at, cf.updated_at, p.name as project_name
		FROM custom_fields cf
		LEFT JOIN projects p ON cf.project_id = p.id
		WHERE cf.id = ?
	`, id).Scan(
		&field.ID,
		&field.Name,
		&field.FieldType,
		&newProjectID,
		&newOptions,
		&newRequired,
		&field.SortOrder,
		&field.CreatedAt,
		&field.UpdatedAt,
		&projectName,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("custom field"))
		return
	}

	if newProjectID.Valid {
		id := int(newProjectID.Int64)
		field.ProjectID = &id
	}
	if projectName.Valid {
		field.ProjectName = &projectName.String
	}
	if newOptions != nil {
		field.Options = newOptions
	}
	field.Required = newRequired == 1

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(field))
}

// DeleteCustomField handles DELETE /api/custom-fields/:id
// Deletes a custom field
func DeleteCustomField(c *gin.Context) {
	database, ok := c.MustGet("database").(*db.Database)
	if !ok {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Database not available"))
		return
	}

	id := c.Param("id")

	// Check if field exists
	var existingField CustomField
	err := database.QueryRow(`
		SELECT id FROM custom_fields WHERE id = ?
	`, id).Scan(&existingField.ID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Custom field"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("custom field"))
		return
	}

	// Delete the field (cascade will delete associated values)
	_, err = database.Exec(`DELETE FROM custom_fields WHERE id = ?`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewDeleteError("custom field"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(gin.H{
		"id":      id,
		"message": "Custom field deleted successfully",
	}))
}
