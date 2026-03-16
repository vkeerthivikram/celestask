package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/celestask/server/internal/db"
	"github.com/celestask/server/internal/middleware"
	"github.com/gin-gonic/gin"
)

// Table names to export/import
var tableNames = []string{
	"projects",
	"tasks",
	"people",
	"tags",
	"notes",
	"task_assignees",
	"task_tags",
	"project_assignees",
	"custom_fields",
	"custom_field_values",
	"saved_views",
	"time_entries",
	"pomodoro_settings",
	"pomodoro_sessions",
}

// ExportData represents the structure of exported JSON data
type ExportData struct {
	Version    string                   `json:"version"`
	ExportedAt time.Time                `json:"exported_at"`
	Tables     map[string][]interface{} `json:"tables"`
}

// ImportStatus tracks the status of an import operation
type ImportStatus struct {
	Status          string    `json:"status"`   // "idle", "in_progress", "completed", "failed"
	Progress        int       `json:"progress"` // 0-100
	RecordsImported int       `json:"records_imported"`
	TotalRecords    int       `json:"total_records"`
	Error           string    `json:"error,omitempty"`
	StartedAt       time.Time `json:"started_at,omitempty"`
	CompletedAt     time.Time `json:"completed_at,omitempty"`
}

// Global import status (in production, this should be in a database or cache)
var (
	importStatus     ImportStatus
	importStatusLock sync.RWMutex
)

// GetExport exports the entire database as JSON
func GetExport(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)

	exportData := ExportData{
		Version:    "1.0",
		ExportedAt: time.Now(),
		Tables:     make(map[string][]interface{}),
	}

	for _, tableName := range tableNames {
		rows, err := database.Query(fmt.Sprintf("SELECT * FROM %s", tableName))
		if err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewErrorResponse(
				middleware.CodeFetchError,
				fmt.Sprintf("Failed to fetch from table %s: %v", tableName, err),
			))
			return
		}

		columns, err := rows.Columns()
		if err != nil {
			rows.Close()
			c.JSON(http.StatusInternalServerError, middleware.NewErrorResponse(
				middleware.CodeFetchError,
				fmt.Sprintf("Failed to get columns for table %s: %v", tableName, err),
			))
			return
		}

		for rows.Next() {
			values := make([]interface{}, len(columns))
			valuePtrs := make([]interface{}, len(columns))
			for i := range values {
				valuePtrs[i] = &values[i]
			}

			if err := rows.Scan(valuePtrs...); err != nil {
				rows.Close()
				c.JSON(http.StatusInternalServerError, middleware.NewErrorResponse(
					middleware.CodeFetchError,
					fmt.Sprintf("Failed to scan row from table %s: %v", tableName, err),
				))
				return
			}

			rowMap := make(map[string]interface{})
			for i, col := range columns {
				rowMap[col] = values[i]
			}

			exportData.Tables[tableName] = append(exportData.Tables[tableName], rowMap)
		}

		rows.Close()
		if err := rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewErrorResponse(
				middleware.CodeFetchError,
				fmt.Sprintf("Error iterating rows from table %s: %v", tableName, err),
			))
			return
		}
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(exportData))
}

// GetExportSQLite downloads the SQLite database file
func GetExportSQLite(c *gin.Context) {
	dbDir := os.Getenv("DB_DIR")
	if dbDir == "" {
		exeDir, err := os.Getwd()
		if err != nil {
			exeDir = "."
		}
		dbDir = filepath.Join(exeDir, "data")
	}

	dbPath := filepath.Join(dbDir, "celestask.db")

	// Check if file exists
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, middleware.NewNotFoundError("Database file"))
		return
	}

	// Set headers for file download
	filename := fmt.Sprintf("celestask_%s.db", time.Now().Format("2006-01-02"))
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", "application/octet-stream")

	c.File(dbPath)
}

// PostImport imports data from JSON (replaces all data)
func PostImport(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)

	// Read request body
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Failed to read request body"))
		return
	}

	// Parse JSON
	var importData ExportData
	if err := json.Unmarshal(body, &importData); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError(fmt.Sprintf("Invalid JSON format: %v", err)))
		return
	}

	// Validate structure
	if importData.Tables == nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Invalid import data: missing tables"))
		return
	}

	// Calculate total records
	totalRecords := 0
	for _, records := range importData.Tables {
		totalRecords += len(records)
	}

	// Set import status to in_progress
	importStatusLock.Lock()
	importStatus = ImportStatus{
		Status:          "in_progress",
		Progress:        0,
		RecordsImported: 0,
		TotalRecords:    totalRecords,
		StartedAt:       time.Now(),
	}
	importStatusLock.Unlock()

	// Start import in background
	go performImport(database, importData)

	c.JSON(http.StatusAccepted, middleware.NewSuccessResponse(gin.H{
		"message": "Import started",
		"status":  "in_progress",
	}))
}

