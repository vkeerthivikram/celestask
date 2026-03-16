# Celestask - Root Makefile
# Simplified commands for installation and running the application

.PHONY: install dev server server-build client build clean reinstall help db-reset

# Default target
.DEFAULT_GOAL := help

# Variables
NODE := node
NPM := npm
GO := go
DB_FILE := server/data/celestask.db

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

# Start backend server only
server:
	@echo "⚙️  Starting backend server..."
	cd server && $(GO) run .

# Build Go binary
server-build:
	@echo "⚙️  Building Go backend..."
	cd server && $(GO) build -o celestask-server .
	@echo "✅ Backend build complete!"

# Start frontend dev server only
client:
	@echo "🎨 Starting frontend dev server..."
	$(NPM) run client

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
	@echo "============================="
	@echo ""
	@echo "  make install        - Install all dependencies (root + server + client)"
	@echo "  make dev            - Start development servers (both frontend and backend)"
	@echo "  make server         - Start Go backend server only"
	@echo "  make server-build   - Build Go backend binary"
	@echo "  make client         - Start frontend dev server only"
	@echo "  make build          - Build frontend for production"
	@echo "  make clean          - Remove node_modules and build artifacts"
	@echo "  make reinstall      - Clean and reinstall everything"
	@echo "  make db-reset       - Delete the SQLite database"
	@echo "  make help           - Display this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make install        # First time setup"
	@echo "  make dev            # Start developing"
	@echo "  make db-reset       # Reset database to fresh state"
	@echo ""
