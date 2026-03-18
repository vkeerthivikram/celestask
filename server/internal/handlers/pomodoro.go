package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/celestask/server/internal/db"
	"github.com/celestask/server/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ==================== DATA TYPES ====================

// PomodoroSessionType represents the type of pomodoro session
type PomodoroSessionType string

// Valid session types
const (
	SessionTypeWork       PomodoroSessionType = "work"
	SessionTypeShortBreak PomodoroSessionType = "short_break"
	SessionTypeLongBreak  PomodoroSessionType = "long_break"
)

// PomodoroTimerState represents the current state of the timer
type PomodoroTimerState string

// Valid timer states
const (
	TimerStateIdle    PomodoroTimerState = "idle"
	TimerStateRunning PomodoroTimerState = "running"
	TimerStatePaused  PomodoroTimerState = "paused"
)

// PomodoroSettings represents the pomodoro settings in the database
type PomodoroSettings struct {
	ID                     string `json:"id"`
	WorkDurationUs         int64  `json:"work_duration_us"`
	ShortBreakUs           int64  `json:"short_break_us"`
	LongBreakUs            int64  `json:"long_break_us"`
	SessionsUntilLongBreak int    `json:"sessions_until_long_break"`
	AutoStartBreaks        bool   `json:"auto_start_breaks"`
	AutoStartWork          bool   `json:"auto_start_work"`
	NotificationsEnabled   bool   `json:"notifications_enabled"`
	DailyGoal              int    `json:"daily_goal"`
	CreatedAt              string `json:"created_at"`
	UpdatedAt              string `json:"updated_at"`
}

// PomodoroSession represents a pomodoro session in the database
type PomodoroSession struct {
	ID          string         `json:"id"`
	TaskID      sql.NullInt64  `json:"task_id"`
	SessionType string         `json:"session_type"`
	TimerState  string         `json:"timer_state"`
	DurationUs  int64          `json:"duration_us"`
	ElapsedUs   int64          `json:"elapsed_us"`
	StartedAt   sql.NullString `json:"started_at"`
	PausedAt    sql.NullString `json:"paused_at"`
	EndedAt     sql.NullString `json:"ended_at"`
	Completed   bool           `json:"completed"`
	Interrupted bool           `json:"interrupted"`
	CreatedAt   string         `json:"created_at"`
	UpdatedAt   string         `json:"updated_at"`
	// Computed field for current elapsed time (not stored in DB)
	CurrentElapsedUs int64 `json:"current_elapsed_us,omitempty"`
}

// PomodoroDailyStats represents daily statistics
type PomodoroDailyStats struct {
	Date                   string `json:"date"`
	WorkSessionsCompleted  int    `json:"work_sessions_completed"`
	WorkTimeCompletedUs    int64  `json:"work_time_completed_us"`
	WorkTimeTotalUs        int64  `json:"work_time_total_us"`
	BreakSessionsCompleted int    `json:"break_sessions_completed"`
	ShortBreakCount        int    `json:"short_break_count"`
	LongBreakCount         int    `json:"long_break_count"`
	BreakTimeUs            int64  `json:"break_time_us"`
	DailyGoal              int    `json:"daily_goal"`
	GoalProgressPercent    int    `json:"goal_progress_percent"`
}

// UpdatePomodoroSettingsRequest represents the request body for updating settings
type UpdatePomodoroSettingsRequest struct {
	WorkDurationUs         *int64 `json:"work_duration_us"`
	ShortBreakUs           *int64 `json:"short_break_us"`
	LongBreakUs            *int64 `json:"long_break_us"`
	SessionsUntilLongBreak *int   `json:"sessions_until_long_break"`
	AutoStartBreaks        *bool  `json:"auto_start_breaks"`
	AutoStartWork          *bool  `json:"auto_start_work"`
	NotificationsEnabled   *bool  `json:"notifications_enabled"`
	DailyGoal              *int   `json:"daily_goal"`
}

