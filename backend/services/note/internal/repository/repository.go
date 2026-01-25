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
	"github.com/kensan/backend/services/note/internal"
	"github.com/rs/zerolog/log"
)

var (
	ErrNoteNotFound = errors.New("note not found")
)

// PostgresRepository handles note data persistence using PostgreSQL
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// Ensure PostgresRepository implements Repository interface
var _ Repository = (*PostgresRepository)(nil)

// NewPostgresRepository creates a new PostgreSQL note repository
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// GetByID retrieves a note by ID (with content)
func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*note.Note, error) {
	query := `
		SELECT id, user_id, type, title, content, format, date, task_id,
		       milestone_id, goal_id, milestone_name, goal_name, goal_color,
		       related_time_entry_ids, file_url, archived, created_at, updated_at
		FROM notes
		WHERE id = $1
	`

	n, err := r.scanNote(ctx, r.pool.QueryRow(ctx, query, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNoteNotFound
		}
		return nil, err
	}

	// Get tag IDs from junction table
	tagIDs, err := r.GetTagIDs(ctx, id)
	if err != nil {
		return nil, err
	}
	n.TagIDs = tagIDs

	return n, nil
}

// GetByIDAndUserID retrieves a note by ID and user ID (with content)
func (r *PostgresRepository) GetByIDAndUserID(ctx context.Context, id, userID string) (*note.Note, error) {
	query := `
		SELECT id, user_id, type, title, content, format, date, task_id,
		       milestone_id, goal_id, milestone_name, goal_name, goal_color,
		       related_time_entry_ids, file_url, archived, created_at, updated_at
		FROM notes
		WHERE id = $1 AND user_id = $2
	`

	n, err := r.scanNote(ctx, r.pool.QueryRow(ctx, query, id, userID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNoteNotFound
		}
		return nil, err
	}

	// Get tag IDs from junction table
	tagIDs, err := r.GetTagIDs(ctx, id)
	if err != nil {
		return nil, err
	}
	n.TagIDs = tagIDs

	return n, nil
}

