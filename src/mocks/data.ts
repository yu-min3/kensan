// Mock data for MSW handlers
// This data is mutable to allow CRUD operations in development

import type {
  Goal,
  Milestone,
  Tag,
  Task,
  TimeBlock,
  TimeEntry,
  Note,
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

// Helper to create UTC ISO datetime from local date (YYYY-MM-DD) and time (HH:mm) in Asia/Tokyo
function toUtcIso(localDate: string, localTime: string): string {
  const [year, month, day] = localDate.split('-').map(Number)
  const [hours, minutes] = localTime.split(':').map(Number)
  // Asia/Tokyo is UTC+9
  const localMs = Date.UTC(year, month - 1, day, hours, minutes, 0, 0)
  const utcMs = localMs - 9 * 60 * 60 * 1000
  return new Date(utcMs).toISOString()
}

// ============================================
// Goals (目標)
// ============================================
export let goals: Goal[] = [
  {
    id: 'goal-gk',
    name: 'Golden Kubestronaut',
    description: 'CNCF認定資格を全て取得する',
    color: '#0EA5E9',
    status: 'active',
    sortOrder: 0,
    createdAt: subDays(new Date(), 90),
    updatedAt: subDays(new Date(), 30),
  },
  {
    id: 'goal-oss',
    name: 'OSS活動',
    description: 'オープンソースプロジェクトへの貢献',
    color: '#10B981',
    status: 'active',
    sortOrder: 1,
    createdAt: subDays(new Date(), 60),
    updatedAt: subDays(new Date(), 7),
  },
  {
    id: 'goal-output',
    name: 'アウトプット',
    description: 'ブログ執筆やLT登壇',
    color: '#F59E0B',
    status: 'active',
    sortOrder: 2,
    createdAt: subDays(new Date(), 30),
    updatedAt: subDays(new Date(), 14),
  },
]

// ============================================
// Milestones (マイルストーン) - 旧Project
// ============================================
export let milestones: Milestone[] = [
  {
    id: 'ms-ica',
    goalId: 'goal-gk',
    name: 'ICA合格',
    description: 'Istio Certified Associate',
    targetDate: '2026-03-31',
    status: 'active',
    createdAt: subDays(new Date(), 60),
    updatedAt: subDays(new Date(), 7),
  },
  {
    id: 'ms-pca',
    goalId: 'goal-gk',
    name: 'PCA合格',
    description: 'Prometheus Certified Associate',
    targetDate: '2026-05-31',
    status: 'active',
    createdAt: subDays(new Date(), 45),
    updatedAt: subDays(new Date(), 14),
  },
  {
    id: 'ms-cca',
    goalId: 'goal-gk',
    name: 'CCA合格',
    description: 'Cilium Certified Associate',
    targetDate: '2026-07-31',
    status: 'active',
    createdAt: subDays(new Date(), 30),
    updatedAt: subDays(new Date(), 21),
  },
  {
    id: 'ms-kensan',
    goalId: 'goal-oss',
    name: 'Kensan MVP',
    description: 'Kensan v1.0リリース',
    targetDate: '2026-06-30',
    status: 'active',
    createdAt: subDays(new Date(), 30),
    updatedAt: subDays(new Date(), 1),
  },
  {
    id: 'ms-blog',
    goalId: 'goal-output',
    name: '技術ブログ月4本',
    description: '毎月4本のブログ記事を投稿',
    status: 'active',
    createdAt: subDays(new Date(), 14),
    updatedAt: subDays(new Date(), 7),
  },
]

// ============================================
// Tags (タグ) - 集計用
// ============================================
export let tags: Tag[] = [
  { id: 'tag-dev', name: '開発', color: '#8B5CF6', type: 'task', pinned: true, usageCount: 45, createdAt: subDays(new Date(), 90), updatedAt: subDays(new Date(), 1) },
  { id: 'tag-input', name: 'Input', color: '#06B6D4', type: 'task', pinned: true, usageCount: 32, createdAt: subDays(new Date(), 90), updatedAt: subDays(new Date(), 2) },
  { id: 'tag-exercise', name: '運動', color: '#EF4444', type: 'task', pinned: false, usageCount: 18, createdAt: subDays(new Date(), 90), updatedAt: subDays(new Date(), 5) },
  { id: 'tag-reading', name: '読書', color: '#84CC16', type: 'task', pinned: false, usageCount: 12, createdAt: subDays(new Date(), 90), updatedAt: subDays(new Date(), 3) },
  { id: 'tag-review', name: '振り返り', color: '#EC4899', type: 'task', pinned: true, usageCount: 8, createdAt: subDays(new Date(), 90), updatedAt: subDays(new Date(), 7) },
]

// ============================================
// Tasks (タスク)
// ============================================
export let tasks: Task[] = [
  // ICA関連タスク
  {
    id: 't1',
    name: 'ICA試験勉強',
    milestoneId: 'ms-ica',
    tagIds: ['tag-input'],
    completed: false,
    sortOrder: 0,
    createdAt: subDays(new Date(), 30),
    updatedAt: subDays(new Date(), 1),
  },
  {
    id: 't1-1',
    name: 'Traffic Management',
    milestoneId: 'ms-ica',
    parentTaskId: 't1',
    tagIds: ['tag-input'],
    completed: false,
    sortOrder: 0,
    createdAt: subDays(new Date(), 30),
    updatedAt: subDays(new Date(), 1),
  },
  {
    id: 't1-2',
    name: 'Security',
    milestoneId: 'ms-ica',
    parentTaskId: 't1',
    tagIds: ['tag-input'],
    completed: false,
    sortOrder: 1,
    createdAt: subDays(new Date(), 30),
    updatedAt: subDays(new Date(), 7),
  },
  {
    id: 't1-3',
    name: 'Observability',
    milestoneId: 'ms-ica',
    parentTaskId: 't1',
    tagIds: ['tag-input'],
    completed: false,
    sortOrder: 2,
    createdAt: subDays(new Date(), 30),
    updatedAt: subDays(new Date(), 14),
  },
  // PCA関連
  {
    id: 't2',
    name: 'PCA試験勉強',
    milestoneId: 'ms-pca',
    tagIds: ['tag-input'],
    completed: false,
    sortOrder: 0,
    createdAt: subDays(new Date(), 21),
    updatedAt: subDays(new Date(), 7),
  },
  // Kensan開発
  {
    id: 't4',
    name: 'フロントエンド開発',
    milestoneId: 'ms-kensan',
    tagIds: ['tag-dev'],
    completed: false,
    sortOrder: 0,
    createdAt: subDays(new Date(), 14),
    updatedAt: subDays(new Date(), 1),
  },
  {
    id: 't4-1',
    name: '画面設計',
    milestoneId: 'ms-kensan',
    parentTaskId: 't4',
    tagIds: ['tag-dev'],
    completed: true,
    sortOrder: 0,
    createdAt: subDays(new Date(), 14),
    updatedAt: subDays(new Date(), 7),
  },
  {
    id: 't4-2',
    name: 'コンポーネント実装',
    milestoneId: 'ms-kensan',
    parentTaskId: 't4',
    tagIds: ['tag-dev'],
    completed: false,
    sortOrder: 1,
    createdAt: subDays(new Date(), 7),
    updatedAt: subDays(new Date(), 1),
  },
  // ブログ
  {
    id: 't6',
    name: 'Istio記事執筆',
    milestoneId: 'ms-blog',
    tagIds: ['tag-dev'],
    completed: false,
    sortOrder: 0,
    createdAt: subDays(new Date(), 7),
    updatedAt: subDays(new Date(), 3),
  },
  // 目標なしタスク
  {
    id: 't-gym',
    name: 'ジム',
    tagIds: ['tag-exercise'],
    completed: false,
    sortOrder: 0,
    createdAt: subDays(new Date(), 30),
    updatedAt: subDays(new Date(), 1),
  },
  {
    id: 't-reading',
    name: '技術書読書',
    tagIds: ['tag-reading', 'tag-input'],
    completed: false,
    sortOrder: 1,
    createdAt: subDays(new Date(), 30),
    updatedAt: subDays(new Date(), 3),
  },
]

// ============================================
// Time blocks (計画)
// ============================================
export let timeBlocks: TimeBlock[] = [
  {
    id: 'tb1',
    startDatetime: toUtcIso(today, '09:00'),
    endDatetime: toUtcIso(today, '11:00'),
    taskId: 't1-1',
    taskName: 'ICA試験勉強 - Traffic Management',
    milestoneId: 'ms-ica',
    milestoneName: 'ICA合格',
    goalId: 'goal-gk',
    goalName: 'Golden Kubestronaut',
    goalColor: '#0EA5E9',
    tagIds: ['tag-input'],
  },
  {
    id: 'tb2',
    startDatetime: toUtcIso(today, '11:30'),
    endDatetime: toUtcIso(today, '14:30'),
    taskId: 't4-2',
    taskName: 'Kensan開発 - コンポーネント実装',
    milestoneId: 'ms-kensan',
    milestoneName: 'Kensan MVP',
    goalId: 'goal-oss',
    goalName: 'OSS活動',
    goalColor: '#10B981',
    tagIds: ['tag-dev'],
  },
  {
    id: 'tb3',
    startDatetime: toUtcIso(today, '15:00'),
    endDatetime: toUtcIso(today, '16:00'),
    taskId: 't6',
    taskName: 'ブログ記事執筆',
    milestoneId: 'ms-blog',
    milestoneName: '技術ブログ月4本',
    goalId: 'goal-output',
    goalName: 'アウトプット',
    goalColor: '#F59E0B',
    tagIds: ['tag-dev'],
  },
  // Tomorrow
  {
    id: 'tb-tm1',
    startDatetime: toUtcIso(tomorrow, '09:00'),
    endDatetime: toUtcIso(tomorrow, '11:00'),
    taskId: 't1-2',
    taskName: 'ICA試験勉強 - Security',
    milestoneId: 'ms-ica',
    milestoneName: 'ICA合格',
    goalId: 'goal-gk',
    goalName: 'Golden Kubestronaut',
    goalColor: '#0EA5E9',
    tagIds: ['tag-input'],
  },
]

// ============================================
// Time entries (実績)
// ============================================
export let timeEntries: TimeEntry[] = [
  // Yesterday
  {
    id: 'te1',
    startDatetime: toUtcIso(yesterday, '09:00'),
    endDatetime: toUtcIso(yesterday, '11:00'),
    taskId: 't1-1',
    taskName: 'ICA試験勉強 - Traffic Management',
    milestoneId: 'ms-ica',
    milestoneName: 'ICA合格',
    goalId: 'goal-gk',
    goalName: 'Golden Kubestronaut',
    goalColor: '#0EA5E9',
    tagIds: ['tag-input'],
  },
  {
    id: 'te2',
    startDatetime: toUtcIso(yesterday, '11:30'),
    endDatetime: toUtcIso(yesterday, '14:30'),
    taskId: 't4-2',
    taskName: 'Kensan開発 - コンポーネント実装',
    milestoneId: 'ms-kensan',
    milestoneName: 'Kensan MVP',
    goalId: 'goal-oss',
    goalName: 'OSS活動',
    goalColor: '#10B981',
    tagIds: ['tag-dev'],
  },
  {
    id: 'te3',
    startDatetime: toUtcIso(yesterday, '15:00'),
    endDatetime: toUtcIso(yesterday, '16:00'),
    taskId: 't6',
    taskName: 'ブログ記事執筆',
    milestoneId: 'ms-blog',
    milestoneName: '技術ブログ月4本',
    goalId: 'goal-output',
    goalName: 'アウトプット',
    goalColor: '#F59E0B',
    tagIds: ['tag-dev'],
  },
  {
    id: 'te4',
    startDatetime: toUtcIso(yesterday, '16:30'),
    endDatetime: toUtcIso(yesterday, '17:00'),
    taskId: 'r1',
    taskName: '技術ニュースチェック',
    tagIds: ['tag-input'],
  },
  {
    id: 'te5',
    startDatetime: toUtcIso(yesterday, '17:30'),
    endDatetime: toUtcIso(yesterday, '18:30'),
    taskName: '予定外MTG',
    description: '緊急の技術相談',
  },
  // Today
  {
    id: 'te-today-1',
    startDatetime: toUtcIso(today, '09:00'),
    endDatetime: toUtcIso(today, '11:00'),
    taskId: 't1-1',
    taskName: 'ICA試験勉強 - Traffic Management',
    milestoneId: 'ms-ica',
    milestoneName: 'ICA合格',
    goalId: 'goal-gk',
    goalName: 'Golden Kubestronaut',
    goalColor: '#0EA5E9',
    tagIds: ['tag-input'],
  },
  {
    id: 'te-today-2',
    startDatetime: toUtcIso(today, '11:30'),
    endDatetime: toUtcIso(today, '14:30'),
    taskId: 't4-2',
    taskName: 'Kensan開発 - コンポーネント実装',
    milestoneId: 'ms-kensan',
    milestoneName: 'Kensan MVP',
    goalId: 'goal-oss',
    goalName: 'OSS活動',
    goalColor: '#10B981',
    tagIds: ['tag-dev'],
  },
]

// ============================================
// Notes (統合ノート - 日記・学習記録)
// ============================================
export let notes: Note[] = [
  // Diary type notes
  {
    id: 'note-d1',
    userId: 'user-1',
    type: 'diary',
    title: '今日の振り返り',
    content: `# 今日の振り返り

## 達成したこと
- ICA勉強 Traffic Management 2時間
- Kensanの画面実装

## 明日やること
- Security分野の学習開始
`,
    format: 'markdown',
    date: today,
    goalId: 'goal-gk',
    goalName: 'Golden Kubestronaut',
    goalColor: '#0EA5E9',
    tagIds: ['tag-review'],
    archived: false,
    createdAt: new Date(today),
    updatedAt: new Date(today),
  },
  {
    id: 'note-d2',
    userId: 'user-1',
    type: 'diary',
    title: '学習記録',
    content: `# 昨日の記録

Istioの学習を継続。VirtualServiceの設定が理解できた。
`,
    format: 'markdown',
    date: yesterday,
    archived: false,
    createdAt: new Date(yesterday),
    updatedAt: new Date(yesterday),
  },
  // Learning type notes
  {
    id: 'note-lr1',
    userId: 'user-1',
    type: 'learning',
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
`,
    format: 'markdown',
    taskId: 't1-1',
    milestoneId: 'ms-ica',
    milestoneName: 'ICA合格',
    goalId: 'goal-gk',
    goalName: 'Golden Kubestronaut',
    goalColor: '#0EA5E9',
    tagIds: ['tag-input'],
    relatedTimeEntryIds: ['te1'],
    archived: false,
    createdAt: new Date(yesterday),
    updatedAt: new Date(yesterday),
  },
  {
    id: 'note-lr2',
    userId: 'user-1',
    type: 'learning',
    title: 'Kensan アーキテクチャ図',
    content: '[drawio content placeholder]',
    format: 'drawio',
    milestoneId: 'ms-kensan',
    milestoneName: 'Kensan MVP',
    goalId: 'goal-oss',
    goalName: 'OSS活動',
    goalColor: '#10B981',
    tagIds: ['tag-dev'],
    archived: false,
    createdAt: subDays(new Date(), 2),
    updatedAt: subDays(new Date(), 2),
  },
  // Additional learning notes
  {
    id: 'note-m1',
    userId: 'user-1',
    type: 'learning',
    title: '開発環境整備メモ',
    content: `買い物リスト:
- キーボード
- モニターアーム
- USBハブ`,
    format: 'markdown',
    archived: false,
    createdAt: subDays(new Date(), 1),
    updatedAt: subDays(new Date(), 1),
  },
  {
    id: 'note-m2',
    userId: 'user-1',
    type: 'learning',
    title: 'Kensanの新機能アイデア',
    content: `Kensanの新機能アイデア:
- AI要約機能
- ポモドーロタイマー連携
- GitHub連携`,
    format: 'markdown',
    milestoneId: 'ms-kensan',
    milestoneName: 'Kensan MVP',
    goalId: 'goal-oss',
    goalName: 'OSS活動',
    goalColor: '#10B981',
    tagIds: ['tag-dev'],
    archived: false,
    createdAt: subDays(new Date(), 3),
    updatedAt: subDays(new Date(), 2),
  },
]

// ============================================
// User settings (ユーザー設定)
// ============================================
export let userSettings: UserSettings = {
  timezone: 'Asia/Tokyo',
  theme: 'system',
  isConfigured: true,
  userName: 'Yu',
}

// ============================================
// AI review reports (AI振り返り)
// ============================================
export let aiReviewReports: AIReviewReport[] = [
  {
    id: 'ai1',
    weekStart: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    weekEnd: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    taskEvaluations: [
      { taskName: 'ICA模擬試験', status: 'good', comment: '計画通り3回完了。正答率78%→85%に改善。' },
      { taskName: 'Ciliumハンズオン', status: 'partial', comment: 'Lab 3まで完了。Lab 4-5は未着手。' },
    ],
    timeEvaluations: [
      { goalName: 'Golden Kubestronaut', goalColor: '#0EA5E9', actualMinutes: 1080, targetMinutes: 1200, comment: '月〜水に集中できた。' },
      { goalName: 'OSS活動', goalColor: '#10B981', actualMinutes: 300, targetMinutes: 300, comment: '目標通り。PR 2件マージ。' },
    ],
    learningSummary:
      '今週はKubernetesのネットワーキング層を中心に学習。CiliumのeBPFベースのデータプレーンの仕組みと、従来のiptablesベースとの違いを理解した。ICA試験ではTraffic Management問題の正答率が特に改善。',
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

// ============================================
// Weekly summary (週次サマリー)
// ============================================
export const weeklySummary: WeeklySummary = {
  weekStart: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
  weekEnd: today,
  totalMinutes: 32 * 60,
  byGoal: [
    { id: 'goal-gk', name: 'Golden Kubestronaut', color: '#0EA5E9', minutes: 18 * 60 },
    { id: 'goal-oss', name: 'OSS活動', color: '#10B981', minutes: 10 * 60 },
    { id: 'goal-output', name: 'アウトプット', color: '#F59E0B', minutes: 4 * 60 },
  ],
  byTag: [
    { id: 'tag-input', name: 'Input', color: '#06B6D4', minutes: 20 * 60 },
    { id: 'tag-dev', name: '開発', color: '#8B5CF6', minutes: 12 * 60 },
  ],
  byMilestone: [
    { id: 'ms-ica', name: 'ICA合格', goalId: 'goal-gk', minutes: 12 * 60 },
    { id: 'ms-kensan', name: 'Kensan MVP', goalId: 'goal-oss', minutes: 10 * 60 },
    { id: 'ms-pca', name: 'PCA合格', goalId: 'goal-gk', minutes: 6 * 60 },
    { id: 'ms-blog', name: '技術ブログ月4本', goalId: 'goal-output', minutes: 4 * 60 },
  ],
  completedTasks: 12,
  plannedVsActual: {
    planned: 35 * 60,
    actual: 32 * 60,
  },
}

// ============================================
// Daily study hours (チャート用)
// ============================================
const dayNames = ['日', '月', '火', '水', '木', '金', '土']
const getDayName = (d: Date) => dayNames[d.getDay()]

export const dailyStudyHours = [
  {
    date: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
    hours: 4,
    day: getDayName(subDays(new Date(), 6)),
    byGoal: [
      { id: 'goal-gk', name: 'Golden Kubestronaut', color: '#0EA5E9', minutes: 150 },
      { id: 'goal-oss', name: 'OSS活動', color: '#10B981', minutes: 60 },
      { id: 'goal-output', name: 'アウトプット', color: '#F59E0B', minutes: 30 },
    ],
  },
  {
    date: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
    hours: 5,
    day: getDayName(subDays(new Date(), 5)),
    byGoal: [
      { id: 'goal-gk', name: 'Golden Kubestronaut', color: '#0EA5E9', minutes: 180 },
      { id: 'goal-oss', name: 'OSS活動', color: '#10B981', minutes: 90 },
      { id: 'goal-output', name: 'アウトプット', color: '#F59E0B', minutes: 30 },
    ],
  },
  {
    date: format(subDays(new Date(), 4), 'yyyy-MM-dd'),
    hours: 6,
    day: getDayName(subDays(new Date(), 4)),
    byGoal: [
      { id: 'goal-gk', name: 'Golden Kubestronaut', color: '#0EA5E9', minutes: 180 },
      { id: 'goal-oss', name: 'OSS活動', color: '#10B981', minutes: 120 },
      { id: 'goal-output', name: 'アウトプット', color: '#F59E0B', minutes: 60 },
    ],
  },
  {
    date: format(subDays(new Date(), 3), 'yyyy-MM-dd'),
    hours: 5,
    day: getDayName(subDays(new Date(), 3)),
    byGoal: [
      { id: 'goal-gk', name: 'Golden Kubestronaut', color: '#0EA5E9', minutes: 120 },
      { id: 'goal-oss', name: 'OSS活動', color: '#10B981', minutes: 120 },
      { id: 'goal-output', name: 'アウトプット', color: '#F59E0B', minutes: 60 },
    ],
  },
  {
    date: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
    hours: 7,
    day: getDayName(subDays(new Date(), 2)),
    byGoal: [
      { id: 'goal-gk', name: 'Golden Kubestronaut', color: '#0EA5E9', minutes: 240 },
      { id: 'goal-oss', name: 'OSS活動', color: '#10B981', minutes: 120 },
      { id: 'goal-output', name: 'アウトプット', color: '#F59E0B', minutes: 60 },
    ],
  },
  {
    date: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    hours: 3,
    day: getDayName(subDays(new Date(), 1)),
    byGoal: [
      { id: 'goal-gk', name: 'Golden Kubestronaut', color: '#0EA5E9', minutes: 120 },
      { id: 'goal-oss', name: 'OSS活動', color: '#10B981', minutes: 30 },
      { id: 'goal-output', name: 'アウトプット', color: '#F59E0B', minutes: 30 },
    ],
  },
  {
    date: format(new Date(), 'yyyy-MM-dd'),
    hours: 2,
    day: getDayName(new Date()),
    byGoal: [
      { id: 'goal-gk', name: 'Golden Kubestronaut', color: '#0EA5E9', minutes: 60 },
      { id: 'goal-oss', name: 'OSS活動', color: '#10B981', minutes: 60 },
    ],
  },
]

// ============================================
// Memos (メモ)
// ============================================
export interface MockMemo {
  id: string
  userId: string
  content: string
  archived: boolean
  createdAt: Date
  updatedAt: Date
}

export let memos: MockMemo[] = [
  {
    id: 'memo-1',
    userId: 'user-1',
    content: 'ICA試験のTraffic Managementセクションを重点的に復習する',
    archived: false,
    createdAt: subDays(new Date(), 2),
    updatedAt: subDays(new Date(), 2),
  },
  {
    id: 'memo-2',
    userId: 'user-1',
    content: 'Kensanのタイムラインコンポーネントのリサイズ機能をテストする',
    archived: false,
    createdAt: subDays(new Date(), 1),
    updatedAt: subDays(new Date(), 1),
  },
  {
    id: 'memo-3',
    userId: 'user-1',
    content: '週末にブログ記事のドラフトを書く',
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'memo-4',
    userId: 'user-1',
    content: '古いメモ（アーカイブ済み）',
    archived: true,
    createdAt: subDays(new Date(), 10),
    updatedAt: subDays(new Date(), 5),
  },
]

// ============================================
// Helper functions
// ============================================
export const generateId = (prefix: string) => `${prefix}${Date.now()}`

// Goal/Milestone/Tag lookup helpers
export const findGoalById = (id: string) => goals.find(g => g.id === id)
export const findMilestoneById = (id: string) => milestones.find(m => m.id === id)
export const findTagById = (id: string) => tags.find(t => t.id === id)
export const findTagsByIds = (ids: string[]) => tags.filter(t => ids.includes(t.id))
