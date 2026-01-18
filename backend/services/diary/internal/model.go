package diary

import (
	"time"
)

// DiaryEntry represents a diary entry entity
type DiaryEntry struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Date      string    `json:"date"` // YYYY-MM-DD format
	Title     string    `json:"title"`
	Content   string    `json:"content"` // Markdown
	Tags      []string  `json:"tags"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// DiaryEntryListItem represents a diary entry for list response (same as full for diary)
type DiaryEntryListItem struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Date      string    `json:"date"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Tags      []string  `json:"tags"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ToListItem converts a DiaryEntry to DiaryEntryListItem
func (d *DiaryEntry) ToListItem() *DiaryEntryListItem {
	return &DiaryEntryListItem{
		ID:        d.ID,
		UserID:    d.UserID,
		Date:      d.Date,
		Title:     d.Title,
		Content:   d.Content,
		Tags:      d.Tags,
		CreatedAt: d.CreatedAt,
		UpdatedAt: d.UpdatedAt,
	}
}

// CreateDiaryInput represents the input for creating a diary entry
type CreateDiaryInput struct {
	Date    string   `json:"date"`    // YYYY-MM-DD
	Title   string   `json:"title"`
	Content string   `json:"content"` // Markdown
	Tags    []string `json:"tags"`
}

// UpdateDiaryInput represents the input for updating a diary entry
type UpdateDiaryInput struct {
	Date    *string  `json:"date,omitempty"`
	Title   *string  `json:"title,omitempty"`
	Content *string  `json:"content,omitempty"`
	Tags    []string `json:"tags,omitempty"`
}

// DiaryFilter represents filters for listing diary entries
type DiaryFilter struct {
	StartDate *string // YYYY-MM-DD
	EndDate   *string // YYYY-MM-DD
	Tag       *string
	Query     *string // For full-text search on title and content
}