// List retrieves notes for a user with optional filters (without content)
func (r *PostgresRepository) List(ctx context.Context, userID string, filter *note.NoteFilter) ([]*note.NoteListItem, error) {
	query := `
		SELECT n.id, n.user_id, n.type, n.title, n.format, n.date, n.task_id,
		       n.milestone_id, n.goal_id, n.milestone_name, n.goal_name, n.goal_color,
		       n.related_time_entry_ids, n.file_url, n.archived, n.created_at, n.updated_at
		FROM notes n
		WHERE n.user_id = $1
	`

	args := []interface{}{userID}
	argIndex := 2

	if filter != nil {
		if len(filter.Types) > 0 {
			placeholders := make([]string, len(filter.Types))
			for i, t := range filter.Types {
				placeholders[i] = fmt.Sprintf("$%d", argIndex)
				args = append(args, string(t))
				argIndex++
			}
			query += fmt.Sprintf(` AND n.type IN (%s)`, strings.Join(placeholders, ", "))
		}
		if filter.GoalID != nil {
			query += fmt.Sprintf(` AND n.goal_id = $%d`, argIndex)
			args = append(args, *filter.GoalID)
			argIndex++
		}
		if filter.MilestoneID != nil {
			query += fmt.Sprintf(` AND n.milestone_id = $%d`, argIndex)
			args = append(args, *filter.MilestoneID)
			argIndex++
		}
		if filter.TaskID != nil {
			query += fmt.Sprintf(` AND n.task_id = $%d`, argIndex)
			args = append(args, *filter.TaskID)
			argIndex++
		}
		if filter.Format != nil {
			query += fmt.Sprintf(` AND n.format = $%d`, argIndex)
			args = append(args, string(*filter.Format))
			argIndex++
		}
		if filter.DateFrom != nil {
			query += fmt.Sprintf(` AND n.date >= $%d`, argIndex)
			args = append(args, *filter.DateFrom)
			argIndex++
		}
		if filter.DateTo != nil {
			query += fmt.Sprintf(` AND n.date <= $%d`, argIndex)
			args = append(args, *filter.DateTo)
			argIndex++
		}
		if filter.Archived != nil {
			query += fmt.Sprintf(` AND n.archived = $%d`, argIndex)
			args = append(args, *filter.Archived)
			argIndex++
		}
		if filter.Query != nil && *filter.Query != "" {
			searchPattern := "%" + strings.ToLower(*filter.Query) + "%"
			query += fmt.Sprintf(` AND (LOWER(n.title) LIKE $%d OR LOWER(n.content) LIKE $%d)`, argIndex, argIndex)
			args = append(args, searchPattern)
			argIndex++
		}
		if len(filter.TagIDs) > 0 {
			// Filter by tags using EXISTS subquery
			for _, tagID := range filter.TagIDs {
				query += fmt.Sprintf(` AND EXISTS (SELECT 1 FROM note_tags nt WHERE nt.note_id = n.id AND nt.tag_id = $%d)`, argIndex)
				args = append(args, tagID)
				argIndex++
			}
		}
	}
	_ = argIndex // Suppress unused variable warning

	query += ` ORDER BY n.created_at DESC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []*note.NoteListItem
	for rows.Next() {
		item, err := r.scanNoteListItem(rows)
		if err != nil {
			log.Error().Err(err).Msg("Failed to scan note list item")
			return nil, err
		}

		// Get tag IDs for each note
		tagIDs, err := r.GetTagIDs(ctx, item.ID)
		if err != nil {
			log.Error().Err(err).Str("noteID", item.ID).Msg("Failed to get tag IDs")
			return nil, err
		}
		item.TagIDs = tagIDs

		notes = append(notes, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return notes, nil
}

// Create creates a new note
func (r *PostgresRepository) Create(ctx context.Context, n *note.Note) error {
	// Generate UUID if not set
	if n.ID == "" {
		n.ID = uuid.New().String()
	}

	now := time.Now()
	n.CreatedAt = now
	n.UpdatedAt = now

	query := `
		INSERT INTO notes (
			id, user_id, type, title, content, format, date, task_id,
			milestone_id, milestone_name, goal_id, goal_name, goal_color,
			related_time_entry_ids, file_url, archived, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
	`

	_, err := r.pool.Exec(ctx, query,
		n.ID,
		n.UserID,
		string(n.Type),
		n.Title,
		n.Content,
		string(n.Format),
		n.Date,
		n.TaskID,
		n.MilestoneID,
		n.MilestoneName,
		n.GoalID,
		n.GoalName,
		n.GoalColor,
		n.RelatedTimeEntryIDs,
		n.FileURL,
		n.Archived,
		n.CreatedAt,
		n.UpdatedAt,
	)
	if err != nil {
		return err
	}

	// Insert tag associations
	if len(n.TagIDs) > 0 {
		if err := r.UpdateTags(ctx, n.ID, n.TagIDs); err != nil {
			return err
		}
	}

	return nil
}

// Update updates an existing note
func (r *PostgresRepository) Update(ctx context.Context, n *note.Note) error {
	n.UpdatedAt = time.Now()

	query := `
		UPDATE notes
		SET title = $2, content = $3, format = $4, date = $5, task_id = $6,
		    milestone_id = $7, milestone_name = $8, goal_id = $9, goal_name = $10, goal_color = $11,
		    related_time_entry_ids = $12, file_url = $13, archived = $14, updated_at = $15
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query,
		n.ID,
		n.Title,
		n.Content,
		string(n.Format),
		n.Date,
		n.TaskID,
		n.MilestoneID,
		n.MilestoneName,
		n.GoalID,
		n.GoalName,
		n.GoalColor,
		n.RelatedTimeEntryIDs,
		n.FileURL,
		n.Archived,
		n.UpdatedAt,
	)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrNoteNotFound
	}

	// Update tag associations
	if err := r.UpdateTags(ctx, n.ID, n.TagIDs); err != nil {
		return err
	}

	return nil
}

