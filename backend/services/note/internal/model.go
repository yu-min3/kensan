package note

import (
	"time"
)

// NoteType represents the type of note
type NoteType string

const (
	NoteTypeDiary    NoteType = "diary"
	NoteTypeLearning NoteType = "learning"
	NoteTypeMemo     NoteType = "memo"
)

// IsValid checks if the note type is valid
func (t NoteType) IsValid() bool {
	switch t {
	case NoteTypeDiary, NoteTypeLearning, NoteTypeMemo:
		return true
	}
	return false
}

// NoteFormat represents the format of note content
type NoteFormat string

const (
	NoteFormatMarkdown NoteFormat = "markdown"
	NoteFormatDrawio   NoteFormat = "drawio"
)

// IsValid checks if the note format is valid
func (f NoteFormat) IsValid() bool {
	switch f {
	case NoteFormatMarkdown, NoteFormatDrawio:
		return true
	}
	return false
}

// Note represents a unified note entity (diary, learning record, memo)
type Note struct {
	ID                  string     `json:"id"`
	UserID              string     `json:"userId"`
	Type                NoteType   `json:"type"`
	Title               *string    `json:"title,omitempty"`
	Content             string     `json:"content"`
	Format              NoteFormat `json:"format"`
	Date                *string    `json:"date,omitempty"` // YYYY-MM-DD
	TaskID              *string    `json:"taskId,omitempty"`
	MilestoneID         *string    `json:"milestoneId,omitempty"`
	MilestoneName       *string    `json:"milestoneName,omitempty"`
	GoalID              *string    `json:"goalId,omitempty"`
	GoalName            *string    `json:"goalName,omitempty"`
	GoalColor           *string    `json:"goalColor,omitempty"`
	TagIDs              []string   `json:"tagIds,omitempty"`
	RelatedTimeEntryIDs []string   `json:"relatedTimeEntryIds,omitempty"`
	FileURL             *string    `json:"fileUrl,omitempty"`
	Archived            bool       `json:"archived"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedAt           time.Time  `json:"updatedAt"`
}

// NoteListItem represents a note without content (for list response)
type NoteListItem struct {
	ID                  string     `json:"id"`
	UserID              string     `json:"userId"`
	Type                NoteType   `json:"type"`
	Title               *string    `json:"title,omitempty"`
	Format              NoteFormat `json:"format"`
	Date                *string    `json:"date,omitempty"`
	TaskID              *string    `json:"taskId,omitempty"`
	MilestoneID         *string    `json:"milestoneId,omitempty"`
	MilestoneName       *string    `json:"milestoneName,omitempty"`
	GoalID              *string    `json:"goalId,omitempty"`
	GoalName            *string    `json:"goalName,omitempty"`
	GoalColor           *string    `json:"goalColor,omitempty"`
	TagIDs              []string   `json:"tagIds,omitempty"`
	RelatedTimeEntryIDs []string   `json:"relatedTimeEntryIds,omitempty"`
	FileURL             *string    `json:"fileUrl,omitempty"`
	Archived            bool       `json:"archived"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedAt           time.Time  `json:"updatedAt"`
}

// ToListItem converts a Note to NoteListItem (without content)
func (n *Note) ToListItem() *NoteListItem {
	return &NoteListItem{
		ID:                  n.ID,
		UserID:              n.UserID,
		Type:                n.Type,
		Title:               n.Title,
		Format:              n.Format,
		Date:                n.Date,
		TaskID:              n.TaskID,
		MilestoneID:         n.MilestoneID,
		MilestoneName:       n.MilestoneName,
		GoalID:              n.GoalID,
		GoalName:            n.GoalName,
		GoalColor:           n.GoalColor,
		TagIDs:              n.TagIDs,
		RelatedTimeEntryIDs: n.RelatedTimeEntryIDs,
		FileURL:             n.FileURL,
		Archived:            n.Archived,
		CreatedAt:           n.CreatedAt,
		UpdatedAt:           n.UpdatedAt,
	}
}

// CreateNoteInput represents the input for creating a note
type CreateNoteInput struct {
	Type                NoteType   `json:"type"`
	Title               *string    `json:"title,omitempty"`
	Content             string     `json:"content"`
	Format              NoteFormat `json:"format"`
	Date                *string    `json:"date,omitempty"`
	TaskID              *string    `json:"taskId,omitempty"`
	MilestoneID         *string    `json:"milestoneId,omitempty"`
	MilestoneName       *string    `json:"milestoneName,omitempty"`
	GoalID              *string    `json:"goalId,omitempty"`
	GoalName            *string    `json:"goalName,omitempty"`
	GoalColor           *string    `json:"goalColor,omitempty"`
	TagIDs              []string   `json:"tagIds,omitempty"`
	RelatedTimeEntryIDs []string   `json:"relatedTimeEntryIds,omitempty"`
	FileURL             *string    `json:"fileUrl,omitempty"`
}

// UpdateNoteInput represents the input for updating a note
type UpdateNoteInput struct {
	Title               *string     `json:"title,omitempty"`
	Content             *string     `json:"content,omitempty"`
	Format              *NoteFormat `json:"format,omitempty"`
	Date                *string     `json:"date,omitempty"`
	TaskID              *string     `json:"taskId,omitempty"`
	MilestoneID         *string     `json:"milestoneId,omitempty"`
	MilestoneName       *string     `json:"milestoneName,omitempty"`
	GoalID              *string     `json:"goalId,omitempty"`
	GoalName            *string     `json:"goalName,omitempty"`
	GoalColor           *string     `json:"goalColor,omitempty"`
	TagIDs              []string    `json:"tagIds,omitempty"`
	RelatedTimeEntryIDs []string    `json:"relatedTimeEntryIds,omitempty"`
	FileURL             *string     `json:"fileUrl,omitempty"`
	Archived            *bool       `json:"archived,omitempty"`
}

// NoteFilter represents filters for listing notes
type NoteFilter struct {
	Types       []NoteType  // Filter by types
	GoalID      *string     // Filter by goal
	MilestoneID *string     // Filter by milestone
	TaskID      *string     // Filter by task
	TagIDs      []string    // Filter by tags (AND condition)
	DateFrom    *string     // Filter by date range start (YYYY-MM-DD)
	DateTo      *string     // Filter by date range end (YYYY-MM-DD)
	Archived    *bool       // Filter by archived status
	Format      *NoteFormat // Filter by format
	Query       *string     // For full-text search on title and content
}

// SearchResult represents a result from search
type SearchResult struct {
	Note  *NoteListItem `json:"note"`
	Score float64       `json:"score"` // Relevance score
}
