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
	"github.com/kensan/backend/services/diary/internal"
	sharedErrors "github.com/kensan/backend/shared/errors"
)

var (
	ErrDiaryNotFound = errors.New("diary entry not found")
)

// Ensure PostgresRepository implements Repository interface
var _ Repository = (*PostgresRepository)(nil)

// PostgresRepository handles diary entry data persistence using PostgreSQL
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresRepository creates a new PostgreSQL diary repository
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// wrapDBError wraps a database error with context message and detects schema errors
func wrapDBError(msg string, err error) error {
	return fmt.Errorf("%s: %w", msg, sharedErrors.WrapDatabaseError(err))
}

// GetByID retrieves a diary entry by ID
func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*diary.DiaryEntry, error) {
	query := `
		SELECT id, user_id, date::text, title, content, tags, created_at, updated_at
		FROM diary_entries
		WHERE id = $1
	`

	var entry diary.DiaryEntry
	var tags []string

	err := r.pool.QueryRow(ctx, query, id).Scan(
		&entry.ID,
		&entry.UserID,
		&entry.Date,
		&entry.Title,
		&entry.Content,
		&tags,
		&entry.CreatedAt,
		&entry.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDiaryNotFound
		}
		return nil, wrapDBError("failed to get diary entry by ID", err)
	}

	entry.Tags = tags
	if entry.Tags == nil {
		entry.Tags = []string{}
	}

	return &entry, nil
}

// GetByIDAndUserID retrieves a diary entry by ID and user ID
func (r *PostgresRepository) GetByIDAndUserID(ctx context.Context, id, userID string) (*diary.DiaryEntry, error) {
	query := `
		SELECT id, user_id, date::text, title, content, tags, created_at, updated_at
		FROM diary_entries
		WHERE id = $1 AND user_id = $2
	`

	var entry diary.DiaryEntry
	var tags []string

	err := r.pool.QueryRow(ctx, query, id, userID).Scan(
		&entry.ID,
		&entry.UserID,
		&entry.Date,
		&entry.Title,
		&entry.Content,
		&tags,
		&entry.CreatedAt,
		&entry.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDiaryNotFound
		}
		return nil, wrapDBError("failed to get diary entry by ID and user ID", err)
	}

	entry.Tags = tags
	if entry.Tags == nil {
		entry.Tags = []string{}
	}

	return &entry, nil
}

// GetByDateAndUserID retrieves a diary entry by date and user ID
func (r *PostgresRepository) GetByDateAndUserID(ctx context.Context, date, userID string) (*diary.DiaryEntry, error) {
	query := `
		SELECT id, user_id, date::text, title, content, tags, created_at, updated_at
		FROM diary_entries
		WHERE date = $1 AND user_id = $2
	`

	var entry diary.DiaryEntry
	var tags []string

	err := r.pool.QueryRow(ctx, query, date, userID).Scan(
		&entry.ID,
		&entry.UserID,
		&entry.Date,
		&entry.Title,
		&entry.Content,
		&tags,
		&entry.CreatedAt,
		&entry.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDiaryNotFound
		}
		return nil, wrapDBError("failed to get diary entry by date and user ID", err)
	}

	entry.Tags = tags
	if entry.Tags == nil {
		entry.Tags = []string{}
	}

	return &entry, nil
}