// Delete deletes a note
func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM notes WHERE id = $1`

	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrNoteNotFound
	}

	return nil
}

// DeleteByIDAndUserID deletes a note by ID and user ID
func (r *PostgresRepository) DeleteByIDAndUserID(ctx context.Context, id, userID string) error {
	query := `DELETE FROM notes WHERE id = $1 AND user_id = $2`

	result, err := r.pool.Exec(ctx, query, id, userID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrNoteNotFound
	}

	return nil
}

// Search performs a full-text search on notes
func (r *PostgresRepository) Search(ctx context.Context, userID, query string, filter *note.NoteFilter, limit int) ([]*note.SearchResult, error) {
	if limit <= 0 {
		limit = 20
	}

	searchPattern := "%" + strings.ToLower(query) + "%"

	sqlQuery := `
		SELECT n.id, n.user_id, n.type, n.title, n.format, n.date, n.task_id,
		       n.milestone_id, n.goal_id, n.milestone_name, n.goal_name, n.goal_color,
		       n.related_time_entry_ids, n.file_url, n.archived, n.created_at, n.updated_at,
		       CASE
		           WHEN LOWER(n.title) LIKE $2 THEN 1.0
		           WHEN LOWER(n.content) LIKE $2 THEN 0.5
		           ELSE 0.0
		       END as score
		FROM notes n
		WHERE n.user_id = $1 AND (LOWER(n.title) LIKE $2 OR LOWER(n.content) LIKE $2)
	`

	args := []interface{}{userID, searchPattern}
	argIndex := 3

	if filter != nil {
		if len(filter.Types) > 0 {
			placeholders := make([]string, len(filter.Types))
			for i, t := range filter.Types {
				placeholders[i] = fmt.Sprintf("$%d", argIndex)
				args = append(args, string(t))
				argIndex++
			}
			sqlQuery += fmt.Sprintf(` AND n.type IN (%s)`, strings.Join(placeholders, ", "))
		}
		if filter.Archived != nil {
			sqlQuery += fmt.Sprintf(` AND n.archived = $%d`, argIndex)
			args = append(args, *filter.Archived)
			argIndex++
		}
	}

	sqlQuery += fmt.Sprintf(` ORDER BY score DESC, n.created_at DESC LIMIT $%d`, argIndex)
	args = append(args, limit)

	rows, err := r.pool.Query(ctx, sqlQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*note.SearchResult
	for rows.Next() {
		item, score, err := r.scanNoteListItemWithScore(rows)
		if err != nil {
			return nil, err
		}

		// Get tag IDs
		tagIDs, err := r.GetTagIDs(ctx, item.ID)
		if err != nil {
			return nil, err
		}
		item.TagIDs = tagIDs

		results = append(results, &note.SearchResult{
			Note:  item,
			Score: score,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return results, nil
}

// UpdateTags updates the tags for a note
func (r *PostgresRepository) UpdateTags(ctx context.Context, noteID string, tagIDs []string) error {
	// Delete existing tags
	_, err := r.pool.Exec(ctx, `DELETE FROM note_tags WHERE note_id = $1`, noteID)
	if err != nil {
		return err
	}

	// Insert new tags
	if len(tagIDs) > 0 {
		for _, tagID := range tagIDs {
			_, err := r.pool.Exec(ctx,
				`INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
				noteID, tagID)
			if err != nil {
				return err
			}
		}
	}

	return nil
}

// GetTagIDs retrieves the tag IDs for a note
func (r *PostgresRepository) GetTagIDs(ctx context.Context, noteID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `SELECT tag_id FROM note_tags WHERE note_id = $1`, noteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tagIDs []string
	for rows.Next() {
		var tagID string
		if err := rows.Scan(&tagID); err != nil {
			return nil, err
		}
		tagIDs = append(tagIDs, tagID)
	}

	return tagIDs, rows.Err()
}

// Helper functions for scanning

