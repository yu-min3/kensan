// Mock data for MSW handlers
// This data is mutable to allow CRUD operations in development

import type {
  Project,
  Task,
  TimeBlock,
  TimeEntry,
  RoutineTask,
  LearningRecord,
  DiaryEntry,
  UserSettings,
  AIReviewReport,
  WeeklySummary,
} from '@/types'
import { format, subDays, addDays } from 'date-fns'

// Helper functions for date calculations
export const getToday = () => format(new Date(), 'yyyy-MM-dd')
export const getYesterday = () => format(subDays(new Date(), 1), 'yyyy-MM-dd')
export const getTomorrow = () => format(addDays(new Date(), 1), 'yyyy-MM-dd')

const today = getToday()
const yesterday = getYesterday()
const tomorrow = getTomorrow()

// Projects
export let projects: Project[] = [
  { id: 'p1', name: 'Certification', goalTag: 'GK', color: '#ecc94b', isArchived: false },
  { id: 'p2', name: 'Kensan', goalTag: 'OSS', color: '#48bb78', isArchived: false },
  { id: 'p3', name: 'ブログ執筆', goalTag: 'Output', color: '#4299e1', isArchived: false },
  { id: 'p4', name: '読書', goalTag: 'Other', color: '#a0aec0', isArchived: false },
]

// Tasks
export let tasks: Task[] = [
  // Certification
  { id: 't1', name: 'ICA試験勉強', projectId: 'p1', completed: false },
  { id: 't1-1', name: 'Traffic Management', projectId: 'p1', parentTaskId: 't1', completed: false },
  { id: 't1-2', name: 'Security', projectId: 'p1', parentTaskId: 't1', completed: false },
  { id: 't1-3', name: 'Observability', projectId: 'p1', parentTaskId: 't1', completed: false },
  { id: 't2', name: 'PCA試験勉強', projectId: 'p1', completed: false },
  { id: 't2-1', name: 'PromQL', projectId: 'p1', parentTaskId: 't2', completed: false },
  { id: 't2-2', name: 'Alerting', projectId: 'p1', parentTaskId: 't2', completed: false },
  { id: 't3', name: 'CCA試験勉強', projectId: 'p1', completed: false },
  // Kensan
  { id: 't4', name: 'フロントエンド開発', projectId: 'p2', completed: false },
  { id: 't4-1', name: '画面設計', projectId: 'p2', parentTaskId: 't4', completed: true },
  { id: 't4-2', name: 'コンポーネント実装', projectId: 'p2', parentTaskId: 't4', completed: false },
  { id: 't4-3', name: 'Clockify連携', projectId: 'p2', parentTaskId: 't4', completed: false },
  { id: 't5', name: 'バックエンド開発', projectId: 'p2', completed: false },
  // Blog
  { id: 't6', name: 'Istio記事執筆', projectId: 'p3', completed: false },
  { id: 't7', name: 'Cilium記事執筆', projectId: 'p3', completed: false },
]

// Time blocks (plans)
export let timeBlocks: TimeBlock[] = [
  {
    id: 'tb1',
    date: today,
    startTime: '09:00',
    endTime: '11:00',
    taskId: 't1-1',
    taskName: 'ICA試験勉強 - Traffic Management',
    projectId: 'p1',
    projectName: 'Certification',
    goalTag: 'GK',
    isRoutine: false,
  },
  {
    id: 'tb2',
    date: today,
    startTime: '11:30',
    endTime: '14:30',
    taskId: 't4-2',
    taskName: 'Kensan開発 - コンポーネント実装',
    projectId: 'p2',
    projectName: 'Kensan',
    goalTag: 'OSS',
    isRoutine: false,
  },
  {
    id: 'tb3',
    date: today,
    startTime: '15:00',
    endTime: '16:00',
    taskId: 't6',
    taskName: 'ブログ記事執筆',
    projectId: 'p3',
    projectName: 'ブログ執筆',
    goalTag: 'Output',
    isRoutine: false,
  },
  {
    id: 'tb4',
    date: today,
    startTime: '16:30',
    endTime: '16:45',
    taskId: 'r1',
    taskName: '技術ニュースチェック',
    goalTag: 'Other',
    isRoutine: true,
    routineTaskId: 'r1',
  },
  {
    id: 'tb5',
    date: today,
    startTime: '17:00',
    endTime: '17:30',
    taskId: 'r2',
    taskName: '英語学習',
    goalTag: 'Other',
    isRoutine: true,
    routineTaskId: 'r2',
  },
  // Tomorrow's blocks
  {
    id: 'tb-tm1',
    date: tomorrow,
    startTime: '09:00',
    endTime: '11:00',
    taskId: 't1-2',
    taskName: 'ICA試験勉強 - Security',
    projectId: 'p1',
    projectName: 'Certification',
    goalTag: 'GK',
    isRoutine: false,
  },
]