// StartPomodoroRequest represents the request body for starting a session
type StartPomodoroRequest struct {
	TaskID      *int64               `json:"task_id"`
	SessionType *PomodoroSessionType `json:"session_type"`
}

// ==================== HELPER FUNCTIONS ====================

// getCurrentTimestamp returns the current time in ISO format
func getCurrentTimestamp() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000Z")
}

// calculateElapsedUs calculates elapsed time in microseconds
func calculateElapsedUs(startedAt string, pausedAt string) int64 {
	startTime, err := time.Parse("2006-01-02T15:04:05.000Z", startedAt)
	if err != nil {
		return 0
	}

	var endTime time.Time
	if pausedAt != "" {
		endTime, err = time.Parse("2006-01-02T15:04:05.000Z", pausedAt)
		if err != nil {
			return 0
		}
	} else {
		endTime = time.Now().UTC()
	}

	return endTime.Sub(startTime).Microseconds()
}

// getCurrentSession retrieves the current active session (running or paused)
func getCurrentSession(database *db.Database) (*PomodoroSession, error) {
	var session PomodoroSession
	err := database.QueryRow(`
		SELECT id, task_id, session_type, timer_state, duration_us, elapsed_us,
		       started_at, paused_at, ended_at, completed, interrupted, created_at, updated_at
		FROM pomodoro_sessions
		WHERE timer_state IN ('running', 'paused')
		ORDER BY created_at DESC
		LIMIT 1
	`).Scan(
		&session.ID, &session.TaskID, &session.SessionType, &session.TimerState,
		&session.DurationUs, &session.ElapsedUs, &session.StartedAt, &session.PausedAt,
		&session.EndedAt, &session.Completed, &session.Interrupted, &session.CreatedAt, &session.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// Calculate current elapsed time if running
	if session.TimerState == "running" && session.StartedAt.Valid {
		session.CurrentElapsedUs = session.ElapsedUs + calculateElapsedUs(session.StartedAt.String, "")
	} else {
		session.CurrentElapsedUs = session.ElapsedUs
	}

	return &session, nil
}

// getOrCreateSettings retrieves settings or creates default if not exists
func getOrCreateSettings(database *db.Database) (*PomodoroSettings, error) {
	var settings PomodoroSettings
	err := database.QueryRow(`
		SELECT id, work_duration_us, short_break_us, long_break_us, sessions_until_long_break,
		       auto_start_breaks, auto_start_work, notifications_enabled, daily_goal, created_at, updated_at
		FROM pomodoro_settings
		WHERE id = 'default'
	`).Scan(
		&settings.ID, &settings.WorkDurationUs, &settings.ShortBreakUs, &settings.LongBreakUs,
		&settings.SessionsUntilLongBreak, &settings.AutoStartBreaks, &settings.AutoStartWork,
		&settings.NotificationsEnabled, &settings.DailyGoal, &settings.CreatedAt, &settings.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		// Create default settings
		id := uuid.New().String()
		_, err := database.Exec(`
			INSERT INTO pomodoro_settings (id) VALUES (?)
		`, id)
		if err != nil {
			return nil, err
		}

		// Fetch the newly created settings
		return getOrCreateSettings(database)
	}
	if err != nil {
		return nil, err
	}

	return &settings, nil
}

// getDatabase retrieves the database from gin context
func getDatabase(c *gin.Context) (*db.Database, error) {
	databaseIface, exists := c.Get("database")
	if !exists {
		return nil, fmt.Errorf("database not available")
	}

	database, ok := databaseIface.(*db.Database)
	if !ok {
		return nil, fmt.Errorf("invalid database instance")
	}

	return database, nil
}

// ==================== SETTINGS HANDLERS ====================

// GetPomodoroSettings handles GET /api/pomodoro/settings
func GetPomodoroSettings(c *gin.Context) {
	database, err := getDatabase(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError(err.Error()))
		return
	}

	settings, err := getOrCreateSettings(database)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("pomodoro settings"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(settings))
}