func (r *PostgresRepository) scanNote(ctx context.Context, row pgx.Row) (*note.Note, error) {
	var n note.Note
	var title, taskID, milestoneID, milestoneName, goalID, goalName, goalColor, fileURL *string
	var relatedTimeEntryIDs []string

	err := row.Scan(
		&n.ID,
		&n.UserID,
		&n.Type,
		&title,
		&n.Content,
		&n.Format,
		&n.Date,
		&taskID,
		&milestoneID,
		&goalID,
		&milestoneName,
		&goalName,
		&goalColor,
		&relatedTimeEntryIDs,
		&fileURL,
		&n.Archived,
		&n.CreatedAt,
		&n.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	n.Title = title
	n.TaskID = taskID
	n.MilestoneID = milestoneID
	n.MilestoneName = milestoneName
	n.GoalID = goalID
	n.GoalName = goalName
	n.GoalColor = goalColor
	n.RelatedTimeEntryIDs = relatedTimeEntryIDs
	n.FileURL = fileURL

	return &n, nil
}

func (r *PostgresRepository) scanNoteListItem(rows pgx.Rows) (*note.NoteListItem, error) {
	var item note.NoteListItem
	var title, taskID, milestoneID, milestoneName, goalID, goalName, goalColor, fileURL *string
	var relatedTimeEntryIDs []string

	err := rows.Scan(
		&item.ID,
		&item.UserID,
		&item.Type,
		&title,
		&item.Format,
		&item.Date,
		&taskID,
		&milestoneID,
		&goalID,
		&milestoneName,
		&goalName,
		&goalColor,
		&relatedTimeEntryIDs,
		&fileURL,
		&item.Archived,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	item.Title = title
	item.TaskID = taskID
	item.MilestoneID = milestoneID
	item.MilestoneName = milestoneName
	item.GoalID = goalID
	item.GoalName = goalName
	item.GoalColor = goalColor
	item.RelatedTimeEntryIDs = relatedTimeEntryIDs
	item.FileURL = fileURL

	return &item, nil
}

func (r *PostgresRepository) scanNoteListItemWithScore(rows pgx.Rows) (*note.NoteListItem, float64, error) {
	var item note.NoteListItem
	var title, taskID, milestoneID, milestoneName, goalID, goalName, goalColor, fileURL *string
	var relatedTimeEntryIDs []string
	var score float64

	err := rows.Scan(
		&item.ID,
		&item.UserID,
		&item.Type,
		&title,
		&item.Format,
		&item.Date,
		&taskID,
		&milestoneID,
		&goalID,
		&milestoneName,
		&goalName,
		&goalColor,
		&relatedTimeEntryIDs,
		&fileURL,
		&item.Archived,
		&item.CreatedAt,
		&item.UpdatedAt,
		&score,
	)
	if err != nil {
		return nil, 0, err
	}

	item.Title = title
	item.TaskID = taskID
	item.MilestoneID = milestoneID
	item.MilestoneName = milestoneName
	item.GoalID = goalID
	item.GoalName = goalName
	item.GoalColor = goalColor
	item.RelatedTimeEntryIDs = relatedTimeEntryIDs
	item.FileURL = fileURL

	return &item, score, nil
}

// ========== NoteContent Operations ==========

// ListContents retrieves all contents for a note
func (r *PostgresRepository) ListContents(ctx context.Context, noteID string) ([]*note.NoteContent, error) {
	query := `
		SELECT id, note_id, content_type, content, storage_provider, storage_key,
		       file_name, mime_type, file_size_bytes, checksum, thumbnail_base64,
		       sort_order, metadata, created_at, updated_at
		FROM note_contents
		WHERE note_id = $1
		ORDER BY sort_order, created_at
	`

	rows, err := r.pool.Query(ctx, query, noteID)
	if err != nil {
		return nil, fmt.Errorf("failed to list contents: %w", err)
	}
	defer rows.Close()

	var contents []*note.NoteContent
	for rows.Next() {
		content, err := r.scanNoteContent(rows)
		if err != nil {
			return nil, err
		}
		contents = append(contents, content)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating contents: %w", err)
	}

	return contents, nil
}

// GetContent retrieves a content by ID
func (r *PostgresRepository) GetContent(ctx context.Context, contentID string) (*note.NoteContent, error) {
	query := `
		SELECT id, note_id, content_type, content, storage_provider, storage_key,
		       file_name, mime_type, file_size_bytes, checksum, thumbnail_base64,
		       sort_order, metadata, created_at, updated_at
		FROM note_contents
		WHERE id = $1
	`

	row := r.pool.QueryRow(ctx, query, contentID)
	content, err := r.scanNoteContent(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return content, nil
}

// CreateContent creates a new note content
func (r *PostgresRepository) CreateContent(ctx context.Context, content *note.NoteContent) error {
	if content.ID == "" {
		content.ID = uuid.New().String()
	}
	now := time.Now()
	content.CreatedAt = now
	content.UpdatedAt = now

	query := `
		INSERT INTO note_contents (
			id, note_id, content_type, content, storage_provider, storage_key,
			file_name, mime_type, file_size_bytes, checksum, thumbnail_base64,
			sort_order, metadata, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`

	_, err := r.pool.Exec(ctx, query,
		content.ID,
		content.NoteID,
		content.ContentType,
		content.Content,
		content.StorageProvider,
		content.StorageKey,
		content.FileName,
		content.MimeType,
		content.FileSizeBytes,
		content.Checksum,
		content.ThumbnailBase64,
		content.SortOrder,
		content.Metadata,
		content.CreatedAt,
		content.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to create content: %w", err)
	}

	return nil
}

// UpdateContent updates an existing note content
func (r *PostgresRepository) UpdateContent(ctx context.Context, content *note.NoteContent) error {
	content.UpdatedAt = time.Now()

	query := `
		UPDATE note_contents
		SET content = $2, thumbnail_base64 = $3, sort_order = $4, metadata = $5, updated_at = $6
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query,
		content.ID,
		content.Content,
		content.ThumbnailBase64,
		content.SortOrder,
		content.Metadata,
		content.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to update content: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("content not found")
	}

	return nil
}

// DeleteContent deletes a note content
func (r *PostgresRepository) DeleteContent(ctx context.Context, contentID string) error {
	query := `DELETE FROM note_contents WHERE id = $1`
	result, err := r.pool.Exec(ctx, query, contentID)
	if err != nil {
		return fmt.Errorf("failed to delete content: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("content not found")
	}

	return nil
}

// ReorderContents updates the sort order of contents
func (r *PostgresRepository) ReorderContents(ctx context.Context, noteID string, contentIDs []string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	now := time.Now()
	for i, contentID := range contentIDs {
		_, err := tx.Exec(ctx, `
			UPDATE note_contents
			SET sort_order = $1, updated_at = $2
			WHERE id = $3 AND note_id = $4
		`, i, now, contentID, noteID)
		if err != nil {
			return fmt.Errorf("failed to update sort order: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// UpdateIndexStatus updates the index status of a note
func (r *PostgresRepository) UpdateIndexStatus(ctx context.Context, noteID string, status note.IndexStatus) error {
	var indexedAt *time.Time
	if status == note.IndexStatusIndexed {
		now := time.Now()
		indexedAt = &now
	}

	query := `
		UPDATE notes
		SET index_status = $2, indexed_at = $3, updated_at = NOW()
		WHERE id = $1
	`

	result, err := r.pool.Exec(ctx, query, noteID, status, indexedAt)
	if err != nil {
		return fmt.Errorf("failed to update index status: %w", err)
	}

	if result.RowsAffected() == 0 {
		return ErrNoteNotFound
	}

	return nil
}

// scanNoteContent scans a row into a NoteContent struct
func (r *PostgresRepository) scanNoteContent(row pgx.Row) (*note.NoteContent, error) {
	var content note.NoteContent
	var storageProvider *string

	err := row.Scan(
		&content.ID,
		&content.NoteID,
		&content.ContentType,
		&content.Content,
		&storageProvider,
		&content.StorageKey,
		&content.FileName,
		&content.MimeType,
		&content.FileSizeBytes,
		&content.Checksum,
		&content.ThumbnailBase64,
		&content.SortOrder,
		&content.Metadata,
		&content.CreatedAt,
		&content.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to scan content: %w", err)
	}

	if storageProvider != nil {
		sp := note.StorageProvider(*storageProvider)
		content.StorageProvider = &sp
	}

	return &content, nil
}
