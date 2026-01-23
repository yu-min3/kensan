# Kensan フロントエンド実装ガイド - 詳細編

このドキュメントでは、実装で使用した具体的なテクニックとパターンについて解説します。

## 目次

1. [Zustand ストアパターン](#zustand-ストアパターン)
2. [TypeScript 型設計](#typescript-型設計)
3. [コンポーネント設計パターン](#コンポーネント設計パターン)
4. [Tailwind CSS v4 設定](#tailwind-css-v4-設定)
5. [カスタムフック](#カスタムフック)
6. [条件付きレンダリング](#条件付きレンダリング)
7. [フォーム処理](#フォーム処理)
8. [パフォーマンス考慮点](#パフォーマンス考慮点)

---

## Zustand ストアパターン

### 基本構造（API連携対応）

Zustand のストアは `create` 関数で作成し、状態（state）とアクション（actions）を1つのオブジェクトにまとめます。
ストアはAPI Serviceを直接呼び出し、開発時はMSWがリクエストをインターセプトしてモックレスポンスを返します。

```typescript
// src/stores/useTaskStore.ts
import { create } from 'zustand'
import { projectsApi, tasksApi } from '@/api/services/tasks'
import type { Project, Task } from '@/types'

interface TaskState {
  // 状態（State）
  projects: Project[]
  tasks: Task[]
  isLoading: boolean
  error: string | null

  // 非同期アクション（API呼び出し）
  fetchProjects: () => Promise<void>
  fetchTasks: () => Promise<void>
  addProject: (project: Omit<Project, 'id'>) => Promise<void>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  // ゲッター（Computed values）
  getProjectById: (id: string) => Project | undefined
  getTasksByProject: (projectId: string) => Task[]
}

export const useTaskStore = create<TaskState>((set, get) => ({
  // 初期状態
  projects: [],
  tasks: [],
  isLoading: false,
  error: null,

  // 非同期アクション実装
  fetchProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const projects = await projectsApi.getAll()
      set({ projects, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  addProject: async (project) => {
    const newProject = await projectsApi.create(project)
    set((state) => ({ projects: [...state.projects, newProject] }))
  },

  // ゲッター実装
  getProjectById: (id) => get().projects.find((p) => p.id === id),
}))
```

### set と get の違い

```
┌─────────────────────────────────────────────────────────────┐
│                    Zustand Store                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  set((state) => newState)                                   │
│  ├── 状態を更新する                                         │
│  ├── React コンポーネントの再レンダリングをトリガー         │
│  └── immer 不要（浅いマージを自動実行）                     │
│                                                             │
│  get()                                                      │
│  ├── 現在の状態を読み取る                                   │
│  ├── 再レンダリングをトリガーしない                         │
│  └── ゲッター関数内で使用                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### アクションの実装パターン（非同期API対応）

```typescript
// パターン1: データ取得
fetchTasks: async () => {
  set({ isLoading: true, error: null })
  try {
    const tasks = await tasksApi.getAll()
    set({ tasks, isLoading: false })
  } catch (error) {
    set({ error: (error as Error).message, isLoading: false })
  }
},

// パターン2: 作成（API呼び出し + 楽観的更新）
addTask: async (task) => {
  const newTask = await tasksApi.create(task)
  set((state) => ({
    tasks: [...state.tasks, newTask],
  }))
},

// パターン3: 更新
updateTask: async (id, updates) => {
  await tasksApi.update(id, updates)
  set((state) => ({
    tasks: state.tasks.map((t) =>
      t.id === id ? { ...t, ...updates } : t
    ),
  }))
},

// パターン4: 削除
deleteTask: async (id) => {
  await tasksApi.delete(id)
  set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id),
  }))
},

// パターン5: トグル（ローカル更新のみも可）
toggleTaskComplete: (id) =>
  set((state) => ({
    tasks: state.tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ),
  })),
```

### ゲッター（派生状態）パターン

```typescript
// パターン1: 単純な検索
getTaskById: (id) => get().tasks.find((t) => t.id === id),

// パターン2: フィルタリング
getTasksByProject: (projectId) =>
  get().tasks.filter((t) => t.projectId === projectId),

// パターン3: 日付でフィルタリング
getTodayTimeBlocks: () => {
  const today = format(new Date(), 'yyyy-MM-dd')
  return get().timeBlocks.filter((b) => b.date === today)
},

// パターン4: 関連データの結合
getTaskWithProject: (taskId) => {
  const task = get().tasks.find((t) => t.id === taskId)
  if (!task) return undefined
  const project = get().projects.find((p) => p.id === task.projectId)
  return { ...task, project }
},
```

### コンポーネントでの使用

```tsx
function TaskList() {
  // 必要な状態とアクションのみを取得（セレクター）
  const tasks = useTaskStore((state) => state.tasks)
  const isLoading = useTaskStore((state) => state.isLoading)
  const toggleComplete = useTaskStore((state) => state.toggleTaskComplete)

  // ローディング状態の表示
  if (isLoading) return <Spinner />

  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => toggleComplete(task.id)}
          />
          {task.name}
        </li>
      ))}
    </ul>
  )
}
```

### 初期データの取得（useInitializeData）

```tsx
// src/hooks/useInitializeData.ts
export function useInitializeData() {
  const { fetchTasks } = useTaskStore()
  const { fetchTimeBlocks } = useTimeBlockStore()
  const { fetchRoutines } = useRoutineStore()
  // ... 他のストア

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        fetchTasks(),
        fetchTimeBlocks(today, tomorrow),
        fetchRoutines(),
        // ...
      ])
    }
    initialize()
  }, [])
}