// UpdatePomodoroSettings handles PUT /api/pomodoro/settings
func UpdatePomodoroSettings(c *gin.Context) {
	database, err := getDatabase(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError(err.Error()))
		return
	}

	var req UpdatePomodoroSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Invalid request body"))
		return
	}

	// Ensure settings exist
	_, err = getOrCreateSettings(database)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("pomodoro settings"))
		return
	}

	// Build dynamic update query
	query := "UPDATE pomodoro_settings SET "
	var args []interface{}
	hasUpdates := false

	if req.WorkDurationUs != nil {
		query += "work_duration_us = ?"
		args = append(args, *req.WorkDurationUs)
		hasUpdates = true
	}

	if req.ShortBreakUs != nil {
		if hasUpdates {
			query += ", "
		}
		query += "short_break_us = ?"
		args = append(args, *req.ShortBreakUs)
		hasUpdates = true
	}

	if req.LongBreakUs != nil {
		if hasUpdates {
			query += ", "
		}
		query += "long_break_us = ?"
		args = append(args, *req.LongBreakUs)
		hasUpdates = true
	}

	if req.SessionsUntilLongBreak != nil {
		if hasUpdates {
			query += ", "
		}
		query += "sessions_until_long_break = ?"
		args = append(args, *req.SessionsUntilLongBreak)
		hasUpdates = true
	}

	if req.AutoStartBreaks != nil {
		if hasUpdates {
			query += ", "
		}
		query += "auto_start_breaks = ?"
		if *req.AutoStartBreaks {
			args = append(args, 1)
		} else {
			args = append(args, 0)
		}
		hasUpdates = true
	}

	if req.AutoStartWork != nil {
		if hasUpdates {
			query += ", "
		}
		query += "auto_start_work = ?"
		if *req.AutoStartWork {
			args = append(args, 1)
		} else {
			args = append(args, 0)
		}
		hasUpdates = true
	}

	if req.NotificationsEnabled != nil {
		if hasUpdates {
			query += ", "
		}
		query += "notifications_enabled = ?"
		if *req.NotificationsEnabled {
			args = append(args, 1)
		} else {
			args = append(args, 0)
		}
		hasUpdates = true
	}

	if req.DailyGoal != nil {
		if hasUpdates {
			query += ", "
		}
		query += "daily_goal = ?"
		args = append(args, *req.DailyGoal)
		hasUpdates = true
	}

	if !hasUpdates {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("No fields provided to update"))
		return
	}

	query += ", updated_at = CURRENT_TIMESTAMP WHERE id = 'default'"

	_, err = database.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("pomodoro settings"))
		return
	}

	// Fetch updated settings
	settings, err := getOrCreateSettings(database)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("pomodoro settings"))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(settings))
}

// ==================== SESSION HANDLERS ====================

// GetCurrentPomodoro handles GET /api/pomodoro/current
func GetCurrentPomodoro(c *gin.Context) {
	database, err := getDatabase(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError(err.Error()))
		return
	}

	session, err := getCurrentSession(database)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("current session"))
		return
	}

	// Return null if no active session
	if session == nil {
		var emptySession *PomodoroSession = nil
		c.JSON(http.StatusOK, middleware.NewSuccessResponse(emptySession))
		return
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(session))
}

