package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
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

// tableColumns defines the allowed columns for each table to prevent SQL injection.
// Only columns listed here can be used in import INSERT statements.
var tableColumns = map[string]map[string]struct{}{
	"projects": {"id": {}, "name": {}, "description": {}, "color": {}, "parent_project_id": {}, "owner_id": {}, "created_at": {}, "updated_at": {}},
	"tasks":    {"id": {}, "project_id": {}, "parent_task_id": {}, "title": {}, "description": {}, "status": {}, "priority": {}, "assignee_id": {}, "due_date": {}, "start_date": {}, "end_date": {}, "progress_percent": {}, "estimated_duration_minutes": {}, "actual_duration_minutes": {}, "created_at": {}, "updated_at": {}},
	"people":   {"id": {}, "name": {}, "email": {}, "company": {}, "designation": {}, "project_id": {}, "created_at": {}, "updated_at": {}},
	"tags":     {"id": {}, "name": {}, "color": {}, "project_id": {}, "created_at": {}, "updated_at": {}},
	"notes":    {"id": {}, "content": {}, "entity_type": {}, "entity_id": {}, "created_at": {}, "updated_at": {}},
	"task_assignees":     {"id": {}, "task_id": {}, "person_id": {}, "role": {}, "created_at": {}},
	"task_tags":          {"id": {}, "task_id": {}, "tag_id": {}, "created_at": {}},
	"project_assignees":  {"id": {}, "project_id": {}, "person_id": {}, "role": {}, "created_at": {}},
	"custom_fields":      {"id": {}, "name": {}, "field_type": {}, "project_id": {}, "options": {}, "required": {}, "sort_order": {}, "created_at": {}, "updated_at": {}},
	"custom_field_values": {"id": {}, "task_id": {}, "custom_field_id": {}, "value": {}, "created_at": {}, "updated_at": {}},
	"saved_views":    {"id": {}, "name": {}, "view_type": {}, "project_id": {}, "filters": {}, "sort_by": {}, "sort_order": {}, "is_default": {}, "created_at": {}, "updated_at": {}},
	"time_entries":   {"id": {}, "entity_type": {}, "entity_id": {}, "person_id": {}, "description": {}, "start_time": {}, "end_time": {}, "duration_us": {}, "is_running": {}, "created_at": {}, "updated_at": {}},
	"pomodoro_settings": {"id": {}, "work_duration": {}, "short_break_duration": {}, "long_break_duration": {}, "sessions_until_long_break": {}, "daily_goal": {}, "auto_start_breaks": {}, "auto_start_work": {}, "created_at": {}, "updated_at": {}},
	"pomodoro_sessions":  {"id": {}, "session_type": {}, "started_at": {}, "ended_at": {}, "elapsed_us": {}, "completed": {}, "task_id": {}, "created_at": {}},
}

// ExportPayload is the JSON shape the client expects for export/import.
// It matches the client's ImportPayload type: { version, exportedAt, data }.
type ExportPayload struct {
	Version    string                            `json:"version"`
	ExportedAt string                            `json:"exportedAt"`
	Data       map[string][]map[string]interface{} `json:"data"`
}

// ImportTableSummary holds per-table import results.
type ImportTableSummary struct {
	Imported int `json:"imported"`
	Skipped  int `json:"skipped"`
	Errors   int `json:"errors"`
}

// ImportErrorDetail holds details of a single import error.
type ImportErrorDetail struct {
	Table string `json:"table"`
	ID    string `json:"id"`
	Error string `json:"error"`
}

// ImportResult is returned synchronously after a successful import.
type ImportResult struct {
	Mode        string                        `json:"mode"`
	Summary     map[string]ImportTableSummary `json:"summary"`
	Totals      ImportTotals                  `json:"totals"`
	ImportedAt  string                        `json:"importedAt"`
	ErrorDetails []ImportErrorDetail          `json:"errorDetails,omitempty"`
	TotalErrors int                           `json:"totalErrors,omitempty"`
}