// App.tsx で使用
function App() {
  useInitializeData()  // アプリ起動時に全データ取得
  return <Routes>...</Routes>
}
```

---

## TypeScript 型設計

### Union Types（ユニオン型）

限定された値のみを許可する型を定義します。

```typescript
// 目標タグ（4種類のみ）
export type GoalTag = 'GK' | 'OSS' | 'Output' | 'Other'

// 頻度（4種類のみ）
export type RoutineFrequency = 'daily' | 'weekly' | 'monthly' | 'custom'

// テーマ（3種類のみ）
export type Theme = 'light' | 'dark' | 'system'

// 使用例：コンパイル時に不正な値を検出
const tag: GoalTag = 'GK'      // OK
const tag: GoalTag = 'invalid' // コンパイルエラー！
```

### Optional Properties（オプショナルプロパティ）

`?` をつけることで、省略可能なプロパティを定義します。

```typescript
interface TimeBlock {
  id: string              // 必須
  date: string            // 必須
  startTime: string       // 必須
  endTime: string         // 必須
  taskId?: string         // オプショナル（undefined 可）
  taskName: string        // 必須
  projectId?: string      // オプショナル
  projectName?: string    // オプショナル
  goalTag?: GoalTag       // オプショナル
  isRoutine: boolean      // 必須
}
```

### Utility Types（ユーティリティ型）

TypeScript 組み込みのユーティリティ型を活用します。

```typescript
// Omit<T, K>: 特定のプロパティを除外
type NewProject = Omit<Project, 'id'>  // id を除いた Project 型
// → { name: string; goalTag?: GoalTag; color?: string; isArchived: boolean }

// Partial<T>: すべてのプロパティをオプショナルに
type ProjectUpdate = Partial<Project>
// → { id?: string; name?: string; goalTag?: GoalTag; ... }

// Pick<T, K>: 特定のプロパティのみを抽出
type ProjectSummary = Pick<Project, 'id' | 'name'>
// → { id: string; name: string }

