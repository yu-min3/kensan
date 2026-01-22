// Mock data for MSW handlers
// This data is mutable to allow CRUD operations in development

import type {
  Goal,
  Milestone,
  Tag,
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

// ============================================
// Goals (目標)
// ============================================
export let goals: Goal[] = [
  {
    id: 'goal-gk',
    name: 'Golden Kubestronaut',
    description: 'CNCF認定資格を全て取得する',
    color: '#0EA5E9',
    isArchived: false,
    createdAt: subDays(new Date(), 90),
    updatedAt: subDays(new Date(), 30),
  },
  {
    id: 'goal-oss',
    name: 'OSS活動',
    description: 'オープンソースプロジェクトへの貢献',
    color: '#10B981',
    isArchived: false,
    createdAt: subDays(new Date(), 60),
    updatedAt: subDays(new Date(), 7),
  },
  {
    id: 'goal-output',
    name: 'アウトプット',
    description: 'ブログ執筆やLT登壇',
    color: '#F59E0B',
    isArchived: false,
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
  { id: 'tag-dev', name: '開発', color: '#8B5CF6', createdAt: subDays(new Date(), 90) },
  { id: 'tag-input', name: 'Input', color: '#06B6D4', createdAt: subDays(new Date(), 90) },
  { id: 'tag-exercise', name: '運動', color: '#EF4444', createdAt: subDays(new Date(), 90) },
  { id: 'tag-reading', name: '読書', color: '#84CC16', createdAt: subDays(new Date(), 90) },
  { id: 'tag-review', name: '振り返り', color: '#EC4899', createdAt: subDays(new Date(), 90) },
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
    createdAt: subDays(new Date(), 7),
    updatedAt: subDays(new Date(), 3),
  },
  // 目標なしタスク
  {
    id: 't-gym',
    name: 'ジム',
    tagIds: ['tag-exercise'],
    completed: false,
    createdAt: subDays(new Date(), 30),
    updatedAt: subDays(new Date(), 1),
  },
  {
    id: 't-reading',
    name: '技術書読書',
    tagIds: ['tag-reading', 'tag-input'],
    completed: false,
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
    date: today,
    startTime: '09:00',
    endTime: '11:00',
    taskId: 't1-1',
    taskName: 'ICA試験勉強 - Traffic Management',
    milestoneId: 'ms-ica',
    milestoneName: 'ICA合格',
    goalId: 'goal-gk',
    goalName: 'Golden Kubestronaut',
    goalColor: '#0EA5E9',
    tagIds: ['tag-input'],
    isRoutine: false,
  },
  {
    id: 'tb2',
    date: today,
    startTime: '11:30',
    endTime: '14:30',
    taskId: 't4-2',
    taskName: 'Kensan開発 - コンポーネント実装',
    milestoneId: 'ms-kensan',
    milestoneName: 'Kensan MVP',
    goalId: 'goal-oss',
    goalName: 'OSS活動',
    goalColor: '#10B981',
    tagIds: ['tag-dev'],
    isRoutine: false,
  },
  {
    id: 'tb3',
    date: today,
    startTime: '15:00',
    endTime: '16:00',
    taskId: 't6',
    taskName: 'ブログ記事執筆',
    milestoneId: 'ms-blog',
    milestoneName: '技術ブログ月4本',
    goalId: 'goal-output',
    goalName: 'アウトプット',
    goalColor: '#F59E0B',
    tagIds: ['tag-dev'],
    isRoutine: false,
  },
  {
    id: 'tb4',
    date: today,
    startTime: '16:30',
    endTime: '16:45',
    taskId: 'r1',
    taskName: '技術ニュースチェック',
    tagIds: ['tag-input'],
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
    tagIds: ['tag-input'],
    isRoutine: true,
    routineTaskId: 'r2',
  },
  // Tomorrow
  {
    id: 'tb-tm1',
    date: tomorrow,
    startTime: '09:00',
    endTime: '11:00',
    taskId: 't1-2',
    taskName: 'ICA試験勉強 - Security',
    milestoneId: 'ms-ica',
    milestoneName: 'ICA合格',
    goalId: 'goal-gk',
    goalName: 'Golden Kubestronaut',
    goalColor: '#0EA5E9',
    tagIds: ['tag-input'],
    isRoutine: false,
  },
]

// ============================================
// Time entries (実績)
// ============================================
export let timeEntries: TimeEntry[] = [
  // Yesterday
  {
    id: 'te1',
    date: yesterday,
    startTime: '09:00',
    endTime: '11:00',
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
    date: yesterday,
    startTime: '11:30',
    endTime: '14:30',
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
    date: yesterday,
    startTime: '15:00',
    endTime: '16:00',
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
    date: yesterday,
    startTime: '16:30',
    endTime: '17:00',
    taskId: 'r1',
    taskName: '技術ニュースチェック',
    tagIds: ['tag-input'],
  },
  {
    id: 'te5',
    date: yesterday,
    startTime: '17:30',
    endTime: '18:30',
    taskName: '予定外MTG',
    description: '緊急の技術相談',
  },
  // Today
  {
    id: 'te-today-1',
    date: today,
    startTime: '09:00',
    endTime: '11:00',
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
    date: today,
    startTime: '11:30',
    endTime: '14:30',
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
// Routine tasks (定期タスク)
// ============================================
export let routineTasks: RoutineTask[] = [
  {
    id: 'r1',
    name: '技術ニュースチェック',
    frequency: 'daily',
    estimatedMinutes: 15,
    tagIds: ['tag-input'],
    enabled: true,
  },
  {
    id: 'r2',
    name: '英語学習',
    frequency: 'daily',
    estimatedMinutes: 30,
    tagIds: ['tag-input'],
    enabled: true,
  },
  {
    id: 'r3',
    name: '筋トレ',
    frequency: 'custom',
    daysOfWeek: [1, 3, 5],
    estimatedMinutes: 30,
    tagIds: ['tag-exercise'],
    enabled: true,
  },
  {
    id: 'r4',
    name: '週次振り返り',
    frequency: 'weekly',
    daysOfWeek: [0],
    estimatedMinutes: 60,
    tagIds: ['tag-review'],
    enabled: true,
  },
]

// ============================================
// Learning records (学習記録)
// ============================================
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
    milestoneId: 'ms-ica',
    milestoneName: 'ICA合格',
    goalId: 'goal-gk',
    goalName: 'Golden Kubestronaut',
    goalColor: '#0EA5E9',
    tagIds: ['tag-input'],
    relatedTimeEntryIds: ['te1'],
    createdAt: new Date(yesterday),
    updatedAt: new Date(yesterday),
  },
  {
    id: 'lr2',
    title: 'Kensan アーキテクチャ図',
    content: '[drawio content placeholder]',
    format: 'drawio',
    milestoneId: 'ms-kensan',
    milestoneName: 'Kensan MVP',
    goalId: 'goal-oss',
    goalName: 'OSS活動',
    goalColor: '#10B981',
    tagIds: ['tag-dev'],
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
    milestoneId: 'ms-cca',
    milestoneName: 'CCA合格',
    goalId: 'goal-gk',
    goalName: 'Golden Kubestronaut',
    goalColor: '#0EA5E9',
    tagIds: ['tag-input'],
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
    milestoneId: 'ms-pca',
    milestoneName: 'PCA合格',
    goalId: 'goal-gk',
    goalName: 'Golden Kubestronaut',
    goalColor: '#0EA5E9',
    tagIds: ['tag-input'],
    createdAt: subDays(new Date(), 5),
    updatedAt: subDays(new Date(), 5),
  },
]

// ============================================
// Diary entries (日記)
// ============================================
export let diaryEntries: DiaryEntry[] = [
  {
    id: 'd1',
    date: today,
    title: '[MOCK] MSWテスト日記',
    content: `# MSWモックデータ

これはMSW（Mock Service Worker）のテストデータです。
バックエンド通信時には表示されません。

- make dev → このデータが表示される
- make rebuild → DBのシードデータが表示される
`,
    tags: ['mock', 'テスト'],
    createdAt: new Date(today),
    updatedAt: new Date(today),
  },
  {
    id: 'd2',
    date: yesterday,
    title: '[MOCK] モックデータの説明',
    content: `# モックモードについて

このデータが見えている場合、MSWモックモードで動作しています。

実際のバックエンドと通信するには:
\`\`\`
make rebuild
\`\`\`
`,
    tags: ['mock', '説明'],
    createdAt: new Date(yesterday),
    updatedAt: new Date(yesterday),
  },
]

// ============================================
// User settings (ユーザー設定)
// ============================================
export let userSettings: UserSettings = {
  clockifyApiKey: 'mock-api-key-xxxxx',
  workspaceId: 'ws-12345',
  workspaceName: 'Personal Workspace',
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
export const dailyStudyHours = [
  { date: format(subDays(new Date(), 6), 'M/d'), hours: 4, day: '月' },
  { date: format(subDays(new Date(), 5), 'M/d'), hours: 5, day: '火' },
  { date: format(subDays(new Date(), 4), 'M/d'), hours: 6, day: '水' },
  { date: format(subDays(new Date(), 3), 'M/d'), hours: 5, day: '木' },
  { date: format(subDays(new Date(), 2), 'M/d'), hours: 7, day: '金' },
  { date: format(subDays(new Date(), 1), 'M/d'), hours: 3, day: '土' },
  { date: format(new Date(), 'M/d'), hours: 2, day: '日' },
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
