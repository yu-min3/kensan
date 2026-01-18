// プロジェクト
export interface Project {
  id: string
  name: string
  goalTag?: GoalTag
  color?: string
  isArchived: boolean
}

// タスク
export interface Task {
  id: string
  name: string
  projectId: string
  parentTaskId?: string
  estimatedMinutes?: number
  completed: boolean
  dueDate?: string // YYYY-MM-DD
}

// 目標タグ
export type GoalTag = 'GK' | 'OSS' | 'Output' | 'Other'

export const goalTagColors: Record<GoalTag, string> = {
  GK: 'bg-yellow-500',
  OSS: 'bg-green-500',
  Output: 'bg-blue-500',
  Other: 'bg-gray-500',
}

export const goalTagLabels: Record<GoalTag, string> = {
  GK: 'Golden Kube',
  OSS: 'OSS',
  Output: 'Output',
  Other: 'Other',
}

// タイムブロック（計画）
export interface TimeBlock {
  id: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  taskId?: string
  taskName: string
  projectId?: string
  projectName?: string
  goalTag?: GoalTag
  isRoutine: boolean
  routineTaskId?: string
}

// 時間記録（実績）
export interface TimeEntry {
  id: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  taskId?: string
  taskName: string
  projectId?: string
  projectName?: string
  goalTag?: GoalTag
  description?: string
}

// 定期タスク
export type RoutineFrequency = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface RoutineTask {
  id: string
  name: string
  frequency: RoutineFrequency
  daysOfWeek?: number[] // 0-6 (日-土)
  estimatedMinutes: number
  enabled: boolean
}

// 学習記録
export type RecordFormat = 'markdown' | 'drawio'

export interface LearningRecord {
  id: string
  title: string
  content: string
  format: RecordFormat
  projectId?: string
  projectName?: string
  goalTag?: GoalTag
  relatedTimeEntryIds?: string[]
  createdAt: Date
  updatedAt: Date
}

// 日記
export interface DiaryEntry {
  id: string
  date: string // YYYY-MM-DD
  title: string
  content: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

// ユーザー設定
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

// 日次計画
export interface DailyPlan {
  date: string // YYYY-MM-DD
  timeBlocks: TimeBlock[]
  createdAt: Date
  updatedAt: Date
}

// 週次サマリー
export interface WeeklySummary {
  weekStart: string // YYYY-MM-DD
  weekEnd: string // YYYY-MM-DD
  totalMinutes: number
  byGoalTag: Record<GoalTag, number>
  byProject: Record<string, number>
  completedTasks: number
  plannedVsActual: {
    planned: number
    actual: number
  }
}

// AI振り返り
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
