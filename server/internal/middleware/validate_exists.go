package middleware

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/celestask/server/internal/db"
	"github.com/gin-gonic/gin"
)

// ValidateExists checks if a record exists in the given table
// Returns the record if found, nil if not found, and any error
func ValidateExists(database *db.Database, table string, id string) (*sql.Rows, error) {
	query := fmt.Sprintf("SELECT id FROM %s WHERE id = ?", table)
	rows, err := database.Query(query, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, nil
	}

	return rows, nil
}

// ValidateExistsMiddleware creates middleware that validates an entity exists
// before allowing the request to proceed to the handler
//
// Parameters:
//   - table: Database table name (e.g., "projects", "tasks")
//   - paramName: Route parameter name to get the ID from (default: "id")
//   - entityName: Friendly name for error messages (optional, defaults to table name without 's')
//
// Usage:
//
//	router.GET("/projects/:id", middleware.ValidateExistsMiddleware("projects", "id", "Project"), handler)
func ValidateExistsMiddleware(table string, paramName string, entityName string) gin.HandlerFunc {
	if paramName == "" {
		paramName = "id"
	}
	if entityName == "" {
		// Default to table name without trailing 's'
		entityName = table
		if len(entityName) > 0 && entityName[len(entityName)-1] == 's' {
			entityName = entityName[:len(entityName)-1]
		}
	}

	return func(c *gin.Context) {
		// Get the database from context (assumed to be set by database middleware)
		databaseIface, exists := c.Get("database")
		if !exists {
			c.JSON(http.StatusInternalServerError, NewInternalError("Database not available"))
			c.Abort()
			return
		}

		database, ok := databaseIface.(*db.Database)
		if !ok {
			c.JSON(http.StatusInternalServerError, NewInternalError("Invalid database instance"))
			c.Abort()
			return
		}

		id := c.Param(paramName)
		if id == "" {
			c.JSON(http.StatusBadRequest, NewValidationError(fmt.Sprintf("Missing %s parameter", paramName)))
			c.Abort()
			return
		}

		exists, err := recordExists(database, table, id)
		if err != nil {
			fmt.Printf("Error checking existence in %s: %v\n", table, err)
			c.JSON(http.StatusInternalServerError, NewInternalError("Failed to validate entity"))
			c.Abort()
			return
		}

		if !exists {
			c.JSON(http.StatusNotFound, NewNotFoundError(entityName))
			c.Abort()
			return
		}

		// Store the entity ID in context for use in the handler
		c.Set("entityId", id)
		c.Next()
	}
}

// ValidateRelatedExistsMiddleware creates middleware that validates a related entity exists
// This is useful for validating foreign keys in request bodies
//
// Parameters:
//   - table: Database table name (e.g., "projects", "tasks")
//   - bodyField: Request body field name to get the ID from
//   - entityName: Friendly name for error messages (optional, defaults to table name without 's')
//
// Usage:
//
//	router.POST("/tasks", middleware.ValidateRelatedExistsMiddleware("projects", "project_id", "Project"), handler)
func ValidateRelatedExistsMiddleware(table string, bodyField string, entityName string) gin.HandlerFunc {
	if entityName == "" {
		entityName = table
		if len(entityName) > 0 && entityName[len(entityName)-1] == 's' {
			entityName = entityName[:len(entityName)-1]
		}
	}

	return func(c *gin.Context) {
		// Get the database from context
		databaseIface, exists := c.Get("database")
		if !exists {
			c.JSON(http.StatusInternalServerError, NewInternalError("Database not available"))
			c.Abort()
			return
		}

		database, ok := databaseIface.(*db.Database)
		if !ok {
			c.JSON(http.StatusInternalServerError, NewInternalError("Invalid database instance"))
			c.Abort()
			return
		}

		// Get the ID from the request body
		var id string
		if err := c.ShouldBindJSON(&struct {
			ID string `json:"id"`
		}{}); err == nil {
			// Try to get from "id" field first
			id = c.GetString(bodyField)
		}

		// If not found in body, check if it's a different field
		if id == "" {
			var bodyMap map[string]interface{}
			if err := c.ShouldBindJSON(&bodyMap); err == nil {
				if val, ok := bodyMap[bodyField]; ok {
					if valStr, ok := val.(string); ok {
						id = valStr
					}
				}
			}
		}

		// Skip if field is not provided or is null/empty
		if id == "" {
			c.Next()
			return
		}

		exists, err := recordExists(database, table, id)
		if err != nil {
			fmt.Printf("Error checking existence in %s: %v\n", table, err)
			c.JSON(http.StatusInternalServerError, NewInternalError("Failed to validate entity"))
			c.Abort()
			return
		}

		if !exists {
			c.JSON(http.StatusBadRequest, NewValidationError(fmt.Sprintf("%s not found", entityName)))
			c.Abort()
			return
		}

		c.Next()
	}
}

// recordExists checks if a record with the given ID exists in the table
func recordExists(database *db.Database, table string, id string) (bool, error) {
	query := fmt.Sprintf("SELECT 1 FROM %s WHERE id = ? LIMIT 1", table)
	row := database.QueryRow(query, id)

	var exists int
	err := row.Scan(&exists)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return true, nil
}

// GetEntity retrieves the entity from context (set by ValidateExistsMiddleware)
func GetEntity(c *gin.Context) (string, bool) {
	entityId, exists := c.Get("entityId")
	if !exists {
		return "", false
	}
	id, ok := entityId.(string)
	return id, ok
}