// ImportTotals aggregates imported/skipped/error counts.
type ImportTotals struct {
	Imported int `json:"imported"`
	Skipped  int `json:"skipped"`
	Errors   int `json:"errors"`
}

// GetExport exports the entire database as a downloadable JSON file using
// the client-compatible payload shape { version, exportedAt, data }.
func GetExport(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)

	payload := ExportPayload{
		Version:    "1.0",
		ExportedAt: time.Now().UTC().Format(time.RFC3339),
		Data:       make(map[string][]map[string]interface{}),
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

		var tableRows []map[string]interface{}
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
			tableRows = append(tableRows, rowMap)
		}

		rows.Close()
		if err := rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewErrorResponse(
				middleware.CodeFetchError,
				fmt.Sprintf("Error iterating rows from table %s: %v", tableName, err),
			))
			return
		}

		if tableRows == nil {
			tableRows = []map[string]interface{}{}
		}
		payload.Data[tableName] = tableRows
	}

	exportJSON, err := json.Marshal(payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError("Failed to serialize export data"))
		return
	}

	filename := fmt.Sprintf("celestask-export-%s.json", time.Now().Format("2006-01-02"))
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Content-Type", "application/json")
	c.Data(http.StatusOK, "application/json", exportJSON)
}

// GetExportStatus returns metadata about the current database state.
func GetExportStatus(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)

	tableStats := make(map[string]int)
	totalRecords := 0

	for _, tableName := range tableNames {
		var count int
		err := database.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %s", tableName)).Scan(&count)
		if err != nil {
			count = 0
		}
		tableStats[tableName] = count
		totalRecords += count
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(gin.H{
		"version":         "1.0",
		"tableStats":      tableStats,
		"totalRecords":    totalRecords,
		"supportedTables": tableNames,
	}))
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
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Content-Type", "application/octet-stream")

	c.File(dbPath)
}

// PostImport imports data from a JSON export file.
// Accepts the client payload shape { version, exportedAt, data } and
// honours the ?mode=merge|replace query parameter. The operation runs
// synchronously and returns an ImportResult.
func PostImport(c *gin.Context) {
	database := c.MustGet("database").(*db.Database)

	mode := c.Query("mode")
	if mode != "merge" && mode != "replace" {
		mode = "replace"
	}

	// Read request body
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Failed to read request body"))
		return
	}

	// Parse JSON payload – accept the client shape { version, exportedAt, data }
	var payload ExportPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError(fmt.Sprintf("Invalid JSON format: %v", err)))
		return
	}

	if payload.Data == nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Invalid import data: missing 'data' field"))
		return
	}

	result, importErr := performSyncImport(database, payload, mode)
	if importErr != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewErrorResponse(
			middleware.CodeInternalError,
			fmt.Sprintf("Import failed: %v", importErr),
		))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(result))
}