// StartPomodoro handles POST /api/pomodoro/start
func StartPomodoro(c *gin.Context) {
	database, err := getDatabase(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError(err.Error()))
		return
	}

	var req StartPomodoroRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Allow empty body
		req = StartPomodoroRequest{}
	}

	// Check if there's already an active session
	currentSession, err := getCurrentSession(database)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("current session"))
		return
	}

	if currentSession != nil {
		c.JSON(http.StatusConflict, middleware.NewErrorResponse("CONFLICT_ERROR", "A session is already in progress. Stop or complete it first."))
		return
	}

	// Determine session type
	sessionType := SessionTypeWork
	if req.SessionType != nil {
		sessionType = *req.SessionType
	}

	// Validate session type
	if sessionType != SessionTypeWork && sessionType != SessionTypeShortBreak && sessionType != SessionTypeLongBreak {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Invalid session_type. Must be work, short_break, or long_break"))
		return
	}

	// Get settings to determine duration
	settings, err := getOrCreateSettings(database)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("settings"))
		return
	}

	var durationUs int64
	switch sessionType {
	case SessionTypeWork:
		durationUs = settings.WorkDurationUs
	case SessionTypeShortBreak:
		durationUs = settings.ShortBreakUs
	case SessionTypeLongBreak:
		durationUs = settings.LongBreakUs
	}

	id := uuid.New().String()
	now := getCurrentTimestamp()

	_, err = database.Exec(`
		INSERT INTO pomodoro_sessions (
			id, task_id, session_type, timer_state, duration_us, elapsed_us,
			started_at, completed, interrupted, created_at, updated_at
		) VALUES (?, ?, ?, 'running', ?, 0, ?, 0, 0, ?, ?)
	`, id, req.TaskID, sessionType, durationUs, now, now, now)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewCreateError("session"))
		return
	}

	// Fetch the created session
	var newSession PomodoroSession
	err = database.QueryRow(`
		SELECT id, task_id, session_type, timer_state, duration_us, elapsed_us,
		       started_at, paused_at, ended_at, completed, interrupted, created_at, updated_at
		FROM pomodoro_sessions WHERE id = ?
	`, id).Scan(
		&newSession.ID, &newSession.TaskID, &newSession.SessionType, &newSession.TimerState,
		&newSession.DurationUs, &newSession.ElapsedUs, &newSession.StartedAt, &newSession.PausedAt,
		&newSession.EndedAt, &newSession.Completed, &newSession.Interrupted, &newSession.CreatedAt, &newSession.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("session"))
		return
	}

	newSession.CurrentElapsedUs = 0

	c.JSON(http.StatusCreated, middleware.NewSuccessResponse(newSession))
}

// PausePomodoro handles POST /api/pomodoro/pause
func PausePomodoro(c *gin.Context) {
	database, err := getDatabase(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError(err.Error()))
		return
	}

	currentSession, err := getCurrentSession(database)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("current session"))
		return
	}

	if currentSession == nil {
		c.JSON(http.StatusNotFound, middleware.NewErrorResponse("NOT_FOUND", "No active session to pause"))
		return
	}

	if currentSession.TimerState != "running" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Session is not running"))
		return
	}

	now := getCurrentTimestamp()
	var additionalElapsed int64
	if currentSession.StartedAt.Valid {
		additionalElapsed = calculateElapsedUs(currentSession.StartedAt.String, "")
	}
	totalElapsed := currentSession.ElapsedUs + additionalElapsed

	_, err = database.Exec(`
		UPDATE pomodoro_sessions
		SET timer_state = 'paused',
		    elapsed_us = ?,
		    paused_at = ?,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, totalElapsed, now, currentSession.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("session"))
		return
	}

	// Fetch updated session
	var updatedSession PomodoroSession
	err = database.QueryRow(`
		SELECT id, task_id, session_type, timer_state, duration_us, elapsed_us,
		       started_at, paused_at, ended_at, completed, interrupted, created_at, updated_at
		FROM pomodoro_sessions WHERE id = ?
	`, currentSession.ID).Scan(
		&updatedSession.ID, &updatedSession.TaskID, &updatedSession.SessionType, &updatedSession.TimerState,
		&updatedSession.DurationUs, &updatedSession.ElapsedUs, &updatedSession.StartedAt, &updatedSession.PausedAt,
		&updatedSession.EndedAt, &updatedSession.Completed, &updatedSession.Interrupted, &updatedSession.CreatedAt, &updatedSession.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("session"))
		return
	}

	updatedSession.CurrentElapsedUs = totalElapsed

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(updatedSession))
}

// ResumePomodoro handles POST /api/pomodoro/resume
func ResumePomodoro(c *gin.Context) {
	database, err := getDatabase(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError(err.Error()))
		return
	}

	currentSession, err := getCurrentSession(database)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("current session"))
		return
	}

	if currentSession == nil {
		c.JSON(http.StatusNotFound, middleware.NewErrorResponse("NOT_FOUND", "No session to resume"))
		return
	}

	if currentSession.TimerState != "paused" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Session is not paused"))
		return
	}

	now := getCurrentTimestamp()

	_, err = database.Exec(`
		UPDATE pomodoro_sessions
		SET timer_state = 'running',
		    started_at = ?,
		    paused_at = NULL,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, now, currentSession.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("session"))
		return
	}

	// Fetch updated session
	var updatedSession PomodoroSession
	err = database.QueryRow(`
		SELECT id, task_id, session_type, timer_state, duration_us, elapsed_us,
		       started_at, paused_at, ended_at, completed, interrupted, created_at, updated_at
		FROM pomodoro_sessions WHERE id = ?
	`, currentSession.ID).Scan(
		&updatedSession.ID, &updatedSession.TaskID, &updatedSession.SessionType, &updatedSession.TimerState,
		&updatedSession.DurationUs, &updatedSession.ElapsedUs, &updatedSession.StartedAt, &updatedSession.PausedAt,
		&updatedSession.EndedAt, &updatedSession.Completed, &updatedSession.Interrupted, &updatedSession.CreatedAt, &updatedSession.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("session"))
		return
	}

	updatedSession.CurrentElapsedUs = currentSession.ElapsedUs

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(updatedSession))
}

