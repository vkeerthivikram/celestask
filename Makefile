# Celestask - Root Makefile
# Simplified commands for installation and running the application

.PHONY: install dev server client build clean reinstall help db-reset server-build go-server

# Default target
.DEFAULT_GOAL := help

# Variables
NODE := node
NPM := npm
GO := go
DB_FILE := server/data/celestask.db
GO_SERVER_DIR := ../celestask-go-backend/server

# Install all dependencies (root + server + client)
install:
	@echo "📦 Installing all dependencies..."
	$(NPM) install
	cd client && $(NPM) install
	cd server && $(GO) mod download
	@echo "✅ Installation complete!"

# Start development servers (both frontend and backend)
dev:
	@echo "🚀 Starting development servers..."
	$(NPM) run dev

# Start Go backend server
go-server:
	@echo "⚙️  Starting Go backend server..."
	cd $(GO_SERVER_DIR) && go run .

# Start backend server (default: Go backend)
server: go-server

# Start frontend dev server only
client:
	@echo "🎨 Starting frontend dev server..."
	$(NPM) run client

# Build Go server binary
server-build:
	@echo "⚙️  Building Go backend server..."
	cd $(GO_SERVER_DIR) && go build -o celestask-server .
	@echo "✅ Go server build complete!"

# Build frontend for production
build:
	@echo "🔨 Building frontend for production..."
	$(NPM) run build
	@echo "✅ Build complete!"

# Remove node_modules and Go build artifacts from all directories
clean:
	@echo "🧹 Cleaning node_modules and build artifacts..."
	@if [ -d "node_modules" ]; then rm -rf node_modules; fi
	@if [ -d "client/node_modules" ]; then rm -rf client/node_modules; fi
	@if [ -d "server/node_modules" ]; then rm -rf server/node_modules; fi
	@if [ -f "server/celestask-server" ]; then rm -f server/celestask-server; fi
	@echo "✅ Clean complete!"

# Clean and reinstall everything
reinstall: clean
	@echo "🔄 Reinstalling all dependencies..."
	$(NPM) install
	cd client && $(NPM) install
	cd server && $(GO) mod download
	@echo "✅ Reinstallation complete!"

# Delete the SQLite database (Go server will recreate it)
db-reset:
	@echo "🗃️  Resetting database..."
	@if [ -f "$(DB_FILE)" ]; then rm -f $(DB_FILE); echo "   Database deleted"; else echo "   No database file found"; fi
	@echo "✅ Database reset complete! Run 'make server' to recreate."

# Display available commands
help:
	@echo ""
	@echo "Celestask - Available Commands"
	@echo "==============================="
	@echo ""
	@echo "  make install       - Install all dependencies (root + server + client)"
	@echo "  make dev           - Start development servers (both frontend and backend)"
	@echo "  make server        - Start Go backend server (default)"
	@echo "  make go-server     - Start Go backend server explicitly"
	@echo "  make client        - Start frontend dev server only"
	@echo "  make server-build  - Build Go backend binary"
	@echo "  make build         - Build frontend for production"
	@echo "  make clean         - Remove node_modules and build artifacts"
	@echo "  make reinstall     - Clean and reinstall everything"