// 実際の使用例
addProject: (project: Omit<Project, 'id'>) => void
updateProject: (id: string, updates: Partial<Project>) => void
```

### Record 型

オブジェクトの型を定義する際に便利です。

```typescript
// キーと値の型を指定
const frequencyLabels: Record<RoutineFrequency, string> = {
  daily: '毎日',
  weekly: '毎週',
  monthly: '毎月',
  custom: 'カスタム',
}

// 目標タグごとの色定義
const tagColors: Record<GoalTag, string> = {
  GK: 'bg-yellow-500',
  OSS: 'bg-green-500',
  Output: 'bg-blue-500',
  Other: 'bg-gray-500',
}
```

### 型の階層構造

```
                    ┌─────────────────┐
                    │   Base Types    │
                    │  (GoalTag, etc) │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│    Project    │   │   TimeBlock   │   │ LearningRecord│
│               │   │               │   │               │
│ id: string    │   │ id: string    │   │ id: string    │
│ name: string  │   │ date: string  │   │ title: string │
│ goalTag?      │◄──│ goalTag?      │   │ goalTag?      │
└───────────────┘   └───────────────┘   └───────────────┘
                                               │
                                               │ format
                                               ▼
                                    ┌─────────────────────┐
                                    │    RecordFormat     │
                                    │ 'markdown'|'drawio' │
                                    └─────────────────────┘
```

---

## コンポーネント設計パターン

### Props の型定義

```tsx
// 基本的な Props 定義
interface TaskCardProps {
  task: Task
  onToggle: (id: string) => void
  onEdit?: (id: string) => void  // オプショナル
}

function TaskCard({ task, onToggle, onEdit }: TaskCardProps) {
  return (
    <div>
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
      />
      <span>{task.name}</span>
      {onEdit && (  // オプショナルな props は条件付きレンダリング
        <button onClick={() => onEdit(task.id)}>Edit</button>
      )}
    </div>
  )
}
```

### children パターン

```tsx
// children を受け取るコンポーネント
interface CardProps {
  children: React.ReactNode
  className?: string
}

function Card({ children, className }: CardProps) {
  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {children}
    </div>
  )
}

// 使用例
<Card className="p-4">
  <h2>タイトル</h2>
  <p>コンテンツ</p>
</Card>
```

### Compound Components（複合コンポーネント）

Card コンポーネントのように、関連するサブコンポーネントを組み合わせるパターンです。

```tsx
// Card.tsx
const Card = ({ children, className }: CardProps) => (
  <div className={cn('rounded-lg border bg-card', className)}>
    {children}
  </div>
)

const CardHeader = ({ children, className }: CardProps) => (
  <div className={cn('flex flex-col space-y-1.5 p-6', className)}>
    {children}
  </div>
)

const CardTitle = ({ children, className }: CardProps) => (
  <h3 className={cn('text-2xl font-semibold', className)}>
    {children}
  </h3>
)

const CardContent = ({ children, className }: CardProps) => (
  <div className={cn('p-6 pt-0', className)}>
    {children}
  </div>
)

// エクスポート
export { Card, CardHeader, CardTitle, CardContent }

// 使用例
<Card>
  <CardHeader>
    <CardTitle>今日のタスク</CardTitle>
  </CardHeader>
  <CardContent>
    <TaskList />
  </CardContent>
</Card>
```

### コンポーネント構成図

```
┌─────────────────────────────────────────────────────────────┐
│                         Card                                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                    CardHeader                         │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │                CardTitle                        │ │ │
│  │  │  "今日のタスク"                                 │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                   CardContent                         │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │                 TaskList                        │ │ │
│  │  │  ┌───────────────────────────────────────────┐ │ │ │
│  │  │  │              TaskCard                     │ │ │ │
│  │  │  └───────────────────────────────────────────┘ │ │ │
│  │  │  ┌───────────────────────────────────────────┐ │ │ │
│  │  │  │              TaskCard                     │ │ │ │
│  │  │  └───────────────────────────────────────────┘ │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Tailwind CSS v4 設定

### v4 の新しい設定方法

