package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kensan/backend/services/record/internal"
)

var (
	ErrRecordNotFound = errors.New("record not found")
)

// PostgresRepository handles learning record data persistence using PostgreSQL
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// Ensure PostgresRepository implements Repository interface
var _ Repository = (*PostgresRepository)(nil)

// NewPostgresRepository creates a new PostgreSQL record repository
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// GetByID retrieves a learning record by ID (with content)
func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*record.LearningRecord, error) {
	query := `
		SELECT id, user_id, title, content, format, project_id, project_name,
		       goal_tag, related_time_entry_ids, file_url, created_at, updated_at
		FROM learning_records
		WHERE id = $1
	`

	var rec record.LearningRecord
	var projectID, projectName, goalTag, fileURL *string
	var relatedTimeEntryIDs []string

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&rec.ID,
		&rec.UserID,
		&rec.Title,
		&rec.Content,
		&rec.Format,
		&projectID,
		&projectName,
		&goalTag,
		&relatedTimeEntryIDs,
		&fileURL,
		&rec.CreatedAt,
		&rec.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrRecordNotFound
		}
		return nil, err
	}

	rec.ProjectID = projectID
	rec.ProjectName = projectName
	if goalTag != nil {
		g := record.GoalTag(*goalTag)
		rec.GoalTag = &g
	}
	rec.RelatedTimeEntryIDs = relatedTimeEntryIDs
	rec.FileURL = fileURL

	return &rec, nil
}

// GetByIDAndUserID retrieves a learning record by ID and user ID (with content)
func (r *PostgresRepository) GetByIDAndUserID(ctx context.Context, id, userID string) (*record.LearningRecord, error) {
	query := `
		SELECT id, user_id, title, content, format, project_id, project_name,
		       goal_tag, related_time_entry_ids, file_url, created_at, updated_at
		FROM learning_records
		WHERE id = $1 AND user_id = $2
	`

	var rec record.LearningRecord
	var projectID, projectName, goalTag, fileURL *string
	var relatedTimeEntryIDs []string

	err := r.pool.QueryRow(ctx, query, id, userID).Scan(
		&rec.ID,
		&rec.UserID,
		&rec.Title,
		&rec.Content,
		&rec.Format,
		&projectID,
		&projectName,
		&goalTag,
		&relatedTimeEntryIDs,
		&fileURL,
		&rec.CreatedAt,
		&rec.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrRecordNotFound
		}
		return nil, err
	}

	rec.ProjectID = projectID
	rec.ProjectName = projectName
	if goalTag != nil {
		g := record.GoalTag(*goalTag)
		rec.GoalTag = &g
	}
	rec.RelatedTimeEntryIDs = relatedTimeEntryIDs
	rec.FileURL = fileURL

	return &rec, nil
}