// StopPomodoro handles POST /api/pomodoro/stop
func StopPomodoro(c *gin.Context) {
	database, err := getDatabase(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError(err.Error()))
		return
	}

	currentSession, err := getCurrentSession(database)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("current session"))
		return
	}

	if currentSession == nil {
		c.JSON(http.StatusNotFound, middleware.NewErrorResponse("NOT_FOUND", "No active session to stop"))
		return
	}

	now := getCurrentTimestamp()

	// Calculate final elapsed time if running
	finalElapsed := currentSession.ElapsedUs
	if currentSession.TimerState == "running" && currentSession.StartedAt.Valid {
		finalElapsed = currentSession.ElapsedUs + calculateElapsedUs(currentSession.StartedAt.String, "")
	}

	_, err = database.Exec(`
		UPDATE pomodoro_sessions
		SET timer_state = 'idle',
		    elapsed_us = ?,
		    ended_at = ?,
		    interrupted = 1,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, finalElapsed, now, currentSession.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("session"))
		return
	}

	// Fetch updated session
	var updatedSession PomodoroSession
	err = database.QueryRow(`
		SELECT id, task_id, session_type, timer_state, duration_us, elapsed_us,
		       started_at, paused_at, ended_at, completed, interrupted, created_at, updated_at
		FROM pomodoro_sessions WHERE id = ?
	`, currentSession.ID).Scan(
		&updatedSession.ID, &updatedSession.TaskID, &updatedSession.SessionType, &updatedSession.TimerState,
		&updatedSession.DurationUs, &updatedSession.ElapsedUs, &updatedSession.StartedAt, &updatedSession.PausedAt,
		&updatedSession.EndedAt, &updatedSession.Completed, &updatedSession.Interrupted, &updatedSession.CreatedAt, &updatedSession.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("session"))
		return
	}

	updatedSession.CurrentElapsedUs = finalElapsed

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(updatedSession))
}

// CompletePomodoro handles POST /api/pomodoro/complete
func CompletePomodoro(c *gin.Context) {
	database, err := getDatabase(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError(err.Error()))
		return
	}

	currentSession, err := getCurrentSession(database)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("current session"))
		return
	}

	if currentSession == nil {
		c.JSON(http.StatusNotFound, middleware.NewErrorResponse("NOT_FOUND", "No active session to complete"))
		return
	}

	now := getCurrentTimestamp()

	// Calculate final elapsed time if running
	finalElapsed := currentSession.ElapsedUs
	if currentSession.TimerState == "running" && currentSession.StartedAt.Valid {
		finalElapsed = currentSession.ElapsedUs + calculateElapsedUs(currentSession.StartedAt.String, "")
	}

	_, err = database.Exec(`
		UPDATE pomodoro_sessions
		SET timer_state = 'idle',
		    elapsed_us = ?,
		    ended_at = ?,
		    completed = 1,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, finalElapsed, now, currentSession.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("session"))
		return
	}

	// Fetch updated session
	var updatedSession PomodoroSession
	err = database.QueryRow(`
		SELECT id, task_id, session_type, timer_state, duration_us, elapsed_us,
		       started_at, paused_at, ended_at, completed, interrupted, created_at, updated_at
		FROM pomodoro_sessions WHERE id = ?
	`, currentSession.ID).Scan(
		&updatedSession.ID, &updatedSession.TaskID, &updatedSession.SessionType, &updatedSession.TimerState,
		&updatedSession.DurationUs, &updatedSession.ElapsedUs, &updatedSession.StartedAt, &updatedSession.PausedAt,
		&updatedSession.EndedAt, &updatedSession.Completed, &updatedSession.Interrupted, &updatedSession.CreatedAt, &updatedSession.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("session"))
		return
	}

	updatedSession.CurrentElapsedUs = finalElapsed

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(updatedSession))
}

