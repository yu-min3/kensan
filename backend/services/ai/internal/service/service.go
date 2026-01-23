package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/kensan/backend/services/ai/internal"
	"github.com/kensan/backend/services/ai/internal/repository"
	"github.com/kensan/backend/services/ai/internal/claude"
)

var (
	ErrReportNotFound    = errors.New("report not found")
	ErrInvalidInput      = errors.New("invalid input")
	ErrNoDataForPeriod   = errors.New("no data found for the specified period")
	ErrClaudeAPIFailed   = errors.New("Claude API request failed")
	ErrParseResponse     = errors.New("failed to parse Claude response")
)

// Service handles business logic for AI operations
type Service struct {
	repo   repository.Repository
	claude *claude.Client
}

// NewService creates a new AI service
func NewService(repo repository.Repository, claudeClient *claude.Client) *Service {
	return &Service{
		repo:   repo,
		claude: claudeClient,
	}
}

// GenerateReview generates a weekly review report
func (s *Service) GenerateReview(ctx context.Context, userID string, input ai.GenerateReviewInput) (*ai.AIReviewReport, error) {
	if input.WeekStart == "" || input.WeekEnd == "" {
		return nil, ErrInvalidInput
	}

	// Fetch time entries and learning records for the period
	timeEntries, err := s.repo.GetTimeEntriesForPeriod(ctx, userID, input.WeekStart, input.WeekEnd)
	if err != nil {
		return nil, fmt.Errorf("failed to get time entries: %w", err)
	}

	learningRecords, err := s.repo.GetLearningRecordsForPeriod(ctx, userID, input.WeekStart, input.WeekEnd)
	if err != nil {
		return nil, fmt.Errorf("failed to get learning records: %w", err)
	}

	if len(timeEntries) == 0 && len(learningRecords) == 0 {
		return nil, ErrNoDataForPeriod
	}

	// Build the prompt
	prompt := s.buildReviewPrompt(timeEntries, learningRecords, input.WeekStart, input.WeekEnd)

	// Call Claude API
	messages := []claude.Message{
		{
			Role:    "user",
			Content: prompt,
		},
	}

	systemPrompt := `あなたは優秀なエンジニアリングコーチです。ユーザーの1週間の活動データを分析し、建設的なフィードバックを提供してください。

回答は必ず以下のJSON形式で返してください。それ以外のテキストは含めないでください:
{
  "summary": "1週間の活動の概要（2-3文）",
  "goodPoints": ["良かった点1", "良かった点2", "良かった点3"],
  "improvementPoints": ["改善点1", "改善点2"],
  "advice": ["具体的なアドバイス1", "具体的なアドバイス2", "具体的なアドバイス3"]
}

注意:
- goodPoints, improvementPoints, advice は必ず配列として返してください
- 日本語で回答してください
- 具体的で実践的なアドバイスを心がけてください`

	response, err := s.claude.CreateMessage(ctx, messages, systemPrompt)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrClaudeAPIFailed, err)
	}

	// Parse the response
	responseText := response.GetText()
	parsedResponse, err := s.parseReviewResponse(responseText)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrParseResponse, err)
	}

	// Create the report
	report := &ai.AIReviewReport{
		UserID:            userID,
		WeekStart:         input.WeekStart,
		WeekEnd:           input.WeekEnd,
		Summary:           parsedResponse.Summary,
		GoodPoints:        parsedResponse.GoodPoints,
		ImprovementPoints: parsedResponse.ImprovementPoints,
		Advice:            parsedResponse.Advice,
		TokensUsed: ai.TokensUsed{
			Input:  response.Usage.InputTokens,
			Output: response.Usage.OutputTokens,
		},
	}

	// Save the report
	if err := s.repo.CreateReport(ctx, report); err != nil {
		return nil, fmt.Errorf("failed to save report: %w", err)
	}

	return report, nil
}

// GetReview retrieves a review report by ID
func (s *Service) GetReview(ctx context.Context, userID, reportID string) (*ai.AIReviewReport, error) {
	report, err := s.repo.GetReportByID(ctx, userID, reportID)
	if err != nil {
		return nil, err
	}

	if report == nil {
		return nil, ErrReportNotFound
	}

	return report, nil
}

// ListReviews returns all reviews for a user with optional filters
func (s *Service) ListReviews(ctx context.Context, userID string, filter ai.ReviewFilter) ([]ai.AIReviewReport, error) {
	reports, err := s.repo.ListReports(ctx, userID, filter)
	if err != nil {
		return nil, err
	}

	if reports == nil {
		return []ai.AIReviewReport{}, nil
	}

	return reports, nil
}