// performImport performs the actual import operation
func performImport(database *db.Database, importData ExportData) {
	defer func() {
		if r := recover(); r != nil {
			importStatusLock.Lock()
			importStatus.Status = "failed"
			importStatus.Error = fmt.Sprintf("Panic during import: %v", r)
			importStatusLock.Unlock()
		}
	}()

	recordsImported := 0

	// Disable foreign keys temporarily
	if _, err := database.Exec("PRAGMA foreign_keys = OFF"); err != nil {
		setImportError(fmt.Sprintf("Failed to disable foreign keys: %v", err))
		return
	}

	// Begin transaction
	tx, err := database.Begin()
	if err != nil {
		setImportError(fmt.Sprintf("Failed to begin transaction: %v", err))
		return
	}

	// Clear existing data (in reverse order of dependencies)
	// First clear tables with foreign keys, then tables referenced by others
	tablesToClear := []string{
		"pomodoro_sessions",
		"pomodoro_settings",
		"time_entries",
		"saved_views",
		"custom_field_values",
		"custom_fields",
		"project_assignees",
		"task_tags",
		"task_assignees",
		"notes",
		"tags",
		"people",
		"tasks",
		"projects",
	}

	for _, tableName := range tablesToClear {
		if _, err := tx.Exec(fmt.Sprintf("DELETE FROM %s", tableName)); err != nil {
			tx.Rollback()
			setImportError(fmt.Sprintf("Failed to clear table %s: %v", tableName, err))
			return
		}
	}

	// Import data in order of dependencies (tables without foreign keys first)
	importOrder := []string{
		"projects",
		"people",
		"tags",
		"tasks",
		"notes",
		"task_assignees",
		"task_tags",
		"project_assignees",
		"custom_fields",
		"custom_field_values",
		"saved_views",
		"time_entries",
		"pomodoro_settings",
		"pomodoro_sessions",
	}

	for _, tableName := range importOrder {
		records, ok := importData.Tables[tableName]
		if !ok || len(records) == 0 {
			continue
		}

		if err := importTable(tx, tableName, records); err != nil {
			tx.Rollback()
			setImportError(fmt.Sprintf("Failed to import table %s: %v", tableName, err))
			return
		}

		recordsImported += len(records)

		// Update progress
		totalRecords := 0
		for _, r := range importData.Tables {
			totalRecords += len(r)
		}
		progress := 0
		if totalRecords > 0 {
			progress = (recordsImported * 100) / totalRecords
		}

		importStatusLock.Lock()
		importStatus.Progress = progress
		importStatus.RecordsImported = recordsImported
		importStatusLock.Unlock()
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		setImportError(fmt.Sprintf("Failed to commit transaction: %v", err))
		return
	}

	// Re-enable foreign keys
	if _, err := database.Exec("PRAGMA foreign_keys = ON"); err != nil {
		setImportError(fmt.Sprintf("Failed to re-enable foreign keys: %v", err))
		return
	}

	// Update final status
	importStatusLock.Lock()
	importStatus.Status = "completed"
	importStatus.Progress = 100
	importStatus.CompletedAt = time.Now()
	importStatusLock.Unlock()
}

// importTable imports records into a table
func importTable(tx *sql.Tx, tableName string, records []interface{}) error {
	if len(records) == 0 {
		return nil
	}

	// Get column names from first record
	firstRecord, ok := records[0].(map[string]interface{})
	if !ok {
		return fmt.Errorf("invalid record format for table %s", tableName)
	}

	var columns []string
	var placeholders []string
	var values []interface{}

	for col := range firstRecord {
		columns = append(columns, col)
		placeholders = append(placeholders, "?")
	}

	for _, record := range records {
		recordMap, ok := record.(map[string]interface{})
		if !ok {
			return fmt.Errorf("invalid record format for table %s", tableName)
		}

		for _, col := range columns {
			val, ok := recordMap[col]
			if !ok {
				val = nil
			}
			values = append(values, val)
		}
	}

	query := fmt.Sprintf(
		"INSERT INTO %s (%s) VALUES %s",
		tableName,
		joinColumns(columns),
		buildValuesPlaceholders(len(records), len(columns)),
	)

	_, err := tx.Exec(query, values...)
	if err != nil {
		return fmt.Errorf("failed to insert into %s: %v", tableName, err)
	}

	return nil
}

// joinColumns joins column names with commas
func joinColumns(columns []string) string {
	result := ""
	for i, col := range columns {
		if i > 0 {
			result += ", "
		}
		result += col
	}
	return result
}

// buildValuesPlaceholders builds VALUES clause for multiple rows
func buildValuesPlaceholders(numRows, numCols int) string {
	result := ""
	for row := 0; row < numRows; row++ {
		if row > 0 {
			result += ", "
		}
		result += "("
		for col := 0; col < numCols; col++ {
			if col > 0 {
				result += ", "
			}
			result += "?"
		}
		result += ")"
	}
	return result
}

// setImportError sets the import status to failed with an error message
func setImportError(errMsg string) {
	importStatusLock.Lock()
	importStatus.Status = "failed"
	importStatus.Error = errMsg
	importStatus.CompletedAt = time.Now()
	importStatusLock.Unlock()
}

// GetImportStatus returns the current import status
func GetImportStatus(c *gin.Context) {
	importStatusLock.RLock()
	status := importStatus
	importStatusLock.RUnlock()

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(status))
}
