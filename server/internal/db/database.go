package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

type Database struct {
	*sql.DB
}

func InitDB() (*Database, error) {
	// Get the directory for the database file
	dbDir := os.Getenv("DB_DIR")
	if dbDir == "" {
		// Default to a data directory relative to the current working directory
		cwd, err := os.Getwd()
		if err != nil {
			cwd = "."
		}
		dbDir = filepath.Join(cwd, "data")
	}

	// Create directory if it doesn't exist
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}

	dbPath := filepath.Join(dbDir, "celestask.db")

	// Open database connection.
	// _pragma=foreign_keys%3Don enables FK enforcement on every new connection
	// in the pool, not just the first one (PRAGMA is per-connection in SQLite).
	db, err := sql.Open("sqlite", dbPath+"?_pragma=foreign_keys%3Don&_pragma=journal_mode%3Dwal&_pragma=busy_timeout%3D5000")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &Database{db}, nil
}
