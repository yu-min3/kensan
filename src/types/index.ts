// ============================================
// Goal (目標)
// ============================================
export interface Goal {
  id: string
  name: string
  description?: string
  color: string // Hex color, e.g., "#0EA5E9"
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================
// Milestone (マイルストーン) - 旧Project
// ============================================
export type MilestoneStatus = 'active' | 'completed' | 'archived'

export interface Milestone {
  id: string
  goalId: string // 親Goal
  name: string
  description?: string
  targetDate?: string // YYYY-MM-DD, 期限
  status: MilestoneStatus
  createdAt: Date
  updatedAt: Date
}

// ============================================
// Tag (タグ) - 集計用の自由タグ
// ============================================
export interface Tag {
  id: string
  name: string
  color: string // Hex color
  createdAt: Date
}

// ============================================
// Task (タスク)
// ============================================
export interface Task {
  id: string
  name: string
  milestoneId?: string // 任意（目標なしタスクも可）
  parentTaskId?: string
  tagIds?: string[] // 複数タグ
  estimatedMinutes?: number
  completed: boolean
  dueDate?: string // YYYY-MM-DD
  createdAt: Date
  updatedAt: Date
}

// ============================================
// TimeBlock (タイムブロック - 計画)
// ============================================
export interface TimeBlock {
  id: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  taskId?: string
  taskName: string
  // 非正規化フィールド（表示用）
  milestoneId?: string
  milestoneName?: string
  goalId?: string
  goalName?: string
  goalColor?: string
  tagIds?: string[]
  isRoutine: boolean
  routineTaskId?: string
}

// ============================================
// TimeEntry (時間記録 - 実績)
// ============================================
export interface TimeEntry {
  id: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  taskId?: string
  taskName: string
  // 非正規化フィールド（表示用）
  milestoneId?: string
  milestoneName?: string
  goalId?: string
  goalName?: string
  goalColor?: string
  tagIds?: string[]
  description?: string
}

// ============================================
// RoutineTask (定期タスク)
// ============================================
export type RoutineFrequency = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface RoutineTask {
  id: string
  name: string
  frequency: RoutineFrequency
  daysOfWeek?: number[] // 0-6 (日-土)
  estimatedMinutes: number
  tagIds?: string[]
  enabled: boolean
}

// ============================================
// LearningRecord (学習記録)
// ============================================
export type RecordFormat = 'markdown' | 'drawio'

export interface LearningRecord {
  id: string
  title: string
  content: string
  format: RecordFormat
  milestoneId?: string
  milestoneName?: string
  goalId?: string
  goalName?: string
  goalColor?: string
  tagIds?: string[]
  relatedTimeEntryIds?: string[]
  createdAt: Date
  updatedAt: Date
}

// ============================================
// DiaryEntry (日記)
// ============================================
export interface DiaryEntry {
  id: string
  date: string // YYYY-MM-DD
  title: string
  content: string
  tags: string[] // 自由テキストタグ（Tagエンティティとは別）
  createdAt: Date
  updatedAt: Date
}

// ============================================
// UserSettings (ユーザー設定)
// ============================================
export type Theme = 'light' | 'dark' | 'system'

export interface UserSettings {
  clockifyApiKey?: string
  workspaceId?: string
  workspaceName?: string
  timezone: string
  theme: Theme
  isConfigured: boolean
  userName: string
}

// ============================================
// DailyPlan (日次計画)
// ============================================
export interface DailyPlan {
  date: string // YYYY-MM-DD
  timeBlocks: TimeBlock[]
  createdAt: Date
  updatedAt: Date
}

// ============================================
// WeeklySummary (週次サマリー)
// ============================================
export interface GoalSummary {
  id: string
  name: string
  color: string
  minutes: number
}

export interface TagSummary {
  id: string
  name: string
  color: string
  minutes: number
}

export interface MilestoneSummary {
  id: string
  name: string
  goalId: string
  minutes: number
}

export interface WeeklySummary {
  weekStart: string // YYYY-MM-DD
  weekEnd: string // YYYY-MM-DD
  totalMinutes: number
  byGoal: GoalSummary[]
  byTag: TagSummary[]
  byMilestone: MilestoneSummary[]
  completedTasks: number
  plannedVsActual: {
    planned: number
    actual: number
  }
}

// ============================================
// AIReviewReport (AI振り返り)
// ============================================
export interface AIReviewReport {
  id: string
  weekStart: string
  weekEnd: string
  summary: string
  goodPoints: string[]
  improvementPoints: string[]
  advice: string[]
  createdAt: Date
}

// ============================================
// デフォルトカラーパレット
// ============================================
export const DEFAULT_COLORS = [
  '#0EA5E9', // Sky blue (Brand)
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
] as const

// ============================================
// 後方互換性のための型エイリアス (移行期間中)
// ============================================
/** @deprecated Use Goal instead */
export type GoalTag = 'GK' | 'OSS' | 'Output' | 'Other'

/** @deprecated Use Goal/Milestone instead */
export interface Project {
  id: string
  name: string
  goalTag?: GoalTag
  color?: string
  isArchived: boolean
}