// Time entries (actuals from Clockify)
export let timeEntries: TimeEntry[] = [
  // Yesterday's entries
  {
    id: 'te1',
    date: yesterday,
    startTime: '09:00',
    endTime: '11:00',
    taskId: 't1-1',
    taskName: 'ICA試験勉強 - Traffic Management',
    projectId: 'p1',
    projectName: 'Certification',
    goalTag: 'GK',
  },
  {
    id: 'te2',
    date: yesterday,
    startTime: '11:30',
    endTime: '14:30',
    taskId: 't4-2',
    taskName: 'Kensan開発 - コンポーネント実装',
    projectId: 'p2',
    projectName: 'Kensan',
    goalTag: 'OSS',
  },
  {
    id: 'te3',
    date: yesterday,
    startTime: '15:00',
    endTime: '16:00',
    taskId: 't6',
    taskName: 'ブログ記事執筆',
    projectId: 'p3',
    projectName: 'ブログ執筆',
    goalTag: 'Output',
  },
  {
    id: 'te4',
    date: yesterday,
    startTime: '16:30',
    endTime: '17:00',
    taskId: 'r1',
    taskName: '技術ニュースチェック',
    goalTag: 'Other',
  },
  {
    id: 'te5',
    date: yesterday,
    startTime: '17:30',
    endTime: '18:30',
    taskName: '予定外MTG',
    goalTag: 'Other',
    description: '緊急の技術相談',
  },
  // Today's partial entries
  {
    id: 'te-today-1',
    date: today,
    startTime: '09:00',
    endTime: '11:00',
    taskId: 't1-1',
    taskName: 'ICA試験勉強 - Traffic Management',
    projectId: 'p1',
    projectName: 'Certification',
    goalTag: 'GK',
  },
  {
    id: 'te-today-2',
    date: today,
    startTime: '11:30',
    endTime: '14:30',
    taskId: 't4-2',
    taskName: 'Kensan開発 - コンポーネント実装',
    projectId: 'p2',
    projectName: 'Kensan',
    goalTag: 'OSS',
  },
]

// Routine tasks
export let routineTasks: RoutineTask[] = [
  {
    id: 'r1',
    name: '技術ニュースチェック',
    frequency: 'daily',
    estimatedMinutes: 15,
    enabled: true,
  },
  {
    id: 'r2',
    name: '英語学習',
    frequency: 'daily',
    estimatedMinutes: 30,
    enabled: true,
  },
  {
    id: 'r3',
    name: '筋トレ',
    frequency: 'custom',
    daysOfWeek: [1, 3, 5],
    estimatedMinutes: 30,
    enabled: true,
  },
  {
    id: 'r4',
    name: '週次振り返り',
    frequency: 'weekly',
    daysOfWeek: [0],
    estimatedMinutes: 60,
    enabled: true,
  },
]

// Learning records
export let learningRecords: LearningRecord[] = [
  {
    id: 'lr1',
    title: 'Istio Traffic Management まとめ',
    content: `# Istio Traffic Management

## VirtualService

VirtualServiceは、Istioにおけるトラフィックルーティングの中核となるリソースである。

\`\`\`yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts:
  - reviews
  http:
  - match:
    - headers:
        end-user:
          exact: jason
    route:
    - destination:
        host: reviews
        subset: v2
  - route:
    - destination:
        host: reviews
        subset: v1
\`\`\`

## DestinationRule

DestinationRuleは、トラフィックが特定のサービスに到達した後のポリシーを定義する。

- サブセット定義
- ロードバランシング設定
- コネクションプール設定
- 外れ値検出設定
`,
    format: 'markdown',
    projectId: 'p1',
    projectName: 'Certification',
    goalTag: 'GK',
    relatedTimeEntryIds: ['te1'],
    createdAt: new Date(yesterday),
    updatedAt: new Date(yesterday),
  },
  {
    id: 'lr2',
    title: 'Kensan アーキテクチャ図',
    content: '[drawio content placeholder]',
    format: 'drawio',
    projectId: 'p2',
    projectName: 'Kensan',
    goalTag: 'OSS',
    createdAt: subDays(new Date(), 2),
    updatedAt: subDays(new Date(), 2),
  },
  {
    id: 'lr3',
    title: 'Cilium eBPF 動作原理',
    content: `# Cilium eBPF 動作原理

## eBPFとは

eBPF (extended Berkeley Packet Filter) は、Linuxカーネル内でサンドボックス化されたプログラムを実行するための技術。

## XDP (eXpress Data Path)

- ネットワークドライバの直後でパケット処理
- 高速なパケット処理を実現
- ドロップ、転送、リダイレクト、通常処理への受け渡しが可能

## TC (Traffic Control)

- より高レベルなパケット処理
- L7ポリシーの適用が可能
`,
    format: 'markdown',
    projectId: 'p1',
    projectName: 'Certification',
    goalTag: 'GK',
    createdAt: subDays(new Date(), 3),
    updatedAt: subDays(new Date(), 3),
  },
  {
    id: 'lr4',
    title: 'Prometheus PromQL基礎',
    content: `# Prometheus PromQL基礎

## 基本的なクエリ

### インスタントベクター
\`\`\`
http_requests_total{job="api-server"}
\`\`\`

### レンジベクター
\`\`\`
http_requests_total{job="api-server"}[5m]
\`\`\`

## 集約関数

- sum() - 合計
- avg() - 平均
- rate() - 増加率
- increase() - 増加量
`,
    format: 'markdown',
    projectId: 'p1',
    projectName: 'Certification',
    goalTag: 'GK',
    createdAt: subDays(new Date(), 5),
    updatedAt: subDays(new Date(), 5),
  },
]

