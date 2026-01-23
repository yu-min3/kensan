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

// LearningRecord represents a learning record entity
type LearningRecord struct {
	ID                  string       `json:"id"`
	UserID              string       `json:"userId"`
	Title               string       `json:"title"`
	Content             string       `json:"content,omitempty"` // Markdown or drawio XML
	Format              RecordFormat `json:"format"`
	MilestoneID         *string      `json:"milestoneId,omitempty"`
	MilestoneName       *string      `json:"milestoneName,omitempty"`
	GoalID              *string      `json:"goalId,omitempty"`
	GoalName            *string      `json:"goalName,omitempty"`
	GoalColor           *string      `json:"goalColor,omitempty"`
	TagIDs              []string     `json:"tagIds,omitempty"`
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
	MilestoneID         *string      `json:"milestoneId,omitempty"`
	MilestoneName       *string      `json:"milestoneName,omitempty"`
	GoalID              *string      `json:"goalId,omitempty"`
	GoalName            *string      `json:"goalName,omitempty"`
	GoalColor           *string      `json:"goalColor,omitempty"`
	TagIDs              []string     `json:"tagIds,omitempty"`
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
		MilestoneID:         r.MilestoneID,
		MilestoneName:       r.MilestoneName,
		GoalID:              r.GoalID,
		GoalName:            r.GoalName,
		GoalColor:           r.GoalColor,
		TagIDs:              r.TagIDs,
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
	MilestoneID         *string      `json:"milestoneId,omitempty"`
	MilestoneName       *string      `json:"milestoneName,omitempty"`
	GoalID              *string      `json:"goalId,omitempty"`
	GoalName            *string      `json:"goalName,omitempty"`
	GoalColor           *string      `json:"goalColor,omitempty"`
	TagIDs              []string     `json:"tagIds,omitempty"`
	RelatedTimeEntryIDs []string     `json:"relatedTimeEntryIds,omitempty"`
	FileURL             *string      `json:"fileUrl,omitempty"`
}

// UpdateRecordInput represents the input for updating a learning record
type UpdateRecordInput struct {
	Title               *string       `json:"title,omitempty"`
	Content             *string       `json:"content,omitempty"`
	Format              *RecordFormat `json:"format,omitempty"`
	MilestoneID         *string       `json:"milestoneId,omitempty"`
	MilestoneName       *string       `json:"milestoneName,omitempty"`
	GoalID              *string       `json:"goalId,omitempty"`
	GoalName            *string       `json:"goalName,omitempty"`
	GoalColor           *string       `json:"goalColor,omitempty"`
	TagIDs              []string      `json:"tagIds,omitempty"`
	RelatedTimeEntryIDs []string      `json:"relatedTimeEntryIds,omitempty"`
	FileURL             *string       `json:"fileUrl,omitempty"`
}

// RecordFilter represents filters for listing learning records
type RecordFilter struct {
	GoalID      *string       // Filter by goal
	MilestoneID *string       // Filter by milestone
	Format      *RecordFormat // Filter by format
	Query       *string       // For full-text search on title and content
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
