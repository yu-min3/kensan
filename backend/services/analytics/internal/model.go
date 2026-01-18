package analytics

// GoalTag represents the type of goal for analytics
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

// WeeklyTargetMinutes returns the weekly target minutes for a goal tag
func (g GoalTag) WeeklyTargetMinutes() int {
	switch g {
	case GoalTagGK:
		return 1200 // 20 hours
	case GoalTagOSS:
		return 600 // 10 hours
	case GoalTagOutput:
		return 300 // 5 hours
	case GoalTagOther:
		return 300 // 5 hours
	default:
		return 0
	}
}

// AllGoalTags returns all valid goal tags
func AllGoalTags() []GoalTag {
	return []GoalTag{GoalTagGK, GoalTagOSS, GoalTagOutput, GoalTagOther}
}

// DailyBreakdown represents time spent on a single day
type DailyBreakdown struct {
	Date    string `json:"date"`
	Minutes int    `json:"minutes"`
}

// PlannedVsActual represents the comparison between planned and actual time
type PlannedVsActual struct {
	Planned int `json:"planned"`
	Actual  int `json:"actual"`
}

// WeeklySummary represents a weekly analytics summary
type WeeklySummary struct {
	WeekStart       string            `json:"weekStart"`
	WeekEnd         string            `json:"weekEnd"`
	TotalMinutes    int               `json:"totalMinutes"`
	ByGoalTag       map[string]int    `json:"byGoalTag"`
	ByProject       map[string]int    `json:"byProject"`
	CompletedTasks  int               `json:"completedTasks"`
	PlannedVsActual PlannedVsActual   `json:"plannedVsActual"`
	DailyBreakdown  []DailyBreakdown  `json:"dailyBreakdown"`
}

// MonthlySummary represents a monthly analytics summary
type MonthlySummary struct {
	Year            int               `json:"year"`
	Month           int               `json:"month"`
	TotalMinutes    int               `json:"totalMinutes"`
	ByGoalTag       map[string]int    `json:"byGoalTag"`
	ByProject       map[string]int    `json:"byProject"`
	CompletedTasks  int               `json:"completedTasks"`
	PlannedVsActual PlannedVsActual   `json:"plannedVsActual"`
	WeeklyBreakdown []DailyBreakdown  `json:"weeklyBreakdown"` // Reusing DailyBreakdown structure
}

// TrendDataPoint represents a single data point in trend analysis
type TrendDataPoint struct {
	StartDate    string `json:"startDate"`
	EndDate      string `json:"endDate"`
	TotalMinutes int    `json:"totalMinutes"`
}

// GoalProgress represents progress towards a goal
type GoalProgress struct {
	GoalTag              string  `json:"goalTag"`
	WeeklyTargetMinutes  int     `json:"weeklyTargetMinutes"`
	CurrentWeekMinutes   int     `json:"currentWeekMinutes"`
	Progress             float64 `json:"progress"`
	OnTrack              bool    `json:"onTrack"`
}

// TrendPeriod represents the period for trend analysis
type TrendPeriod string

const (
	TrendPeriodWeek    TrendPeriod = "week"
	TrendPeriodMonth   TrendPeriod = "month"
	TrendPeriodQuarter TrendPeriod = "quarter"
)

// IsValid checks if the trend period is valid
func (p TrendPeriod) IsValid() bool {
	switch p {
	case TrendPeriodWeek, TrendPeriodMonth, TrendPeriodQuarter:
		return true
	}
	return false
}

// WeeklySummaryFilter represents filters for getting weekly summary
type WeeklySummaryFilter struct {
	WeekStart string // YYYY-MM-DD format, should be a Monday
}

// MonthlySummaryFilter represents filters for getting monthly summary
type MonthlySummaryFilter struct {
	Year  int
	Month int
}

// TrendFilter represents filters for trend analysis
type TrendFilter struct {
	Period TrendPeriod
	Count  int
}

// GoalProgressFilter represents filters for goal progress
type GoalProgressFilter struct {
	GoalTag *GoalTag
}
