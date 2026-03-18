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

// Person represents a person in the system
type Person struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Email       *string `json:"email"`
	Company     *string `json:"company"`
	Designation *string `json:"designation"`
	ProjectID   *int64  `json:"project_id"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

// CreatePersonRequest represents the request body for creating a person
type CreatePersonRequest struct {
	Name        string  `json:"name" binding:"required"`
	Email       *string `json:"email"`
	Company     *string `json:"company"`
	Designation *string `json:"designation"`
	ProjectID   *int64  `json:"project_id"`
}

// UpdatePersonRequest represents the request body for updating a person
type UpdatePersonRequest struct {
	Name        *string `json:"name"`
	Email       *string `json:"email"`
	Company     *string `json:"company"`
	Designation *string `json:"designation"`
	ProjectID   *int64  `json:"project_id"`
}

// GetPeople handles GET /api/people - List all people with optional project filter
func GetPeople(c *gin.Context) {
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

	projectID := c.Query("project_id")

	var query string
	var args []interface{}

	if projectID != "" {
		query = "SELECT id, name, email, company, designation, project_id, created_at, updated_at FROM people WHERE project_id = ? ORDER BY created_at DESC"
		args = append(args, projectID)
	} else {
		query = "SELECT id, name, email, company, designation, project_id, created_at, updated_at FROM people ORDER BY created_at DESC"
	}

	rows, err := database.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("people"))
		return
	}
	defer rows.Close()

	var people []Person
	for rows.Next() {
		var p Person
		if err := rows.Scan(&p.ID, &p.Name, &p.Email, &p.Company, &p.Designation, &p.ProjectID, &p.CreatedAt, &p.UpdatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewFetchError("people"))
			return
		}
		people = append(people, p)
	}

	if people == nil {
		people = []Person{}
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(people))
}

// GetPerson handles GET /api/people/:id - Get single person
func GetPerson(c *gin.Context) {
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

	var p Person
	err := database.QueryRow(
		"SELECT id, name, email, company, designation, project_id, created_at, updated_at FROM people WHERE id = ?",
		id,
	).Scan(&p.ID, &p.Name, &p.Email, &p.Company, &p.Designation, &p.ProjectID, &p.CreatedAt, &p.UpdatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Person"))
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("person"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(p))
}

// CreatePerson handles POST /api/people - Create new person
func CreatePerson(c *gin.Context) {
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

	var req CreatePersonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Invalid request body"))
		return
	}

	// Validate name is not empty
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Person name is required"))
		return
	}

	// Validate project_id if provided
	if req.ProjectID != nil {
		var count int
		err := database.QueryRow("SELECT COUNT(*) FROM projects WHERE id = ?", *req.ProjectID).Scan(&count)
		if err != nil || count == 0 {
			c.JSON(http.StatusBadRequest, middleware.NewValidationError("Project not found"))
			return
		}
	}

	id := uuid.New().String()

	var email, company, designation interface{}
	if req.Email != nil {
		email = *req.Email
		if email == "" {
			email = nil
		}
	}
	if req.Company != nil {
		company = *req.Company
		if company == "" {
			company = nil
		}
	}
	if req.Designation != nil {
		designation = *req.Designation
		if designation == "" {
			designation = nil
		}
	}

	_, err := database.Exec(
		"INSERT INTO people (id, name, email, company, designation, project_id) VALUES (?, ?, ?, ?, ?, ?)",
		id,
		req.Name,
		email,
		company,
		designation,
		req.ProjectID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewCreateError("person"))
		return
	}

	var p Person
	err = database.QueryRow(
		"SELECT id, name, email, company, designation, project_id, created_at, updated_at FROM people WHERE id = ?",
		id,
	).Scan(&p.ID, &p.Name, &p.Email, &p.Company, &p.Designation, &p.ProjectID, &p.CreatedAt, &p.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("person"))
		return
	}

	c.JSON(http.StatusCreated, middleware.NewSuccessResponse(p))
}

// UpdatePerson handles PUT /api/people/:id - Update person
func UpdatePerson(c *gin.Context) {
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

	// Check if person exists
	var existsCheck int
	err := database.QueryRow("SELECT COUNT(*) FROM people WHERE id = ?", id).Scan(&existsCheck)
	if err != nil || existsCheck == 0 {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Person"))
		return
	}

	var req UpdatePersonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Invalid request body"))
		return
	}

	// Validate project_id if provided
	if req.ProjectID != nil {
		var count int
		err := database.QueryRow("SELECT COUNT(*) FROM projects WHERE id = ?", *req.ProjectID).Scan(&count)
		if err != nil || count == 0 {
			c.JSON(http.StatusBadRequest, middleware.NewValidationError("Project not found"))
			return
		}
	}

	// Build dynamic update query
	query := "UPDATE people SET "
	var args []interface{}
	hasUpdates := false

	if req.Name != nil {
		trimmedName := strings.TrimSpace(*req.Name)
		if trimmedName == "" {
			c.JSON(http.StatusBadRequest, middleware.NewValidationError("Person name cannot be blank"))
			return
		}
		query += "name = ?"
		args = append(args, trimmedName)
		hasUpdates = true
	}

	if req.Email != nil {
		if hasUpdates {
			query += ", "
		}
		query += "email = ?"
		if *req.Email == "" {
			args = append(args, nil)
		} else {
			args = append(args, *req.Email)
		}
		hasUpdates = true
	}

	if req.Company != nil {
		if hasUpdates {
			query += ", "
		}
		query += "company = ?"
		if *req.Company == "" {
			args = append(args, nil)
		} else {
			args = append(args, *req.Company)
		}
		hasUpdates = true
	}

	if req.Designation != nil {
		if hasUpdates {
			query += ", "
		}
		query += "designation = ?"
		if *req.Designation == "" {
			args = append(args, nil)
		} else {
			args = append(args, *req.Designation)
		}
		hasUpdates = true
	}

	if req.ProjectID != nil {
		if hasUpdates {
			query += ", "
		}
		query += "project_id = ?"
		args = append(args, *req.ProjectID)
		hasUpdates = true
	}

	if hasUpdates {
		query += ", updated_at = CURRENT_TIMESTAMP WHERE id = ?"
		args = append(args, id)
		_, err = database.Exec(query, args...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("person"))
			return
		}
	}

	var p Person
	err = database.QueryRow(
		"SELECT id, name, email, company, designation, project_id, created_at, updated_at FROM people WHERE id = ?",
		id,
	).Scan(&p.ID, &p.Name, &p.Email, &p.Company, &p.Designation, &p.ProjectID, &p.CreatedAt, &p.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("person"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(p))
}

// DeletePerson handles DELETE /api/people/:id - Delete person
func DeletePerson(c *gin.Context) {
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

	// Check if person exists
	var existsCheck int
	err := database.QueryRow("SELECT COUNT(*) FROM people WHERE id = ?", id).Scan(&existsCheck)
	if err != nil || existsCheck == 0 {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Person"))
		return
	}

	_, err = database.Exec("DELETE FROM people WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewDeleteError("person"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(gin.H{"message": "Person deleted successfully"}))
}