Tailwind CSS v4 では、設定が CSS ファイル内で行われます。

```css
/* src/index.css */

/* Tailwind のインポート */
@import "tailwindcss";

/* ソースファイルの指定（どのファイルからクラスを検出するか） */
@source "../index.html";
@source "./**/*.{js,ts,jsx,tsx}";

/* カスタムテーマの定義 */
@theme {
  /* カスタムカラーの定義 */
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  /* ... */

  /* カスタム border-radius */
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}
```

### CSS 変数によるテーマシステム

```css
/* ライトモード */
:root {
  --background: 0 0% 100%;           /* HSL形式: 白 */
  --foreground: 222.2 84% 4.9%;      /* 濃い青 */
  --primary: 222.2 47.4% 11.2%;      /* プライマリカラー */
  --primary-foreground: 210 40% 98%; /* プライマリ上のテキスト */
  --muted: 210 40% 96.1%;            /* ミュートカラー */
  --muted-foreground: 215.4 16.3% 46.9%;
  /* ... */
}

/* ダークモード */
.dark {
  --background: 222.2 84% 4.9%;      /* 濃い青 */
  --foreground: 210 40% 98%;         /* 明るいテキスト */
  --primary: 210 40% 98%;            /* 反転したプライマリ */
  --primary-foreground: 222.2 47.4% 11.2%;
  /* ... */
}
```

### テーマ切り替えの仕組み

```
┌─────────────────────────────────────────────────────────────┐
│                   Theme Switching Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. ユーザーがテーマを選択                                   │
│     ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│     │  Light   │  │   Dark   │  │  System  │               │
│     └────┬─────┘  └────┬─────┘  └────┬─────┘               │
│          │             │             │                      │
│          ▼             ▼             ▼                      │
│  2. Zustand Store に保存                                     │
│     useSettingsStore.setTheme('dark')                       │
│                                                             │
│  3. <html> 要素に class を適用                               │
│     <html class="dark">                                     │
│                                                             │
│  4. CSS 変数が切り替わる                                     │
│     .dark { --background: 222.2 84% 4.9%; }                 │
│                                                             │
│  5. Tailwind クラスが新しい値を参照                          │
│     bg-background → hsl(222.2 84% 4.9%)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 実装例（Header.tsx）

```tsx
function Header() {
  const { theme, setTheme, userName } = useSettingsStore()

  // テーマ変更時に <html> の class を更新
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      // OS の設定を参照
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  return (
    <header className="border-b bg-background">
      {/* ... */}
      <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        {theme === 'dark' ? <Sun /> : <Moon />}
      </Button>
    </header>
  )
}
```

---

## カスタムフック

### ストアからのデータ取得パターン

```tsx
// 複数のストアを組み合わせるカスタムフック
function useTodayData() {
  const { getTodayTimeBlocks, getTodayTimeEntries } = useTimeBlockStore()
  const { getTodayRoutines } = useRoutineStore()

  const timeBlocks = getTodayTimeBlocks()
  const timeEntries = getTodayTimeEntries()
  const routines = getTodayRoutines()

  // 計算した値を返す
  const totalPlannedMinutes = timeBlocks.reduce((acc, block) => {
    const [sh, sm] = block.startTime.split(':').map(Number)
    const [eh, em] = block.endTime.split(':').map(Number)
    return acc + (eh * 60 + em) - (sh * 60 + sm)
  }, 0)

  return {
    timeBlocks,
    timeEntries,
    routines,
    totalPlannedMinutes,
  }
}
```

### 時間計算ユーティリティ

```typescript
// src/lib/utils.ts
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function calculateDuration(startTime: string, endTime: string): number {
  return parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime)
}
```

---

## 条件付きレンダリング

### パターン1: && 演算子

```tsx
// 条件が true の場合のみ表示
{task.goalTag && <TagBadge tag={task.goalTag} />}

