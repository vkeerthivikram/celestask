# Celestask - Root Makefile
# Simplified commands for installation and running the application

.PHONY: install dev server client build clean reinstall help db-reset server-build go-server

# Default target
.DEFAULT_GOAL := help

# Variables
NODE := node
NPM := npm
DB_FILE := server/data/celestask.db
GO_SERVER_DIR := ../celestask-go-backend/server

# Install all dependencies (root + server + client)
install:
	@echo "📦 Installing all dependencies..."
	$(NPM) run install:all
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

# Clean node_modules from all directories
clean:
	@echo "🧹 Cleaning node_modules..."
	@if [ -d "node_modules" ]; then rm -rf node_modules; fi
	@if [ -d "server/node_modules" ]; then rm -rf server/node_modules; fi
	@if [ -d "client/node_modules" ]; then rm -rf client/node_modules; fi
	@echo "✅ Clean complete!"

# Clean and reinstall everything
reinstall: clean
	@echo "🔄 Reinstalling all dependencies..."
	$(NPM) run install:all
	@echo "✅ Reinstallation complete!"

# Delete the SQLite database and reseed
db-reset:
	@echo "🗃️  Resetting database..."
	@if [ -f "$(DB_FILE)" ]; then rm -f $(DB_FILE); echo "   Database deleted"; fi
	@cd server && $(NPM) run seed
	@echo "✅ Database reset complete!"

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
	@echo "  make clean         - Remove node_modules from all directories"
	@echo "  make reinstall     - Clean and reinstall everything"
	@echo "  make db-reset      - Delete the SQLite database and reseed"
	@echo "  make help          - Display this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make install       # First time setup"
	@echo "  make dev          # Start developing"
	@echo "  make server       # Start Go backend server"
	@echo "  make server-build # Build Go server binary"
	@echo "  make db-reset     # Reset database to fresh state"
	@echo ""
