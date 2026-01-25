# Frontend Architecture

React + TypeScript SPA for the Kensan personal productivity application.

---

## Table of Contents

1. [Overview](#overview)
2. [Directory Structure](#directory-structure)
3. [Component Hierarchy](#component-hierarchy)
4. [State Management](#state-management)
5. [API Client Layer](#api-client-layer)
6. [Routing](#routing)
7. [Type Definitions](#type-definitions)
8. [Styling](#styling)
9. [Key Patterns](#key-patterns)
10. [Development](#development)

---

## Overview

### Architecture Style
- **React 18 SPA** with TypeScript strict mode
- **Zustand** for global state management
- **Layered architecture**: Components → Stores → API Services → Backend
- **Timezone-aware**: All date/time operations convert between local and UTC

### Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React | 18.3 |
| Language | TypeScript | 5.6 |
| Build Tool | Vite | 6.x |
| State | Zustand | 5.x |
| Routing | React Router | 7.x |
| Styling | Tailwind CSS | 4.x |
| UI Components | shadcn/ui | - |
| Icons | Lucide React | 0.562 |
| Editor | TipTap | 3.16 |
| Charts | Recharts | 3.6 |

---

## Directory Structure

```
src/
├── api/                          # HTTP client and API services
│   ├── client.ts                 # HttpClient singleton
│   ├── config.ts                 # Service URLs from environment
│   ├── createApiService.ts       # Generic CRUD factory
│   └── services/                 # Domain-specific APIs (12 files)
│       ├── auth.ts, user.ts
│       ├── tasks.ts              # Goals, Milestones, Tags, Tasks
│       ├── timeblocks.ts         # TimeBlocks, TimeEntries
│       ├── timer.ts, routines.ts, notes.ts
│       ├── records.ts, diaries.ts, memos.ts
│       └── ai.ts, analytics.ts
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── layout/                   # Header, Sidebar, Layout
│   ├── common/                   # Domain components
│   ├── editor/                   # Markdown, Drawio editors
│   ├── task/                     # Goal, Milestone, Task dialogs
│   ├── daily/                    # Daily page sections
│   └── note/                     # Note editor components
├── pages/                        # Page components (10 files)
├── stores/                       # Zustand stores (12 stores)
├── hooks/                        # Custom React hooks
├── lib/                          # Utilities (timezone, dateFormat, utils)
├── mocks/                        # MSW handlers and mock data
├── types/                        # TypeScript type definitions
├── config/                       # App configuration
├── App.tsx                       # Root router
├── main.tsx                      # Entry point
└── index.css                     # Global styles
```

---

## Component Hierarchy

### Three-Tier Structure

#### 1. UI Components (`components/ui/`)
Primitive, stateless shadcn/ui components:
- Button, Input, Card, Dialog, Select, Checkbox
- Tabs, Dropdown, Popover, Badge, Progress
- Calendar, Textarea, ScrollArea, TimeRangeInput

**Characteristics:**
- No business logic
- Fully controlled via props
- Radix UI-based for accessibility

#### 2. Common Components (`components/common/`)
Domain-aware, reusable components:

| Component | Purpose |
|-----------|---------|
| `TaskCard` | Task display with checkbox, goal badge |
| `TimeBlockTimeline` | Interactive timeline (drag/resize) |
| `TimeBlockDialog` | 予定/実績の共通追加・編集ダイアログ |
| `TagBadge` | Colored tag display |
| `GoalBadge` | Goal indicator with color |
| `TimerWidget` | Active timer in header |
| `StartTimerDialog` | Timer start form |
| `FloatingMemoButton` | Quick memo FAB |
| `TaskSelect` | Task dropdown |
| `TagSelect` | Multi-select tags |

**TimeBlockDialog Features:**
- 予定（plan）/実績（entry）モード切替
- デフォルトは「タスクから選択」
- インラインでの新規タスク作成機能
- 実績モード: 日付・説明フィールド追加
- 目標未設定時の警告表示（達成率に含まれない旨）

**TimeBlockTimeline Features:**
- Drag to move (15-min snap)
- Resize edges to adjust duration
- Display planned vs actual
- Preview during interactions
- 目標あり/なしの視覚的区別:
  - 目標あり: 左ボーダーに目標色（4px）+ 目標色の薄い背景
  - 目標なし: グレー点線ボーダー + muted背景 + 「その他」ラベル

#### 3. Layout Components (`components/layout/`)

**Layout.tsx** (main wrapper):
```tsx
<div className="h-screen flex flex-col">
  <Header />
  <div className="flex-1 flex overflow-hidden">
    <Sidebar />
    <main className="flex-1 overflow-auto p-6">
      <Outlet />
    </main>
  </div>
  <FloatingMemoButton />
</div>
```

**Header.tsx:**
- Logo + brand name
- TimerWidget
- Theme toggle
- User dropdown (profile, logout)

**Sidebar.tsx:**
- Navigation items with icons
- Active state highlighting
- Phase 2 badges

---

## State Management

### Zustand Architecture

```
Component
    ↓ (calls action)
Zustand Store
    ↓ (calls API)
API Service
    ↓ (HTTP request)
Backend
    ↓ (response)
API Service
    ↓ (transforms)
Zustand Store
    ↓ (updates state)
Component (re-renders)
```

### Store Factory (`createCrudStore.ts`)

Generic CRUD store with standardized interface:

```typescript
interface CrudStore<T> {
  items: T[]
  isLoading: boolean
  error: string | null

  fetchAll(): Promise<void>
  add(data): Promise<T>
  update(id, data): Promise<T>
  remove(id): Promise<void>
  getById(id): T | undefined
  clearError(): void
}
```

### Core Stores

#### useAuthStore
```typescript
// State
token: string | null
user: User | null
isAuthenticated: boolean

// Actions
login(email, password): Promise<void>
register(email, password, name): Promise<void>
logout(): void
restoreSession(): void

// Persisted to localStorage: 'kensan-auth'
```

#### useSettingsStore
```typescript
// State
timezone: string  // e.g., 'Asia/Tokyo'
theme: 'light' | 'dark' | 'system'
userName: string
isConfigured: boolean

// Actions
setTimezone(tz): void
setTheme(theme): void
saveSettings(): Promise<void>
fetchSettings(): Promise<void>

// Persisted to localStorage: 'kensan-settings'
```

#### useTaskStore
```typescript
// State
goals: Goal[]
milestones: Milestone[]
tags: Tag[]
tasks: Task[]

// Actions (for each entity)
fetchGoals(), addGoal(), updateGoal(), deleteGoal()
fetchMilestones(), addMilestone(), ...
fetchTags(), addTag(), ...
fetchTasks(), addTask(), updateTask(), deleteTask()
toggleTaskComplete(id): Promise<void>

// Queries
getGoalById(id): Goal | undefined
getMilestonesByGoal(goalId): Milestone[]
getTasksByMilestone(milestoneId): Task[]
getChildTasks(parentId): Task[]
```

#### useTimeBlockStore
```typescript
// State
timeBlocks: TimeBlock[]
timeEntries: TimeEntry[]

// Timezone-aware actions
fetchTimeBlocksForLocalDate(date, timezone): Promise<void>
fetchTimeEntriesForLocalDate(date, timezone): Promise<void>
addTimeBlock(data, timezone): Promise<TimeBlock>
updateTimeBlock(id, data, timezone): Promise<TimeBlock>

// Queries
getTimeBlocksByDate(date): TimeBlock[]
getTodayTimeBlocks(): TimeBlock[]
getTodayTimeEntries(): TimeEntry[]
```

#### useNoteStore
```typescript
// State
items: NoteListItem[]           // Metadata only
noteCache: Map<string, Note>    // Full content cache
searchResults: NoteSearchResult[]

// Actions
fetchNotes(filter?): Promise<void>
fetchNote(id): Promise<Note>
createNote(data): Promise<Note>
updateNote(id, data): Promise<Note>
deleteNote(id): Promise<void>
search(query, filter?): Promise<void>

// Convenience
createDiary(data): Promise<Note>
createLearning(data): Promise<Note>

// Queries
getById(id): NoteListItem | undefined
getByType(type): NoteListItem[]
getByGoal(goalId): NoteListItem[]
```

#### useTimerStore
```typescript
// State
currentTimer: RunningTimer | null
isRunning: boolean

// Actions
startTimer(input): Promise<void>
stopTimer(): Promise<TimeEntry>
fetchCurrentTimer(): Promise<void>
```

### Persistence Pattern

```typescript
// Auth store with rehydration
persist(
  (set, get) => ({...}),
  {
    name: 'kensan-auth',
    partialize: (state) => ({
      token: state.token,
      user: state.user,
      isAuthenticated: state.isAuthenticated,
    }),
    onRehydrateStorage: () => (state) => {
      if (state?.token) {
        httpClient.setAuthToken(state.token)
      }
    },
  }
)
```

---

## API Client Layer

### HttpClient (`api/client.ts`)

Singleton HTTP client with auth management:

```typescript
class HttpClient {
  private authToken: string | null

  setAuthToken(token: string): void
  clearAuthToken(): void
  setOnUnauthorized(callback: () => void): void

  async get<T>(baseUrl, endpoint): Promise<T>
  async post<T>(baseUrl, endpoint, body): Promise<T>
  async put<T>(baseUrl, endpoint, body): Promise<T>
  async patch<T>(baseUrl, endpoint, body): Promise<T>
  async delete(baseUrl, endpoint): Promise<void>
}
```

**Features:**
- Auto `Authorization: Bearer <token>` header
- Response envelope unwrapping (`{data}` → `data`)
- 401 detection → logout callback
- Toast notifications on errors

### API Service Factory (`createApiService.ts`)

Generic CRUD factory:

```typescript
const tasksApi = createApiService<TaskResponse, Task, CreateInput, UpdateInput>({
  baseUrl: API_CONFIG.baseUrls.task,
  resourcePath: '/tasks',
  transform: transformTask,  // Response → Entity
})

// Returns: { list, get, create, update, delete }
```

**Extension pattern:**
```typescript
const tasksApi = extendApiService(baseTasksApi, (base) => ({
  toggleComplete(id: string): Promise<Task> {
    return httpClient.patch(baseUrl, `/tasks/${id}/complete`)
  },
  reorder(taskIds: string[]): Promise<Task[]> {
    return httpClient.post(baseUrl, '/tasks/reorder', { taskIds })
  },
}))
```

### Domain Services

**tasks.ts** - Goals, Milestones, Tags, Tasks
```typescript
goalsApi.list(), goalsApi.create({name, color}), ...
milestonesApi.list({goalId}), ...
tagsApi.list(), ...
tasksApi.list({milestoneId, completed}), tasksApi.toggleComplete(id), ...
```

**timeblocks.ts** - Timezone-aware operations
```typescript
// Converts local → UTC before sending
timeblocksApi.listByLocalDate(date, timezone): Promise<TimeBlock[]>
timeblocksApi.createWithTimezone(input, timezone): Promise<TimeBlock>

timeentriesApi.listByLocalDate(date, timezone): Promise<TimeEntry[]>
timeentriesApi.createWithTimezone(input, timezone): Promise<TimeEntry>
```

**notes.ts** - Unified notes
```typescript
notesApi.list({types, goalId, archived}): Promise<NoteListItem[]>
notesApi.get(id): Promise<Note>
notesApi.create({type, format, title, content, ...}): Promise<Note>
notesApi.search(query, filter): Promise<NoteSearchResult[]>
notesApi.archive(id, archived): Promise<Note>
```

### Configuration (`api/config.ts`)

```typescript
export const API_CONFIG = {
  baseUrls: {
    user: import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:8081',
    task: import.meta.env.VITE_TASK_SERVICE_URL || 'http://localhost:8082',
    timeblock: import.meta.env.VITE_TIMEBLOCK_SERVICE_URL || 'http://localhost:8084',
    // ... all service URLs
  },
}
```

---

## Routing

### Route Structure

```
/login                     LoginPage (public)
/settings                  S01_Settings (post-login setup)

/ (authenticated + configured)
├── /                      S02_Dashboard
├── /daily                 DailyPage
├── /notes                 N01_NoteList
│   ├── /notes/new        N02_NoteEdit
│   └── /notes/:id        N02_NoteEdit
├── /tasks                 T01_TaskManagement
├── /routines              R01_RoutineTaskManagement
├── /analytics             A01_AnalyticsReport
└── /ai-review             A02_AIReview
```

### Page Naming Convention

| Prefix | Domain | Examples |
|--------|--------|----------|
| S | Settings/System | S01_Settings, S02_Dashboard |
| D | Daily | DailyPage |
| N | Notes | N01_NoteList, N02_NoteEdit |
| T | Tasks | T01_TaskManagement |
| R | Routines | R01_RoutineTaskManagement |
| A | Analytics/AI | A01_AnalyticsReport, A02_AIReview |

### Route Protection

```tsx
// In App.tsx
<Route element={<RequireAuth />}>
  <Route element={<RequireConfigured />}>
    <Route element={<Layout />}>
      {/* Protected routes */}
    </Route>
  </Route>
</Route>
```

- Not authenticated → redirect to `/login`
- Not configured → redirect to `/settings`

---

## Type Definitions

### Core Entities (`types/index.ts`)

```typescript
interface Goal {
  id: string
  name: string
  description?: string
  color: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

interface Milestone {
  id: string
  goalId: string
  name: string
  description?: string
  targetDate?: string
  status: 'active' | 'completed' | 'archived'
}

interface Task {
  id: string
  milestoneId?: string
  parentTaskId?: string
  name: string
  tagIds: string[]
  estimatedMinutes?: number
  completed: boolean
  dueDate?: string
}

interface TimeBlock {
  id: string
  date: string          // YYYY-MM-DD
  startTime: string     // HH:mm
  endTime: string
  taskName: string
  taskId?: string
  goalId?: string
  goalName?: string
  goalColor?: string
  milestoneId?: string
  milestoneName?: string
  tagIds: string[]
  isRoutine: boolean
}

interface Note {
  id: string
  type: 'diary' | 'learning'
  format: 'markdown' | 'drawio'
  title?: string
  content: string
  date?: string         // For diary type
  goalId?: string
  goalName?: string
  goalColor?: string
  milestoneId?: string
  milestoneName?: string
  tagIds: string[]
  archived: boolean
  createdAt: string
  updatedAt: string
}
```

### Enum Types

```typescript
type MilestoneStatus = 'active' | 'completed' | 'archived'
type RoutineFrequency = 'daily' | 'weekly' | 'monthly' | 'custom'
type NoteType = 'diary' | 'learning'
type NoteFormat = 'markdown' | 'drawio'
type Theme = 'light' | 'dark' | 'system'
```

### Default Colors

```typescript
const DEFAULT_COLORS = [
  '#0EA5E9',  // Sky blue (brand)
  '#10B981',  // Emerald
  '#F59E0B',  // Amber
  '#EF4444',  // Red
  '#8B5CF6',  // Violet
  '#EC4899',  // Pink
  '#06B6D4',  // Cyan
  '#84CC16',  // Lime
]
```

---

## Styling

### Tailwind CSS Configuration

```javascript
// tailwind.config.js
module.exports = {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: 'hsl(var(--primary))',
        brand: 'hsl(var(--brand))',
        // ... more semantic colors
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

### CSS Variables (`index.css`)

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --brand: 199 89% 48%;           /* Kensan Sky Blue */
  --timeblock-plan-bg: #f8fafc;
  --timeblock-actual-bg: #e2e8f0;
}

.dark {
  --background: 222 47% 11%;
  --foreground: 210 40% 98%;
  --brand: 199 89% 60%;
  --timeblock-plan-bg: #1e293b;
  --timeblock-actual-bg: #334155;
}
```

### Utility Helper

```typescript
// lib/utils.ts
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage
<div className={cn('base-class', conditional && 'optional-class')} />
```

---

## Key Patterns

### Timezone Handling

```typescript
// lib/timezone.ts

// Convert local date to UTC range for backend query
localDateToUtcRange('2026-01-23', 'Asia/Tokyo')
// → { startUtc: '2026-01-22T15:00:00.000Z', endUtc: '2026-01-23T15:00:00.000Z' }

// Convert UTC response to local display
utcToLocalDateTime(utcDate, utcTime, timezone)
// → { date: '2026-01-23', time: '09:00' }

// Convert local input to UTC for backend
localToUtcDateTime('2026-01-23', '09:00', 'Asia/Tokyo')
// → { date: '2026-01-23', time: '00:00' }
```

### Store Initialization

```typescript
// hooks/useInitializeData.ts
export function useInitializeData() {
  const { isAuthenticated } = useAuthStore()
  const { fetchSettings, timezone } = useSettingsStore()

  useEffect(() => {
    if (!isAuthenticated) return

    const init = async () => {
      await fetchSettings()
      const tz = useSettingsStore.getState().timezone

      await Promise.all([
        fetchTasks(),
        fetchTimeBlocksForLocalDate(today, tz),
        fetchTimeEntriesForLocalDate(today, tz),
        fetchRoutines(),
      ])
    }

    init()
  }, [isAuthenticated])
}
```

### Dialog State Pattern

```typescript
// hooks/useDialogState.ts
export function useDialogState(initial = false) {
  const [open, setOpen] = useState(initial)

  const handleOpenChange = useCallback((value: boolean) => {
    setOpen(value)
  }, [])

  return [open, handleOpenChange] as const
}

// Usage
const [dialogOpen, setDialogOpen] = useDialogState()
<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
```

### Error Handling

```typescript
// HttpClient catches errors and shows toast
try {
  const response = await fetch(url, options)
  if (!response.ok) {
    toast.error('Error', { description: 'Request failed' })
    throw new Error(...)
  }
  if (response.status === 401) {
    toast.error('Session expired')
    this.onUnauthorizedCallback?.()
  }
} catch (error) {
  toast.error('Network error')
}

// Store catches and sets error state
const store = create((set) => ({
  error: null,
  fetchData: async () => {
    try {
      set({ isLoading: true, error: null })
      const data = await api.list()
      set({ items: data, isLoading: false })
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },
}))
```

### Component Composition

```tsx
// Page orchestrates stores and passes to sections
export function DailyPage() {
  const { getTodayTimeBlocks } = useTimeBlockStore()
  const { timezone } = useSettingsStore()

  return (
    <div className="space-y-6">
      <TimeBlockSection
        blocks={getTodayTimeBlocks()}
        timezone={timezone}
        onEdit={handleEdit}
      />
      <TimeEntrySection entries={getTodayTimeEntries()} />
    </div>
  )
}

// Section handles display logic
function TimeBlockSection({ blocks, onEdit }) {
  return (
    <Card>
      <CardHeader>予定</CardHeader>
      <CardContent>
        <TimeBlockTimeline blocks={blocks} onEdit={onEdit} />
      </CardContent>
    </Card>
  )
}
```

### Goal-based Time Aggregation

DailySummaryの達成率計算は**goal_idあり**のデータのみを対象とする:

```typescript
// 目標ありのデータのみ達成率計算に含める
const blocksWithGoal = todayBlocks.filter(b => b.goalId)
const entriesWithGoal = todayEntries.filter(e => e.goalId)

const plannedMinutes = calculateMinutes(blocksWithGoal)
const actualMinutes = calculateMinutes(entriesWithGoal)
const completionRate = plannedMinutes > 0
  ? Math.round((actualMinutes / plannedMinutes) * 100)
  : 0

// 目標なしは別枠表示（達成率に含まず）
const otherPlannedMinutes = calculateMinutes(blocksWithoutGoal)
const otherActualMinutes = calculateMinutes(entriesWithoutGoal)
```

**理由:**
- タスク名直接入力（目標未設定）の時間は「その他の作業」として扱う
- 目標に紐づく作業のみを達成率で追跡することで、目標達成の進捗が正確に測れる

---

## Development

### Commands

```bash
npm run dev          # Vite dev server (localhost:5173)
npm run dev:mock     # With MSW mocking
npm run build        # TypeScript check + production build
npm run lint         # ESLint
npm run preview      # Preview production build
```

### Environment Variables

```bash
# .env
VITE_USER_SERVICE_URL=http://localhost:8081
VITE_TASK_SERVICE_URL=http://localhost:8082
VITE_TIMEBLOCK_SERVICE_URL=http://localhost:8084
VITE_ROUTINE_SERVICE_URL=http://localhost:8085
VITE_RECORD_SERVICE_URL=http://localhost:8086
VITE_DIARY_SERVICE_URL=http://localhost:8087
VITE_ANALYTICS_SERVICE_URL=http://localhost:8088
VITE_AI_SERVICE_URL=http://localhost:8089
VITE_MEMO_SERVICE_URL=http://localhost:8090
VITE_NOTE_SERVICE_URL=http://localhost:8091
VITE_ENABLE_MSW=false
```

### MSW (Mock Service Worker)

Opt-in mocking for development:

```bash
VITE_ENABLE_MSW=true npm run dev
```

Handlers in `src/mocks/handlers/` mirror API services.

### Adding a New Feature

1. **Types**: Add interfaces to `types/index.ts`
2. **API Service**: Create in `api/services/` using factory
3. **Store**: Create in `stores/` using factory or custom
4. **Components**: Add to appropriate `components/` subdirectory
5. **Page**: Create in `pages/` with naming convention
6. **Route**: Add to `App.tsx`
7. **MSW Handler**: Add to `mocks/handlers/` for development

### Path Aliases

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

// Usage
import { Button } from '@/components/ui/button'
import { useTaskStore } from '@/stores/useTaskStore'
```

---

## Dependencies

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^7.1.1",
  "zustand": "^5.0.3",
  "tailwindcss": "^4.1.8",
  "@radix-ui/react-*": "various",
  "@tiptap/react": "^3.16.2",
  "react-drawio": "^1.0.0",
  "recharts": "^3.6.0",
  "date-fns": "^4.1.0",
  "lucide-react": "^0.562.0",
  "sonner": "^2.0.0",
  "msw": "^2.12.7"
}
```