// List retrieves learning records for a user with optional filters (without content)
func (r *PostgresRepository) List(ctx context.Context, userID string, filter *record.RecordFilter) ([]*record.LearningRecordListItem, error) {
	query := `
		SELECT id, user_id, title, format, project_id, project_name,
		       goal_tag, related_time_entry_ids, file_url, created_at, updated_at
		FROM learning_records
		WHERE user_id = $1
	`

	args := []interface{}{userID}
	argIndex := 2

	if filter != nil {
		if filter.ProjectID != nil {
			query += fmt.Sprintf(` AND project_id = $%d`, argIndex)
			args = append(args, *filter.ProjectID)
			argIndex++
		}
		if filter.GoalTag != nil {
			query += fmt.Sprintf(` AND goal_tag = $%d`, argIndex)
			args = append(args, string(*filter.GoalTag))
			argIndex++
		}
		if filter.Format != nil {
			query += fmt.Sprintf(` AND format = $%d`, argIndex)
			args = append(args, string(*filter.Format))
			argIndex++
		}
		if filter.Query != nil && *filter.Query != "" {
			// Simple LIKE search on title and content
			searchPattern := "%" + strings.ToLower(*filter.Query) + "%"
			query += fmt.Sprintf(` AND (LOWER(title) LIKE $%d OR LOWER(content) LIKE $%d)`, argIndex, argIndex)
			args = append(args, searchPattern)
		}
	}
	_ = argIndex // Suppress unused variable warning

	query += ` ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []*record.LearningRecordListItem
	for rows.Next() {
		var rec record.LearningRecordListItem
		var projectID, projectName, goalTag, fileURL *string
		var relatedTimeEntryIDs []string

		err := rows.Scan(
			&rec.ID,
			&rec.UserID,
			&rec.Title,
			&rec.Format,
			&projectID,
			&projectName,
			&goalTag,
			&relatedTimeEntryIDs,
			&fileURL,
			&rec.CreatedAt,
			&rec.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		rec.ProjectID = projectID
		rec.ProjectName = projectName
		if goalTag != nil {
			g := record.GoalTag(*goalTag)
			rec.GoalTag = &g
		}
		rec.RelatedTimeEntryIDs = relatedTimeEntryIDs
		rec.FileURL = fileURL

		records = append(records, &rec)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return records, nil
}

// Create creates a new learning record
func (r *PostgresRepository) Create(ctx context.Context, rec *record.LearningRecord) error {
	// Generate UUID if not set
	if rec.ID == "" {
		rec.ID = uuid.New().String()
	}

	now := time.Now()
	rec.CreatedAt = now
	rec.UpdatedAt = now

	query := `
		INSERT INTO learning_records (
			id, user_id, title, content, format, project_id, project_name,
			goal_tag, related_time_entry_ids, file_url, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`

	var goalTag *string
	if rec.GoalTag != nil {
		g := string(*rec.GoalTag)
		goalTag = &g
	}

	_, err := r.pool.Exec(ctx, query,
		rec.ID,
		rec.UserID,
		rec.Title,
		rec.Content,
		string(rec.Format),
		rec.ProjectID,
		rec.ProjectName,
		goalTag,
		rec.RelatedTimeEntryIDs,
		rec.FileURL,
		rec.CreatedAt,
		rec.UpdatedAt,
	)
	return err
}

// Update updates an existing learning record
func (r *PostgresRepository) Update(ctx context.Context, rec *record.LearningRecord) error {
	rec.UpdatedAt = time.Now()

	query := `
		UPDATE learning_records
		SET title = $2, content = $3, format = $4, project_id = $5, project_name = $6,
		    goal_tag = $7, related_time_entry_ids = $8, file_url = $9, updated_at = $10
		WHERE id = $1
	`

	var goalTag *string
	if rec.GoalTag != nil {
		g := string(*rec.GoalTag)
		goalTag = &g
	}

	result, err := r.pool.Exec(ctx, query,
		rec.ID,
		rec.Title,
		rec.Content,
		string(rec.Format),
		rec.ProjectID,
		rec.ProjectName,
		goalTag,
		rec.RelatedTimeEntryIDs,
		rec.FileURL,
		rec.UpdatedAt,
	)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrRecordNotFound
	}

	return nil
}

// Delete deletes a learning record
func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM learning_records WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrRecordNotFound
	}

	return nil
}

// DeleteByIDAndUserID deletes a learning record by ID and user ID
func (r *PostgresRepository) DeleteByIDAndUserID(ctx context.Context, id, userID string) error {
	query := `DELETE FROM learning_records WHERE id = $1 AND user_id = $2`

	result, err := r.pool.Exec(ctx, query, id, userID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrRecordNotFound
	}

	return nil
}

// SemanticSearch performs a simple full-text search (placeholder for future pgvector implementation)
func (r *PostgresRepository) SemanticSearch(ctx context.Context, userID, query string, limit int) ([]*record.SemanticSearchResult, error) {
	if limit <= 0 {
		limit = 10
	}

	// Simple LIKE-based search for now, will be replaced with pgvector later
	searchPattern := "%" + strings.ToLower(query) + "%"

	sqlQuery := `
		SELECT id, user_id, title, format, project_id, project_name,
		       goal_tag, related_time_entry_ids, file_url, created_at, updated_at,
		       CASE
		           WHEN LOWER(title) LIKE $2 THEN 1.0
		           WHEN LOWER(content) LIKE $2 THEN 0.5
		           ELSE 0.0
		       END as score
		FROM learning_records
		WHERE user_id = $1 AND (LOWER(title) LIKE $2 OR LOWER(content) LIKE $2)
		ORDER BY score DESC, created_at DESC
		LIMIT $3
	`

	rows, err := r.pool.Query(ctx, sqlQuery, userID, searchPattern, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*record.SemanticSearchResult
	for rows.Next() {
		var rec record.LearningRecordListItem
		var projectID, projectName, goalTag, fileURL *string
		var relatedTimeEntryIDs []string
		var score float64

		err := rows.Scan(
			&rec.ID,
			&rec.UserID,
			&rec.Title,
			&rec.Format,
			&projectID,
			&projectName,
			&goalTag,
			&relatedTimeEntryIDs,
			&fileURL,
			&rec.CreatedAt,
			&rec.UpdatedAt,
			&score,
		)
		if err != nil {
			return nil, err
		}

		rec.ProjectID = projectID
		rec.ProjectName = projectName
		if goalTag != nil {
			g := record.GoalTag(*goalTag)
			rec.GoalTag = &g
		}
		rec.RelatedTimeEntryIDs = relatedTimeEntryIDs
		rec.FileURL = fileURL

		results = append(results, &record.SemanticSearchResult{
			Record: &rec,
			Score:  score,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return results, nil
}
