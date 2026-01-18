package repository

import (
	"context"

	"github.com/kensan/backend/services/ai/internal"
)

// Repository defines the interface for AI repository operations
type Repository interface {
	// CreateReport creates a new AI review report
	CreateReport(ctx context.Context, report *ai.AIReviewReport) error

	// GetReportByID retrieves a report by ID for a specific user
	GetReportByID(ctx context.Context, userID, reportID string) (*ai.AIReviewReport, error)

	// ListReports returns all reports for a user with optional date filters
	ListReports(ctx context.Context, userID string, filter ai.ReviewFilter) ([]ai.AIReviewReport, error)

	// GetTimeEntriesForPeriod retrieves time entries for a specific period
	GetTimeEntriesForPeriod(ctx context.Context, userID, startDate, endDate string) ([]ai.TimeEntryData, error)

	// GetLearningRecordsForPeriod retrieves learning records for a specific period
	GetLearningRecordsForPeriod(ctx context.Context, userID, startDate, endDate string) ([]ai.LearningRecordData, error)

	// DeleteReport deletes a report by ID
	DeleteReport(ctx context.Context, userID, reportID string) error
}