// List retrieves diary entries for a user with optional filters
func (r *PostgresRepository) List(ctx context.Context, userID string, filter *diary.DiaryFilter) ([]*diary.DiaryEntryListItem, error) {
	query := `
		SELECT id, user_id, date::text, title, content, tags, created_at, updated_at
		FROM diary_entries
		WHERE user_id = $1
	`

	args := []interface{}{userID}
	argIndex := 2

	if filter != nil {
		if filter.StartDate != nil {
			query += fmt.Sprintf(` AND date >= $%d`, argIndex)
			args = append(args, *filter.StartDate)
			argIndex++
		}
		if filter.EndDate != nil {
			query += fmt.Sprintf(` AND date <= $%d`, argIndex)
			args = append(args, *filter.EndDate)
			argIndex++
		}
		if filter.Tag != nil && *filter.Tag != "" {
			query += fmt.Sprintf(` AND $%d = ANY(tags)`, argIndex)
			args = append(args, *filter.Tag)
			argIndex++
		}
		if filter.Query != nil && *filter.Query != "" {
			// Simple LIKE search on title and content
			searchPattern := "%" + strings.ToLower(*filter.Query) + "%"
			query += fmt.Sprintf(` AND (LOWER(title) LIKE $%d OR LOWER(content) LIKE $%d)`, argIndex, argIndex)
			args = append(args, searchPattern)
			argIndex++
		}
	}
	_ = argIndex // Suppress unused variable warning

	query += ` ORDER BY date DESC, created_at DESC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, wrapDBError("failed to query diary entries", err)
	}
	defer rows.Close()

	var entries []*diary.DiaryEntryListItem
	for rows.Next() {
		var entry diary.DiaryEntryListItem
		var tags []string

		err := rows.Scan(
			&entry.ID,
			&entry.UserID,
			&entry.Date,
			&entry.Title,
			&entry.Content,
			&tags,
			&entry.CreatedAt,
			&entry.UpdatedAt,
		)
		if err != nil {
			return nil, wrapDBError("failed to scan diary entry", err)
		}

		entry.Tags = tags
		if entry.Tags == nil {
			entry.Tags = []string{}
		}

		entries = append(entries, &entry)
	}

	if err := rows.Err(); err != nil {
		return nil, wrapDBError("failed to iterate diary entries", err)
	}

	return entries, nil
}

// Create creates a new diary entry
func (r *PostgresRepository) Create(ctx context.Context, entry *diary.DiaryEntry) error {
	// Generate UUID if not set
	if entry.ID == "" {
		entry.ID = uuid.New().String()
	}

	now := time.Now()
	entry.CreatedAt = now
	entry.UpdatedAt = now

	// Ensure tags is not nil
	if entry.Tags == nil {
		entry.Tags = []string{}
	}

	query := `
		INSERT INTO diary_entries (id, user_id, date, title, content, tags, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := r.pool.Exec(ctx, query,
		entry.ID,
		entry.UserID,
		entry.Date,
		entry.Title,
		entry.Content,
		entry.Tags,
		entry.CreatedAt,
		entry.UpdatedAt,
	)
	if err != nil {
		return wrapDBError("failed to create diary entry", err)
	}
	return nil
}

// Update updates an existing diary entry
func (r *PostgresRepository) Update(ctx context.Context, entry *diary.DiaryEntry) error {
	entry.UpdatedAt = time.Now()

	// Ensure tags is not nil
	if entry.Tags == nil {
		entry.Tags = []string{}
	}

	query := `
		UPDATE diary_entries
		SET date = $2, title = $3, content = $4, tags = $5, updated_at = $6
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query,
		entry.ID,
		entry.Date,
		entry.Title,
		entry.Content,
		entry.Tags,
		entry.UpdatedAt,
	)
	if err != nil {
		return wrapDBError("failed to update diary entry", err)
	}

	if result.RowsAffected() == 0 {
		return ErrDiaryNotFound
	}

	return nil
}

// Delete deletes a diary entry
func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM diary_entries WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return wrapDBError("failed to delete diary entry", err)
	}

	if result.RowsAffected() == 0 {
		return ErrDiaryNotFound
	}

	return nil
}

// DeleteByIDAndUserID deletes a diary entry by ID and user ID
func (r *PostgresRepository) DeleteByIDAndUserID(ctx context.Context, id, userID string) error {
	query := `DELETE FROM diary_entries WHERE id = $1 AND user_id = $2`

	result, err := r.pool.Exec(ctx, query, id, userID)
	if err != nil {
		return wrapDBError("failed to delete diary entry by ID and user ID", err)
	}

	if result.RowsAffected() == 0 {
		return ErrDiaryNotFound
	}

	return nil
}
