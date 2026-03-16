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
		// Default to a data directory relative to the executable
		exeDir, err := os.Getwd()
		if err != nil {
			exeDir = "."
		}
		dbDir = filepath.Join(exeDir, "data")
	}

	// Create directory if it doesn't exist
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}

	dbPath := filepath.Join(dbDir, "celestask.db")

	// Open database connection
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure SQLite pragmas for better performance
	_, err = db.Exec(`
		PRAGMA journal_mode = WAL;
		PRAGMA foreign_keys = ON;
		PRAGMA busy_timeout = 5000;
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to configure database pragmas: %w", err)
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &Database{db}, nil
}
