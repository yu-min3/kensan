package record

import (
	"time"
)

// RecordFormat represents the format of a learning record
type RecordFormat string

const (
	RecordFormatMarkdown RecordFormat = "markdown"
	RecordFormatDrawio   RecordFormat = "drawio"
)

// IsValid checks if the record format is valid
func (f RecordFormat) IsValid() bool {
	switch f {
	case RecordFormatMarkdown, RecordFormatDrawio:
		return true
	}
	return false
}

// GoalTag represents the type of goal for a learning record
type GoalTag string

const (
	GoalTagGK     GoalTag = "GK"
	GoalTagOSS    GoalTag = "OSS"
	GoalTagOutput GoalTag = "Output"
	GoalTagOther  GoalTag = "Other"
)

// IsValid checks if the goal tag is valid
func (g GoalTag) IsValid() bool {
	switch g {
	case GoalTagGK, GoalTagOSS, GoalTagOutput, GoalTagOther:
		return true
	}
	return false
}

// LearningRecord represents a learning record entity
type LearningRecord struct {
	ID                  string       `json:"id"`
	UserID              string       `json:"userId"`
	Title               string       `json:"title"`
	Content             string       `json:"content,omitempty"` // Markdown or drawio XML
	Format              RecordFormat `json:"format"`
	ProjectID           *string      `json:"projectId,omitempty"`
	ProjectName         *string      `json:"projectName,omitempty"`
	GoalTag             *GoalTag     `json:"goalTag,omitempty"`
	RelatedTimeEntryIDs []string     `json:"relatedTimeEntryIds,omitempty"`
	FileURL             *string      `json:"fileUrl,omitempty"` // MinIO file URL (future use)
	CreatedAt           time.Time    `json:"createdAt"`
	UpdatedAt           time.Time    `json:"updatedAt"`
}

// LearningRecordListItem represents a learning record without content (for list response)
type LearningRecordListItem struct {
	ID                  string       `json:"id"`
	UserID              string       `json:"userId"`
	Title               string       `json:"title"`
	Format              RecordFormat `json:"format"`
	ProjectID           *string      `json:"projectId,omitempty"`
	ProjectName         *string      `json:"projectName,omitempty"`
	GoalTag             *GoalTag     `json:"goalTag,omitempty"`
	RelatedTimeEntryIDs []string     `json:"relatedTimeEntryIds,omitempty"`
	FileURL             *string      `json:"fileUrl,omitempty"`
	CreatedAt           time.Time    `json:"createdAt"`
	UpdatedAt           time.Time    `json:"updatedAt"`
}

// ToListItem converts a LearningRecord to LearningRecordListItem (without content)
func (r *LearningRecord) ToListItem() *LearningRecordListItem {
	return &LearningRecordListItem{
		ID:                  r.ID,
		UserID:              r.UserID,
		Title:               r.Title,
		Format:              r.Format,
		ProjectID:           r.ProjectID,
		ProjectName:         r.ProjectName,
		GoalTag:             r.GoalTag,
		RelatedTimeEntryIDs: r.RelatedTimeEntryIDs,
		FileURL:             r.FileURL,
		CreatedAt:           r.CreatedAt,
		UpdatedAt:           r.UpdatedAt,
	}
}

// CreateRecordInput represents the input for creating a learning record
type CreateRecordInput struct {
	Title               string       `json:"title"`
	Content             string       `json:"content"`
	Format              RecordFormat `json:"format"`
	ProjectID           *string      `json:"projectId,omitempty"`
	ProjectName         *string      `json:"projectName,omitempty"`
	GoalTag             *GoalTag     `json:"goalTag,omitempty"`
	RelatedTimeEntryIDs []string     `json:"relatedTimeEntryIds,omitempty"`
	FileURL             *string      `json:"fileUrl,omitempty"`
}

// UpdateRecordInput represents the input for updating a learning record
type UpdateRecordInput struct {
	Title               *string       `json:"title,omitempty"`
	Content             *string       `json:"content,omitempty"`
	Format              *RecordFormat `json:"format,omitempty"`
	ProjectID           *string       `json:"projectId,omitempty"`
	ProjectName         *string       `json:"projectName,omitempty"`
	GoalTag             *GoalTag      `json:"goalTag,omitempty"`
	RelatedTimeEntryIDs []string      `json:"relatedTimeEntryIds,omitempty"`
	FileURL             *string       `json:"fileUrl,omitempty"`
}

// RecordFilter represents filters for listing learning records
type RecordFilter struct {
	ProjectID *string
	GoalTag   *GoalTag
	Format    *RecordFormat
	Query     *string // For full-text search on title and content
}

// SemanticSearchInput represents the input for semantic search
type SemanticSearchInput struct {
	Query string `json:"query"`
	Limit int    `json:"limit,omitempty"`
}

// SemanticSearchResult represents a result from semantic search
type SemanticSearchResult struct {
	Record *LearningRecordListItem `json:"record"`
	Score  float64                 `json:"score"` // Relevance score
}