// 配列に要素がある場合のみ表示
{tasks.length > 0 && (
  <ul>
    {tasks.map(task => <TaskCard key={task.id} task={task} />)}
  </ul>
)}
```

### パターン2: 三項演算子

```tsx
// 条件によって表示を切り替え
{isLoading ? (
  <Spinner />
) : (
  <Content />
)}

// 空状態の表示
{tasks.length === 0 ? (
  <EmptyState message="タスクがありません" />
) : (
  <TaskList tasks={tasks} />
)}
```

### パターン3: 早期リターン

```tsx
function TaskDetail({ taskId }: { taskId: string }) {
  const task = useTaskStore(state => state.getTaskById(taskId))

  // タスクが見つからない場合は早期リターン
  if (!task) {
    return <NotFound message="タスクが見つかりません" />
  }

  // 以降は task が存在することが保証される
  return (
    <div>
      <h1>{task.name}</h1>
      <p>{task.description}</p>
    </div>
  )
}
```

### 条件付きレンダリングの判断フロー

```
                    ┌─────────────────┐
                    │ 条件分岐が必要？ │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │  単純な表示/非表示 │ │ A or B の切り替え │ │ 複雑な条件分岐  │
    └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
             │                   │                   │
             ▼                   ▼                   ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │   && 演算子     │ │   三項演算子     │ │  早期リターン    │
    │ {cond && <A/>}  │ │ {cond ? <A/> :  │ │ if(!c) return   │
    │                 │ │         <B/>}   │ │ <Error/>        │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## フォーム処理

### useState による制御コンポーネント

```tsx
function TaskForm({ onSubmit }: { onSubmit: (task: NewTask) => void }) {
  // フォームの状態管理
  const [name, setName] = useState('')
  const [projectId, setProjectId] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState(30)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()  // デフォルトの送信を防止

    onSubmit({
      name,
      projectId,
      estimatedMinutes,
    })

    // フォームをリセット
    setName('')
    setProjectId('')
    setEstimatedMinutes(30)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="タスク名"
      />
      <Select value={projectId} onValueChange={setProjectId}>
        {/* options */}
      </Select>
      <Input
        type="number"
        value={estimatedMinutes}
        onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
      />
      <Button type="submit" disabled={!name}>
        追加
      </Button>
    </form>
  )
}
```

### 編集ダイアログパターン

```tsx
function TaskManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')

  // 新規作成ダイアログを開く
  const openNewDialog = () => {
    setEditingId(null)
    setName('')
    setIsDialogOpen(true)
  }

  // 編集ダイアログを開く
  const openEditDialog = (task: Task) => {
    setEditingId(task.id)
    setName(task.name)  // 既存の値をセット
    setIsDialogOpen(true)
  }

  // 保存処理
  const handleSave = () => {
    if (editingId) {
      updateTask(editingId, { name })
    } else {
      addTask({ name })
    }
    setIsDialogOpen(false)
  }

  return (
    <>
      <Button onClick={openNewDialog}>新規作成</Button>

      <TaskList onEdit={openEditDialog} />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogTitle>
            {editingId ? 'タスクを編集' : 'タスクを追加'}
          </DialogTitle>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={handleSave}>保存</Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

### フォーム状態管理のフロー

```
┌─────────────────────────────────────────────────────────────┐
│                      Form State Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐                                           │
│  │   useState  │  name, projectId, estimatedMinutes        │
│  └──────┬──────┘                                           │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────┐     ┌─────────────┐                       │
│  │   Input     │────▶│  onChange   │                       │
│  │   value={x} │     │  setX(new)  │                       │
│  └─────────────┘     └──────┬──────┘                       │
│                             │                               │
│                             ▼                               │
│  ┌─────────────┐     ┌─────────────┐                       │
│  │   Button    │────▶│  onSubmit   │                       │
│  │   submit    │     │  handleSave │                       │
│  └─────────────┘     └──────┬──────┘                       │
│                             │                               │
│                             ▼                               │
│                      ┌─────────────┐                        │
│                      │   Store     │                        │
│                      │  addTask()  │                        │
│                      └─────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## パフォーマンス考慮点