// performSyncImport runs the import operation inside a single transaction and
// returns an ImportResult on success.
func performSyncImport(database *db.Database, payload ExportPayload, mode string) (*ImportResult, error) {
	result := &ImportResult{
		Mode:       mode,
		Summary:    make(map[string]ImportTableSummary),
		ImportedAt: time.Now().UTC().Format(time.RFC3339),
	}

	// Disable foreign keys for the duration of the import
	if _, err := database.Exec("PRAGMA foreign_keys = OFF"); err != nil {
		return nil, fmt.Errorf("failed to disable foreign keys: %v", err)
	}
	defer func() {
		if _, err := database.Exec("PRAGMA foreign_keys = ON"); err != nil {
			fmt.Printf("Warning: failed to re-enable foreign keys: %v\n", err)
		}
	}()

	tx, err := database.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %v", err)
	}

	if mode == "replace" {
		// Clear all tables in reverse dependency order
		clearOrder := []string{
			"pomodoro_sessions", "pomodoro_settings", "time_entries",
			"saved_views", "custom_field_values", "custom_fields",
			"project_assignees", "task_tags", "task_assignees",
			"notes", "tags", "people", "tasks", "projects",
		}
		for _, t := range clearOrder {
			if _, err := tx.Exec(fmt.Sprintf("DELETE FROM %s", t)); err != nil {
				tx.Rollback()
				return nil, fmt.Errorf("failed to clear table %s: %v", t, err)
			}
		}
	}

	// Import in dependency order
	importOrder := []string{
		"projects", "people", "tags", "tasks", "notes",
		"task_assignees", "task_tags", "project_assignees",
		"custom_fields", "custom_field_values",
		"saved_views", "time_entries",
		"pomodoro_settings", "pomodoro_sessions",
	}

	var errorDetails []ImportErrorDetail

	for _, tableName := range importOrder {
		records, ok := payload.Data[tableName]
		if !ok || len(records) == 0 {
			result.Summary[tableName] = ImportTableSummary{}
			continue
		}

		summary, errs := importTableRows(tx, tableName, records, mode)
		result.Summary[tableName] = summary
		errorDetails = append(errorDetails, errs...)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %v", err)
	}

	// Aggregate totals
	for _, s := range result.Summary {
		result.Totals.Imported += s.Imported
		result.Totals.Skipped += s.Skipped
		result.Totals.Errors += s.Errors
	}

	if len(errorDetails) > 0 {
		result.ErrorDetails = errorDetails
		result.TotalErrors = len(errorDetails)
	}

	return result, nil
}

// importTableRows inserts records into a table and returns per-table stats.
// Column names are validated against a known allowlist to prevent SQL injection.
func importTableRows(tx *sql.Tx, tableName string, records []map[string]interface{}, mode string) (ImportTableSummary, []ImportErrorDetail) {
	summary := ImportTableSummary{}
	var errorDetails []ImportErrorDetail

	if len(records) == 0 {
		return summary, errorDetails
	}

	// Get the allowlist for this table
	allowedCols, ok := tableColumns[tableName]
	if !ok {
		// Unknown table – skip safely
		return summary, errorDetails
	}

	// Collect all column names from the records, filtering against the allowlist.
	columnSet := make(map[string]struct{})
	for _, rec := range records {
		for col := range rec {
			if _, allowed := allowedCols[col]; allowed {
				columnSet[col] = struct{}{}
			}
		}
	}
	var columns []string
	for col := range columnSet {
		columns = append(columns, col)
	}
	sort.Strings(columns)

	if len(columns) == 0 {
		return summary, errorDetails
	}

	insertKeyword := "INSERT OR REPLACE"
	if mode == "merge" {
		insertKeyword = "INSERT OR IGNORE"
	}

	placeholders := make([]string, len(columns))
	for i := range placeholders {
		placeholders[i] = "?"
	}
	placeholderStr := "(" + joinColumns(placeholders) + ")"

	query := fmt.Sprintf(
		"%s INTO %s (%s) VALUES %s",
		insertKeyword,
		tableName,
		joinColumns(columns),
		placeholderStr,
	)

	stmt, err := tx.Prepare(query)
	if err != nil {
		// Can't prepare – mark all as errors
		for _, rec := range records {
			id, _ := rec["id"].(string)
			errorDetails = append(errorDetails, ImportErrorDetail{Table: tableName, ID: id, Error: err.Error()})
			summary.Errors++
		}
		return summary, errorDetails
	}
	defer stmt.Close()

	for _, rec := range records {
		values := make([]interface{}, len(columns))
		for i, col := range columns {
			values[i] = rec[col]
		}

		if _, err := stmt.Exec(values...); err != nil {
			id, _ := rec["id"].(string)
			errorDetails = append(errorDetails, ImportErrorDetail{Table: tableName, ID: id, Error: err.Error()})
			summary.Errors++
		} else {
			summary.Imported++
		}
	}

	return summary, errorDetails
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

// GetImportStatus is kept for backward compatibility but returns a static idle status
// since imports are now synchronous.
func GetImportStatus(c *gin.Context) {
	c.JSON(http.StatusOK, middleware.NewSuccessResponse(gin.H{
		"status":   "idle",
		"progress": 100,
	}))
}

