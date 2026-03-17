package main

import (
	"log"
	"net/http"
	"os"

	"github.com/celestask/server/internal/db"
	"github.com/celestask/server/internal/handlers"
	"github.com/celestask/server/internal/middleware"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize database
	database, err := db.InitDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Create schema
	if err := db.CreateSchema(database); err != nil {
		log.Fatalf("Failed to create schema: %v", err)
	}

	// Set up Gin router
	router := gin.New()
	router.Use(gin.Logger())

	// Custom recovery middleware that maps ErrorResponse panics to the correct HTTP status
	router.Use(func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				if apiErr, ok := err.(middleware.ErrorResponse); ok {
					status := http.StatusInternalServerError
					switch apiErr.Err.Code {
					case middleware.CodeNotFound:
						status = http.StatusNotFound
					case middleware.CodeValidationError:
						status = http.StatusBadRequest
					case middleware.CodeFetchError, middleware.CodeCreateError,
						middleware.CodeUpdateError, middleware.CodeDeleteError,
						middleware.CodeInternalError:
						status = http.StatusInternalServerError
					}
					c.AbortWithStatusJSON(status, apiErr)
					return
				}
				c.AbortWithStatusJSON(http.StatusInternalServerError, middleware.NewInternalError("An unexpected error occurred"))
			}
		}()
		c.Next()
	})

	// Add database middleware to set database in context
	router.Use(databaseMiddleware(database))

	// Configure CORS
	router.Use(corsMiddleware())

	// Set up routes
	setupRoutes(router)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "19096"
	}

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// databaseMiddleware sets the database in the gin context for handlers to access
func databaseMiddleware(database *db.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("database", database)
		c.Next()
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Allow localhost:12096 and 127.0.0.1:12096
		allowedOrigins := []string{
			"http://localhost:12096",
			"http://127.0.0.1:12096",
		}

		isAllowed := false
		for _, allowed := range allowedOrigins {
			if origin == allowed {
				isAllowed = true
				break
			}
		}

		if isAllowed {
			c.Header("Access-Control-Allow-Origin", origin)
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func setupRoutes(router *gin.Engine) {
	// API group (matching Node.js /api/ routes)
	api := router.Group("/api")
	{
		// Health check
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"success": true,
				"data": gin.H{
					"status": "ok",
				},
			})
		})

		// Notes routes
		api.GET("/notes", handlers.GetNotes)
		api.POST("/notes", handlers.CreateNote)
		api.GET("/notes/:id", handlers.GetNote)
		api.PUT("/notes/:id", handlers.UpdateNote)
		api.DELETE("/notes/:id", handlers.DeleteNote)

		// Time entries routes (matching Node.js /api/time-entries/ routes)
		timeEntries := api.Group("/time-entries")
		{
			// Running timers (must be registered before /:id to avoid conflicts)
			timeEntries.GET("/running", handlers.GetRunningTimers)
			timeEntries.POST("/stop-all", handlers.StopAllTimers)

			// Task time entries
			timeEntries.GET("/task/:taskId", handlers.GetTaskTimeEntries)
			timeEntries.POST("/task/:taskId", handlers.CreateTaskTimeEntry)
			timeEntries.POST("/task/:taskId/start", handlers.StartTaskTimer)
			timeEntries.POST("/task/:taskId/stop", handlers.StopTaskTimer)
			timeEntries.GET("/task/:taskId/summary", handlers.GetTaskTimeSummary)

			// Project time entries
			timeEntries.GET("/project/:projectId", handlers.GetProjectTimeEntries)
			timeEntries.POST("/project/:projectId", handlers.CreateProjectTimeEntry)
			timeEntries.POST("/project/:projectId/start", handlers.StartProjectTimer)
			timeEntries.POST("/project/:projectId/stop", handlers.StopProjectTimer)
			timeEntries.GET("/project/:projectId/summary", handlers.GetProjectTimeSummary)

			// Generic time entry operations
			timeEntries.PUT("/:id", handlers.UpdateTimeEntry)
			timeEntries.DELETE("/:id", handlers.DeleteTimeEntry)
		}

		// Import/Export routes
		api.GET("/export", handlers.GetExport)
		api.GET("/export/status", handlers.GetExportStatus)
		api.GET("/export/sqlite", handlers.GetExportSQLite)
		api.POST("/import", handlers.PostImport)
		api.GET("/import/status", handlers.GetImportStatus)

		// Saved views routes
		api.GET("/saved-views", handlers.GetSavedViews)
		api.POST("/saved-views", handlers.CreateSavedView)
		api.GET("/saved-views/:id", handlers.GetSavedView)
		api.PUT("/saved-views/:id", handlers.UpdateSavedView)
		api.DELETE("/saved-views/:id", handlers.DeleteSavedView)
		api.PUT("/saved-views/:id/default", handlers.SetDefaultView)

		// People routes
		api.GET("/people", handlers.GetPeople)
		api.POST("/people", handlers.CreatePerson)
		api.GET("/people/:id", handlers.GetPerson)
		api.PUT("/people/:id", handlers.UpdatePerson)
		api.DELETE("/people/:id", handlers.DeletePerson)

		// Projects routes
		projects := api.Group("/projects")
		{
			projects.GET("", handlers.GetProjects)
			projects.GET("/root", handlers.GetRootProjects)
			projects.POST("", handlers.CreateProject)
			projects.GET("/:id", handlers.GetProject)
			projects.PUT("/:id", handlers.UpdateProject)
			projects.DELETE("/:id", handlers.DeleteProject)
			projects.GET("/:id/children", handlers.GetProjectChildren)
			projects.GET("/:id/descendants", handlers.GetProjectDescendants)
			projects.GET("/:id/ancestors", handlers.GetProjectAncestors)
			projects.GET("/:id/tree", handlers.GetProjectTree)
			projects.PUT("/:id/move", handlers.MoveProject)
			projects.PUT("/:id/owner", handlers.SetProjectOwner)
			projects.GET("/:id/assignees", handlers.GetProjectAssignees)
			projects.POST("/:id/assignees", handlers.AddProjectAssignee)
			projects.DELETE("/:id/assignees/:personId", handlers.RemoveProjectAssignee)
		}

		// Tasks routes
		tasks := api.Group("/tasks")
		{
			tasks.GET("", handlers.GetTasks)
			tasks.POST("", handlers.CreateTask)
			tasks.PUT("/bulk", handlers.BulkUpdateTasks)
			tasks.GET("/:id", handlers.GetTask)
			tasks.PUT("/:id", handlers.UpdateTask)
			tasks.DELETE("/:id", handlers.DeleteTask)
			tasks.PATCH("/:id/status", handlers.UpdateTaskStatus)

			// Hierarchy
			tasks.GET("/:id/children", handlers.GetTaskChildren)
			tasks.GET("/:id/descendants", handlers.GetTaskDescendants)
			tasks.GET("/:id/ancestors", handlers.GetTaskAncestors)

			// Progress
			tasks.GET("/:id/progress", handlers.GetTaskProgress)
			tasks.PUT("/:id/progress", handlers.UpdateTaskProgress)
			tasks.GET("/:id/progress/rollup", handlers.GetTaskProgressRollup)

			// Assignees
			tasks.GET("/:id/assignees", handlers.GetTaskAssignees)
			tasks.POST("/:id/assignees", handlers.AddTaskAssignee)
			tasks.DELETE("/:id/assignees/:personId", handlers.RemoveTaskAssignee)

			// Tags
			tasks.GET("/:id/tags", handlers.GetTaskTags)
			tasks.POST("/:id/tags", handlers.AddTaskTag)
			tasks.DELETE("/:id/tags/:tagId", handlers.RemoveTaskTag)

			// Custom fields
			tasks.GET("/:id/custom-fields", handlers.GetTaskCustomFields)
			tasks.PUT("/:id/custom-fields/:fieldId", handlers.SetTaskCustomField)
			tasks.DELETE("/:id/custom-fields/:fieldId", handlers.RemoveTaskCustomField)
		}

		// Tags routes
		api.GET("/tags", handlers.GetTags)
		api.POST("/tags", handlers.CreateTag)
		api.GET("/tags/:id", middleware.ValidateExistsMiddleware("tags", "id", "Tag"), handlers.GetTag)
		api.PUT("/tags/:id", middleware.ValidateExistsMiddleware("tags", "id", "Tag"), handlers.UpdateTag)
		api.DELETE("/tags/:id", middleware.ValidateExistsMiddleware("tags", "id", "Tag"), handlers.DeleteTag)

		// Custom fields routes
		api.GET("/custom-fields", handlers.GetCustomFields)
		api.POST("/custom-fields", handlers.CreateCustomField)
		api.GET("/custom-fields/:id", handlers.GetCustomField)
		api.PUT("/custom-fields/:id", handlers.UpdateCustomField)
		api.DELETE("/custom-fields/:id", handlers.DeleteCustomField)

		// Pomodoro routes
		pomodoro := api.Group("/pomodoro")
		{
			// Settings
			pomodoro.GET("/settings", handlers.GetPomodoroSettings)
			pomodoro.PUT("/settings", handlers.UpdatePomodoroSettings)

			// Current session
			pomodoro.GET("/current", handlers.GetCurrentPomodoro)

			// Session control
			pomodoro.POST("/start", handlers.StartPomodoro)
			pomodoro.POST("/pause", handlers.PausePomodoro)
			pomodoro.POST("/resume", handlers.ResumePomodoro)
			pomodoro.POST("/stop", handlers.StopPomodoro)
			pomodoro.POST("/complete", handlers.CompletePomodoro)
			pomodoro.POST("/skip", handlers.SkipPomodoro)

			// Sessions list
			pomodoro.GET("/sessions", handlers.GetPomodoroSessions)

			// Stats
			pomodoro.GET("/stats", handlers.GetPomodoroStats)
		}
	}
}