### 1. リストのキー

```tsx
// Good: 一意なIDをキーに使用
{tasks.map((task) => (
  <TaskCard key={task.id} task={task} />
))}

// Bad: インデックスをキーに使用（並び替えや削除時に問題）
{tasks.map((task, index) => (
  <TaskCard key={index} task={task} />  // 避ける
))}
```

### 2. セレクターによる再レンダリング最適化

```tsx
// Bad: ストア全体を取得（ストア更新のたびに再レンダリング）
const store = useTaskStore()

// Good: 必要な値のみ取得（関係ない更新では再レンダリングされない）
const tasks = useTaskStore((state) => state.tasks)
const addTask = useTaskStore((state) => state.addTask)
```

### 3. 不要な再計算の防止

```tsx
// Bad: レンダリングのたびに計算
function Dashboard() {
  const { timeBlocks } = useTimeBlockStore()

  // 毎回計算される
  const totalMinutes = timeBlocks.reduce(...)

  return <div>{totalMinutes}</div>
}

// Good: useMemo で計算結果をキャッシュ
function Dashboard() {
  const { timeBlocks } = useTimeBlockStore()

  // timeBlocks が変更された時のみ再計算
  const totalMinutes = useMemo(() =>
    timeBlocks.reduce(...),
    [timeBlocks]
  )

  return <div>{totalMinutes}</div>
}
```

### 4. コンポーネント分割

```tsx
// Bad: 1つの巨大なコンポーネント
function Dashboard() {
  return (
    <div>
      {/* 100行のヘッダー */}
      {/* 200行のサイドバー */}
      {/* 300行のメインコンテンツ */}
    </div>
  )
}

// Good: 適切に分割
function Dashboard() {
  return (
    <div>
      <DashboardHeader />
      <DashboardStats />
      <TodaySchedule />
      <WeeklyChart />
    </div>
  )
}
```

### パフォーマンス最適化の判断基準

```
┌─────────────────────────────────────────────────────────────┐
│              最適化が必要かの判断フロー                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 実際に遅いか？                                          │
│     └── 体感で問題なければ最適化不要（早すぎる最適化は悪）   │
│                                                             │
│  2. 何が遅いか特定できるか？                                 │
│     └── React DevTools の Profiler で計測                   │
│                                                             │
│  3. 適用すべき最適化                                         │
│     ├── リストが長い → React.memo, key 最適化               │
│     ├── 計算が重い → useMemo                                │
│     ├── コールバックの参照 → useCallback                    │
│     └── ストア更新が頻繁 → セレクター分割                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## まとめ

このモックアップで使用した主要なテクニック：

| カテゴリ | テクニック | 用途 |
|---------|----------|------|
| 状態管理 | Zustand ストア | グローバル状態の管理 |
| API連携 | API Service + MSW | HTTPクライアントとモック |
| 型安全性 | Union Types, Utility Types | 型の厳密な定義 |
| コンポーネント | Compound Components | 再利用可能なUI部品 |
| スタイリング | CSS Variables + Tailwind | テーマシステム |
| フォーム | 制御コンポーネント | ユーザー入力の管理 |
| 最適化 | セレクター, useMemo | パフォーマンス向上 |

### MSW（Mock Service Worker）について

開発時のAPIモックにはMSWを使用しています：

```typescript
// src/main.tsx
async function enableMocking() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser')
    return worker.start({ onUnhandledRequest: 'bypass' })
  }
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(...)
})
```

**メリット:**
- 本番コードに条件分岐不要（モックコードは本番ビルドに含まれない）
- DevTools Network タブでリクエスト/レスポンスを確認可能
- テストでも再利用可能

これらのパターンは React + TypeScript 開発において汎用的に使えるものなので、他のプロジェクトでも活用できます。