// SkipPomodoro handles POST /api/pomodoro/skip
func SkipPomodoro(c *gin.Context) {
	database, err := getDatabase(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError(err.Error()))
		return
	}

	currentSession, err := getCurrentSession(database)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("current session"))
		return
	}

	if currentSession == nil {
		c.JSON(http.StatusNotFound, middleware.NewErrorResponse("NOT_FOUND", "No active session to skip"))
		return
	}

	if currentSession.SessionType == "work" {
		c.JSON(http.StatusBadRequest, middleware.NewValidationError("Cannot skip work sessions. Use stop instead."))
		return
	}

	now := getCurrentTimestamp()

	// Calculate final elapsed time if running
	finalElapsed := currentSession.ElapsedUs
	if currentSession.TimerState == "running" && currentSession.StartedAt.Valid {
		finalElapsed = currentSession.ElapsedUs + calculateElapsedUs(currentSession.StartedAt.String, "")
	}

	_, err = database.Exec(`
		UPDATE pomodoro_sessions
		SET timer_state = 'idle',
		    elapsed_us = ?,
		    ended_at = ?,
		    interrupted = 1,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, finalElapsed, now, currentSession.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewUpdateError("session"))
		return
	}

	// Fetch updated session
	var updatedSession PomodoroSession
	err = database.QueryRow(`
		SELECT id, task_id, session_type, timer_state, duration_us, elapsed_us,
		       started_at, paused_at, ended_at, completed, interrupted, created_at, updated_at
		FROM pomodoro_sessions WHERE id = ?
	`, currentSession.ID).Scan(
		&updatedSession.ID, &updatedSession.TaskID, &updatedSession.SessionType, &updatedSession.TimerState,
		&updatedSession.DurationUs, &updatedSession.ElapsedUs, &updatedSession.StartedAt, &updatedSession.PausedAt,
		&updatedSession.EndedAt, &updatedSession.Completed, &updatedSession.Interrupted, &updatedSession.CreatedAt, &updatedSession.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("session"))
		return
	}

	updatedSession.CurrentElapsedUs = finalElapsed

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(updatedSession))
}

// ==================== SESSIONS LIST HANDLER ====================

// GetPomodoroSessions handles GET /api/pomodoro/sessions
func GetPomodoroSessions(c *gin.Context) {
	database, err := getDatabase(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError(err.Error()))
		return
	}

	taskID := c.Query("task_id")
	date := c.Query("date")
	limit := c.DefaultQuery("limit", "50")

	query := "SELECT id, task_id, session_type, timer_state, duration_us, elapsed_us, started_at, paused_at, ended_at, completed, interrupted, created_at, updated_at FROM pomodoro_sessions WHERE 1=1"
	var args []interface{}

	if taskID != "" {
		query += " AND task_id = ?"
		args = append(args, taskID)
	}

	if date != "" {
		query += " AND DATE(started_at) = ?"
		args = append(args, date)
	}

	query += " ORDER BY started_at DESC LIMIT ?"
	args = append(args, limit)

	rows, err := database.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("sessions"))
		return
	}
	defer rows.Close()

	var sessions []PomodoroSession
	for rows.Next() {
		var s PomodoroSession
		if err := rows.Scan(
			&s.ID, &s.TaskID, &s.SessionType, &s.TimerState, &s.DurationUs, &s.ElapsedUs,
			&s.StartedAt, &s.PausedAt, &s.EndedAt, &s.Completed, &s.Interrupted, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			c.JSON(http.StatusInternalServerError, middleware.NewFetchError("sessions"))
			return
		}
		sessions = append(sessions, s)
	}

	if sessions == nil {
		sessions = []PomodoroSession{}
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(sessions))
}

// ==================== STATS HANDLER ====================

// GetPomodoroStats handles GET /api/pomodoro/stats
func GetPomodoroStats(c *gin.Context) {
	database, err := getDatabase(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewInternalError(err.Error()))
		return
	}

	date := c.Query("date")
	if date == "" {
		date = time.Now().UTC().Format("2006-01-02")
	}

	// Get completed work sessions for the day
	var workSessionsCompleted int
	var workTimeCompletedUs int64
	err = database.QueryRow(`
		SELECT COALESCE(COUNT(*), 0), COALESCE(SUM(elapsed_us), 0)
		FROM pomodoro_sessions
		WHERE session_type = 'work'
		  AND completed = 1
		  AND DATE(started_at) = ?
	`, date).Scan(&workSessionsCompleted, &workTimeCompletedUs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("stats"))
		return
	}

	// Get total work time (including interrupted sessions)
	var workTimeTotalUs int64
	err = database.QueryRow(`
		SELECT COALESCE(SUM(elapsed_us), 0)
		FROM pomodoro_sessions
		WHERE session_type = 'work'
		  AND DATE(started_at) = ?
	`, date).Scan(&workTimeTotalUs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("stats"))
		return
	}

	// Get break sessions for the day
	var breakSessionsCompleted int
	var breakTimeUs int64
	var shortBreakCount int
	var longBreakCount int
	err = database.QueryRow(`
		SELECT
			COALESCE(COUNT(*), 0),
			COALESCE(SUM(elapsed_us), 0),
			COALESCE(SUM(CASE WHEN session_type = 'short_break' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN session_type = 'long_break' THEN 1 ELSE 0 END), 0)
		FROM pomodoro_sessions
		WHERE session_type IN ('short_break', 'long_break')
		  AND completed = 1
		  AND DATE(started_at) = ?
	`, date).Scan(&breakSessionsCompleted, &breakTimeUs, &shortBreakCount, &longBreakCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("stats"))
		return
	}

	// Get settings for daily goal
	settings, err := getOrCreateSettings(database)
	if err != nil {
		c.JSON(http.StatusInternalServerError, middleware.NewFetchError("settings"))
		return
	}

	// Calculate goal progress
	goalProgressPercent := 0
	if settings.DailyGoal > 0 {
		goalProgressPercent = (workSessionsCompleted * 100) / settings.DailyGoal
		if goalProgressPercent > 100 {
			goalProgressPercent = 100
		}
	}

	stats := PomodoroDailyStats{
		Date:                   date,
		WorkSessionsCompleted:  workSessionsCompleted,
		WorkTimeCompletedUs:    workTimeCompletedUs,
		WorkTimeTotalUs:        workTimeTotalUs,
		BreakSessionsCompleted: breakSessionsCompleted,
		ShortBreakCount:        shortBreakCount,
		LongBreakCount:         longBreakCount,
		BreakTimeUs:            breakTimeUs,
		DailyGoal:              settings.DailyGoal,
		GoalProgressPercent:    goalProgressPercent,
	}

	c.JSON(http.StatusOK, middleware.NewSuccessResponse(stats))
}