// Diary entries
export let diaryEntries: DiaryEntry[] = [
  {
    id: 'd1',
    date: today,
    title: '新年の抱負と計画',
    content: `# 新年の抱負と計画

2025年の目標を整理した。

## 技術目標
- Golden Kubestronaut 完走
- Kensanを完成させてOSS公開
- 技術ブログ月2本

## プライベート
- 家族との時間を大切に
- 健康管理（週3運動）

今年も頑張ろう。
`,
    tags: ['振り返り', '目標'],
    createdAt: new Date(today),
    updatedAt: new Date(today),
  },
  {
    id: 'd2',
    date: yesterday,
    title: '育児と学習の両立について',
    content: `# 育児と学習の両立について

最近、子どもが夜泣きで睡眠時間が減っている。
それでも少しずつ学習時間を確保できているのは、タイムブロック管理のおかげ。

朝の時間を有効活用することが大事だと実感した。
`,
    tags: ['育児', '日常'],
    createdAt: new Date(yesterday),
    updatedAt: new Date(yesterday),
  },
]

// User settings
export let userSettings: UserSettings = {
  clockifyApiKey: 'mock-api-key-xxxxx',
  workspaceId: 'ws-12345',
  workspaceName: 'Personal Workspace',
  timezone: 'Asia/Tokyo',
  theme: 'system',
  isConfigured: true,
  userName: 'Yu',
}

// AI review reports
export let aiReviewReports: AIReviewReport[] = [
  {
    id: 'ai1',
    weekStart: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    weekEnd: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    summary:
      '今週は合計32時間の学習を達成しました。Golden Kubestronaut目標に対して、ICA試験勉強に重点的に取り組み、Traffic Managementの理解が深まりました。',
    goodPoints: [
      'ICA勉強を計画通り18時間実施',
      'Kensanの画面設計が完了',
      '毎日の定期タスクを90%達成',
    ],
    improvementPoints: [
      'ブログ執筆が2回先送りになった',
      '週後半に学習時間が減少傾向',
    ],
    advice: [
      'ブログ執筆は朝の集中時間に固定してみては？',
      'ICAは残り2週間、Security分野に注力を',
      '週後半の疲れに備えて、木曜に軽めのタスクを配置することを検討',
    ],
    createdAt: subDays(new Date(), 1),
  },
]

// Weekly summary
export const weeklySummary: WeeklySummary = {
  weekStart: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
  weekEnd: today,
  totalMinutes: 32 * 60,
  byGoalTag: {
    GK: 18 * 60,
    OSS: 10 * 60,
    Output: 4 * 60,
    Other: 0,
  },
  byProject: {
    Certification: 18 * 60,
    Kensan: 10 * 60,
    'ブログ執筆': 4 * 60,
  },
  completedTasks: 12,
  plannedVsActual: {
    planned: 35 * 60,
    actual: 32 * 60,
  },
}

// Daily study hours (for charts)
export const dailyStudyHours = [
  { date: format(subDays(new Date(), 6), 'M/d'), hours: 4, day: '月' },
  { date: format(subDays(new Date(), 5), 'M/d'), hours: 5, day: '火' },
  { date: format(subDays(new Date(), 4), 'M/d'), hours: 6, day: '水' },
  { date: format(subDays(new Date(), 3), 'M/d'), hours: 5, day: '木' },
  { date: format(subDays(new Date(), 2), 'M/d'), hours: 7, day: '金' },
  { date: format(subDays(new Date(), 1), 'M/d'), hours: 3, day: '土' },
  { date: format(new Date(), 'M/d'), hours: 2, day: '日' },
]

// Helper to generate unique IDs
export const generateId = (prefix: string) => `${prefix}${Date.now()}`
