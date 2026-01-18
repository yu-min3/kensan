package middleware

import (
	"encoding/json"
	"net/http"
	"time"
)

// Response is the standard API response format
type Response struct {
	Data       interface{}          `json:"data,omitempty"`
	Error      *ErrorResponse       `json:"error,omitempty"`
	Meta       MetaResponse         `json:"meta"`
	Pagination *PaginationResponse  `json:"pagination,omitempty"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Details []ErrorDetail  `json:"details,omitempty"`
}

// ErrorDetail represents a validation error detail
type ErrorDetail struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// MetaResponse contains metadata about the response
type MetaResponse struct {
	RequestID string `json:"requestId"`
	Timestamp string `json:"timestamp"`
}

// PaginationResponse contains pagination information
type PaginationResponse struct {
	Page       int `json:"page"`
	PerPage    int `json:"perPage"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

// JSON writes a JSON response
func JSON(w http.ResponseWriter, r *http.Request, status int, data interface{}) {
	response := Response{
		Data: data,
		Meta: MetaResponse{
			RequestID: GetRequestID(r.Context()),
			Timestamp: time.Now().Format(time.RFC3339),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(response)
}

// JSONWithPagination writes a JSON response with pagination
func JSONWithPagination(w http.ResponseWriter, r *http.Request, status int, data interface{}, pagination PaginationResponse) {
	response := Response{
		Data: data,
		Meta: MetaResponse{
			RequestID: GetRequestID(r.Context()),
			Timestamp: time.Now().Format(time.RFC3339),
		},
		Pagination: &pagination,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(response)
}

// Error writes an error response
func Error(w http.ResponseWriter, r *http.Request, status int, code, message string) {
	response := Response{
		Error: &ErrorResponse{
			Code:    code,
			Message: message,
		},
		Meta: MetaResponse{
			RequestID: GetRequestID(r.Context()),
			Timestamp: time.Now().Format(time.RFC3339),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(response)
}

// ValidationError writes a validation error response
func ValidationError(w http.ResponseWriter, r *http.Request, details []ErrorDetail) {
	response := Response{
		Error: &ErrorResponse{
			Code:    "VALIDATION_ERROR",
			Message: "入力値が不正です",
			Details: details,
		},
		Meta: MetaResponse{
			RequestID: GetRequestID(r.Context()),
			Timestamp: time.Now().Format(time.RFC3339),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(response)
}