// Ask handles a general question to the AI
func (s *Service) Ask(ctx context.Context, userID string, input ai.AskInput) (*ai.AskResponse, error) {
	if input.Question == "" {
		return nil, ErrInvalidInput
	}

	prompt := input.Question
	if input.Context != "" {
		prompt = fmt.Sprintf("コンテキスト:\n%s\n\n質問:\n%s", input.Context, input.Question)
	}

	messages := []claude.Message{
		{
			Role:    "user",
			Content: prompt,
		},
	}

	systemPrompt := `あなたはKensanアプリのAIアシスタントです。ユーザーの生産性向上、時間管理、学習に関する質問に親切に回答してください。

回答は必ず以下のJSON形式で返してください:
{
  "answer": "質問への回答",
  "suggestions": ["関連する提案1", "関連する提案2"]
}

注意:
- 日本語で回答してください
- 実践的で具体的なアドバイスを心がけてください
- suggestionsは0〜3個程度にしてください`

	response, err := s.claude.CreateMessage(ctx, messages, systemPrompt)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrClaudeAPIFailed, err)
	}

	responseText := response.GetText()
	askResponse, err := s.parseAskResponse(responseText)
	if err != nil {
		// If parsing fails, return the raw text as the answer
		return &ai.AskResponse{
			Answer:      responseText,
			Suggestions: []string{},
			TokensUsed: ai.TokensUsed{
				Input:  response.Usage.InputTokens,
				Output: response.Usage.OutputTokens,
			},
		}, nil
	}

	askResponse.TokensUsed = ai.TokensUsed{
		Input:  response.Usage.InputTokens,
		Output: response.Usage.OutputTokens,
	}

	return askResponse, nil
}

func (s *Service) buildReviewPrompt(timeEntries []ai.TimeEntryData, learningRecords []ai.LearningRecordData, weekStart, weekEnd string) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("以下は %s から %s までの1週間の活動データです。\n\n", weekStart, weekEnd))

	if len(timeEntries) > 0 {
		sb.WriteString("## 作業時間記録\n")
		for _, entry := range timeEntries {
			sb.WriteString(fmt.Sprintf("- [%s] %s: %s (%s)\n",
				entry.StartTime.Format("2006-01-02 15:04"),
				entry.ProjectName,
				entry.Description,
				entry.Duration,
			))
		}
		sb.WriteString("\n")
	}

	if len(learningRecords) > 0 {
		sb.WriteString("## 学習記録\n")
		for _, record := range learningRecords {
			tagStr := ""
			if record.GoalName != "" {
				tagStr = fmt.Sprintf(" [目標: %s]", record.GoalName)
			}
			if record.MilestoneName != "" {
				tagStr += fmt.Sprintf(" [マイルストーン: %s]", record.MilestoneName)
			}
			// Truncate content if too long
			content := record.Content
			if len(content) > 500 {
				content = content[:500] + "..."
			}
			sb.WriteString(fmt.Sprintf("### %s%s\n%s\n\n", record.Title, tagStr, content))
		}
	}

	sb.WriteString("\nこの1週間の活動を分析し、振り返りレポートを作成してください。")

	return sb.String()
}

func (s *Service) parseReviewResponse(responseText string) (*ai.ParsedReviewResponse, error) {
	// Try to extract JSON from the response
	responseText = strings.TrimSpace(responseText)

	// Handle case where response is wrapped in markdown code blocks
	if strings.HasPrefix(responseText, "```json") {
		responseText = strings.TrimPrefix(responseText, "```json")
		responseText = strings.TrimSuffix(responseText, "```")
		responseText = strings.TrimSpace(responseText)
	} else if strings.HasPrefix(responseText, "```") {
		responseText = strings.TrimPrefix(responseText, "```")
		responseText = strings.TrimSuffix(responseText, "```")
		responseText = strings.TrimSpace(responseText)
	}

	var parsed ai.ParsedReviewResponse
	if err := json.Unmarshal([]byte(responseText), &parsed); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	// Ensure arrays are not nil
	if parsed.GoodPoints == nil {
		parsed.GoodPoints = []string{}
	}
	if parsed.ImprovementPoints == nil {
		parsed.ImprovementPoints = []string{}
	}
	if parsed.Advice == nil {
		parsed.Advice = []string{}
	}

	return &parsed, nil
}

func (s *Service) parseAskResponse(responseText string) (*ai.AskResponse, error) {
	responseText = strings.TrimSpace(responseText)

	// Handle markdown code blocks
	if strings.HasPrefix(responseText, "```json") {
		responseText = strings.TrimPrefix(responseText, "```json")
		responseText = strings.TrimSuffix(responseText, "```")
		responseText = strings.TrimSpace(responseText)
	} else if strings.HasPrefix(responseText, "```") {
		responseText = strings.TrimPrefix(responseText, "```")
		responseText = strings.TrimSuffix(responseText, "```")
		responseText = strings.TrimSpace(responseText)
	}

	var parsed struct {
		Answer      string   `json:"answer"`
		Suggestions []string `json:"suggestions"`
	}

	if err := json.Unmarshal([]byte(responseText), &parsed); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	if parsed.Suggestions == nil {
		parsed.Suggestions = []string{}
	}

	return &ai.AskResponse{
		Answer:      parsed.Answer,
		Suggestions: parsed.Suggestions,
	}, nil
}
