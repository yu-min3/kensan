package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	memo "github.com/kensan/backend/services/memo/internal"
	sharedErrors "github.com/kensan/backend/shared/errors"
)

// PostgresRepository handles database operations for memos
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// Ensure PostgresRepository implements Repository interface
var _ Repository = (*PostgresRepository)(nil)

// NewPostgresRepository creates a new memo repository
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// wrapDBError wraps a database error with context message and detects schema errors
func wrapDBError(msg string, err error) error {
	return fmt.Errorf("%s: %w", msg, sharedErrors.WrapDatabaseError(err))
}

// List returns memos for a user with optional filters
func (r *PostgresRepository) List(ctx context.Context, userID string, filter memo.MemoFilter) ([]memo.Memo, error) {
	query := `
		SELECT id, user_id, content, archived, created_at, updated_at
		FROM memos
		WHERE user_id = $1
	`
	args := []interface{}{userID}
	argCount := 1

	// Filter by archived status
	if !filter.IncludeAll {
		if filter.Archived != nil {
			argCount++
			query += fmt.Sprintf(" AND archived = $%d", argCount)
			args = append(args, *filter.Archived)
		} else {
			// Default: only show non-archived
			query += " AND archived = false"
		}
	}

	// Filter by date
	if filter.Date != nil {
		argCount++
		query += fmt.Sprintf(" AND DATE(created_at) = $%d", argCount)
		args = append(args, *filter.Date)
	}

	query += " ORDER BY created_at DESC"

	// Limit results
	if filter.Limit > 0 {
		argCount++
		query += fmt.Sprintf(" LIMIT $%d", argCount)
		args = append(args, filter.Limit)
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, wrapDBError("failed to query memos", err)
	}
	defer rows.Close()

	var memos []memo.Memo
	for rows.Next() {
		var m memo.Memo
		err := rows.Scan(
			&m.ID,
			&m.UserID,
			&m.Content,
			&m.Archived,
			&m.CreatedAt,
			&m.UpdatedAt,
		)
		if err != nil {
			return nil, wrapDBError("failed to scan memo", err)
		}
		memos = append(memos, m)
	}

	if err := rows.Err(); err != nil {
		return nil, wrapDBError("error iterating memos", err)
	}

	return memos, nil
}

// GetByID returns a memo by ID
func (r *PostgresRepository) GetByID(ctx context.Context, userID, memoID string) (*memo.Memo, error) {
	query := `
		SELECT id, user_id, content, archived, created_at, updated_at
		FROM memos
		WHERE id = $1 AND user_id = $2
	`

	var m memo.Memo
	err := r.pool.QueryRow(ctx, query, memoID, userID).Scan(
		&m.ID,
		&m.UserID,
		&m.Content,
		&m.Archived,
		&m.CreatedAt,
		&m.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, wrapDBError("failed to get memo", err)
	}

	return &m, nil
}

// Create creates a new memo
func (r *PostgresRepository) Create(ctx context.Context, userID string, input memo.CreateMemoInput) (*memo.Memo, error) {
	id := uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO memos (id, user_id, content, archived, created_at, updated_at)
		VALUES ($1, $2, $3, false, $4, $5)
		RETURNING id, user_id, content, archived, created_at, updated_at
	`

	var m memo.Memo
	err := r.pool.QueryRow(ctx, query, id, userID, input.Content, now, now).Scan(
		&m.ID,
		&m.UserID,
		&m.Content,
		&m.Archived,
		&m.CreatedAt,
		&m.UpdatedAt,
	)
	if err != nil {
		return nil, wrapDBError("failed to create memo", err)
	}

	return &m, nil
}

// Update updates an existing memo
func (r *PostgresRepository) Update(ctx context.Context, userID, memoID string, input memo.UpdateMemoInput) (*memo.Memo, error) {
	var setClauses []string
	var args []interface{}
	argCount := 0

	if input.Content != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("content = $%d", argCount))
		args = append(args, *input.Content)
	}

	if input.Archived != nil {
		argCount++
		setClauses = append(setClauses, fmt.Sprintf("archived = $%d", argCount))
		args = append(args, *input.Archived)
	}

	if len(setClauses) == 0 {
		return r.GetByID(ctx, userID, memoID)
	}

	argCount++
	setClauses = append(setClauses, fmt.Sprintf("updated_at = $%d", argCount))
	args = append(args, time.Now())

	argCount++
	args = append(args, memoID)
	argCount++
	args = append(args, userID)

	query := fmt.Sprintf(`
		UPDATE memos
		SET %s
		WHERE id = $%d AND user_id = $%d
		RETURNING id, user_id, content, archived, created_at, updated_at
	`, joinStrings(setClauses, ", "), argCount-1, argCount)

	var m memo.Memo
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&m.ID,
		&m.UserID,
		&m.Content,
		&m.Archived,
		&m.CreatedAt,
		&m.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, wrapDBError("failed to update memo", err)
	}

	return &m, nil
}

// Delete deletes a memo
func (r *PostgresRepository) Delete(ctx context.Context, userID, memoID string) error {
	query := `DELETE FROM memos WHERE id = $1 AND user_id = $2`
	result, err := r.pool.Exec(ctx, query, memoID, userID)
	if err != nil {
		return wrapDBError("failed to delete memo", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("memo not found")
	}

	return nil
}

func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}
