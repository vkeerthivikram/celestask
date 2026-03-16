package middleware

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
)

// Error codes
const (
	CodeNotFound        = "NOT_FOUND"
	CodeValidationError = "VALIDATION_ERROR"
	CodeFetchError      = "FETCH_ERROR"
	CodeCreateError     = "CREATE_ERROR"
	CodeUpdateError     = "UPDATE_ERROR"
	CodeDeleteError     = "DELETE_ERROR"
	CodeInternalError   = "INTERNAL_ERROR"
)

// APIError represents a standardized API error
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Error implements the error interface for APIError
func (e APIError) Error() string {
	return e.Message
}

// ErrorResponse represents the full error response structure
type ErrorResponse struct {
	Success bool     `json:"success"`
	Err     APIError `json:"error"`
}

// Error implements the error interface for ErrorResponse
func (e ErrorResponse) Error() string {
	return e.Err.Message
}

// SuccessResponse represents a successful API response
type SuccessResponse[T any] struct {
	Success bool `json:"success"`
	Data    T    `json:"data"`
}

// NewErrorResponse creates a new error response
func NewErrorResponse(code string, message string) ErrorResponse {
	return ErrorResponse{
		Success: false,
		Err: APIError{
			Code:    code,
			Message: message,
		},
	}
}

// NewSuccessResponse creates a new success response
func NewSuccessResponse[T any](data T) SuccessResponse[T] {
	return SuccessResponse[T]{
		Success: true,
		Data:    data,
	}
}

// Error constructors

// NewNotFoundError creates a NOT_FOUND error
func NewNotFoundError(entity string) ErrorResponse {
	return NewErrorResponse(CodeNotFound, fmt.Sprintf("%s not found", entity))
}

// NewValidationError creates a VALIDATION_ERROR error
func NewValidationError(message string) ErrorResponse {
	return NewErrorResponse(CodeValidationError, message)
}

// NewFetchError creates a FETCH_ERROR error
func NewFetchError(entity string) ErrorResponse {
	return NewErrorResponse(CodeFetchError, fmt.Sprintf("Failed to fetch %s", entity))
}

// NewCreateError creates a CREATE_ERROR error
func NewCreateError(entity string) ErrorResponse {
	return NewErrorResponse(CodeCreateError, fmt.Sprintf("Failed to create %s", entity))
}

// NewUpdateError creates an UPDATE_ERROR error
func NewUpdateError(entity string) ErrorResponse {
	return NewErrorResponse(CodeUpdateError, fmt.Sprintf("Failed to update %s", entity))
}

// NewDeleteError creates a DELETE_ERROR error
func NewDeleteError(entity string) ErrorResponse {
	return NewErrorResponse(CodeDeleteError, fmt.Sprintf("Failed to delete %s", entity))
}

// NewInternalError creates an INTERNAL_ERROR error
func NewInternalError(message string) ErrorResponse {
	return NewErrorResponse(CodeInternalError, message)
}

// AsyncHandler wraps a gin handler function with automatic error handling
// It catches panics and returns standardized error responses
func AsyncHandler(fn gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// Log the panic with stack trace
				fmt.Printf("Panic recovered: %v\n%s\n", err, debug.Stack())

				// Check if it's an ErrorResponse
				if apiErr, ok := err.(ErrorResponse); ok {
					c.JSON(http.StatusBadRequest, apiErr)
					return
				}

				// Default internal error
				c.JSON(http.StatusInternalServerError, NewInternalError("An unexpected error occurred"))
			}
		}()

		fn(c)
	}
}

// AsyncHandlerFunc creates a handler function from a function that returns an error
// This is useful for handlers that don't use gin context directly
func AsyncHandlerFunc(fn func(c *gin.Context) error) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// Log the panic with stack trace
				fmt.Printf("Panic recovered: %v\n%s\n", err, debug.Stack())

				// Check if it's an ErrorResponse
				if apiErr, ok := err.(ErrorResponse); ok {
					c.JSON(http.StatusBadRequest, apiErr)
					return
				}

				// Default internal error
				c.JSON(http.StatusInternalServerError, NewInternalError("An unexpected error occurred"))
			}
		}()

		if err := fn(c); err != nil {
			// Handle error responses
			if apiErr, ok := err.(ErrorResponse); ok {
				// Determine appropriate HTTP status code
				status := http.StatusInternalServerError
				switch apiErr.Err.Code {
				case CodeNotFound:
					status = http.StatusNotFound
				case CodeValidationError:
					status = http.StatusBadRequest
				}
				c.JSON(status, apiErr)
				return
			}

			// Handle standard errors
			c.JSON(http.StatusInternalServerError, NewInternalError(err.Error()))
		}
	}
}
