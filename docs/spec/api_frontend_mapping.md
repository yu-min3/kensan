# フロントエンド - API マッピング

このドキュメントでは、フロントエンドの各画面・機能がどのAPIエンドポイントを呼び出すかをまとめています。

## 画面別 API マッピング

### S01: 設定画面 (`/settings`)

```
┌─────────────────────────────────────────────────────────────────┐
│                        設定画面 (S01)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Clockify API キー入力                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [API キーを入力]                    [接続テスト]        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│               POST /sync/clockify/workspaces                    │
│                                                                 │
│  ワークスペース選択                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Personal ▼]                                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│               PUT /users/me/settings                            │
│                                                                 │
│  テーマ設定                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ○ Light  ● Dark  ○ System                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│               PUT /users/me/settings                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| 操作 | API | メソッド |
|------|-----|----------|
| 初期表示 | `/users/me` | GET |
| Clockify接続テスト | `/sync/clockify/workspaces` | POST |
| 設定保存 | `/users/me/settings` | PUT |

---

### S02: ダッシュボード (`/dashboard`)

```
┌─────────────────────────────────────────────────────────────────┐
│                      ダッシュボード (S02)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ クイック統計                                             │   │
│  │ [今日の予定] [今日の実績] [今週の進捗] [学習記録数]      │   │
│  └─────────────────────────────────────────────────────────┘   │
│      │              │             │              │              │
│      ▼              ▼             ▼              ▼              │
│   GET /timeblocks  GET /time-entries  GET /analytics/  GET /records│
│   ?date=today      ?date=today     summary/weekly   (count)     │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │ 今日のタイムブロック │  │ 週間学習時間グラフ  │              │
│  └─────────────────────┘  └─────────────────────┘              │
│           │                        │                            │
│           ▼                        ▼                            │
│    GET /timeblocks           GET /analytics/                    │
│    ?date=today               summary/weekly                     │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │ 目標別進捗           │  │ 最近の学習記録      │              │
│  └─────────────────────┘  └─────────────────────┘              │
│           │                        │                            │
│           ▼                        ▼                            │
│    GET /analytics/           GET /records                       │
│    goal-progress             ?sort=-updated_at                  │
│                              &per_page=3                        │
└─────────────────────────────────────────────────────────────────┘
```

| 操作 | API | メソッド |
|------|-----|----------|
| 今日のタイムブロック | `/timeblocks?date={today}` | GET |
| 今日の実績 | `/time-entries?date={today}` | GET |
| 週次サマリー | `/analytics/summary/weekly` | GET |
| 目標進捗 | `/analytics/goal-progress` | GET |
| 最近の学習記録 | `/records?sort=-updated_at&per_page=3` | GET |

---

### M01: 朝の画面 (`/morning`)

```
┌─────────────────────────────────────────────────────────────────┐
│                        朝の画面 (M01)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  初期読み込み                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. GET /routines?for_date=today   (今日の定期タスク)     │   │
│  │ 2. GET /timeblocks?date=today     (既存のタイムブロック) │   │
│  │ 3. GET /tasks?completed=false     (未完了タスク)         │   │
│  │ 4. GET /projects                  (プロジェクト一覧)     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  定期タスクからタイムブロック生成                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [定期タスクを追加]                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│         POST /timeblocks/generate-from-routines                 │
│         { "date": "2025-01-05" }                                │
│                                                                 │
│  タイムブロック追加                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  09:00 - 10:30  [CKA学習 ▼]  [+ 追加]                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│         POST /timeblocks                                        │
│         { "date": "...", "startTime": "...", ... }             │
│                                                                 │
│  タイムブロック編集/削除                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [編集] → PUT /timeblocks/{id}                          │   │
│  │  [削除] → DELETE /timeblocks/{id}                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| 操作 | API | メソッド |
|------|-----|----------|
| 定期タスク取得 | `/routines?for_date={today}` | GET |
| タイムブロック取得 | `/timeblocks?date={today}` | GET |
| タスク一覧取得 | `/tasks?completed=false` | GET |
| 定期タスクから生成 | `/timeblocks/generate-from-routines` | POST |
| タイムブロック追加 | `/timeblocks` | POST |
| タイムブロック更新 | `/timeblocks/{id}` | PUT |
| タイムブロック削除 | `/timeblocks/{id}` | DELETE |

---

### E01: 夜の画面 (`/evening`)

```
┌─────────────────────────────────────────────────────────────────┐
│                        夜の画面 (E01)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  計画 vs 実績 比較                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 計画: GET /timeblocks?date=today                        │   │
│  │ 実績: GET /time-entries?date=today                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  今日のサマリー                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ GET /analytics/summary/weekly?week_start={this_week}    │   │
│  │ (今週サマリーから今日分を抽出)                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  時間記録の追加/編集                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  追加: POST /time-entries                               │   │
│  │  編集: PUT /time-entries/{id}                           │   │
│  │  削除: DELETE /time-entries/{id}                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  明日の計画作成                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  POST /timeblocks (date=tomorrow)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| 操作 | API | メソッド |
|------|-----|----------|
| 計画取得 | `/timeblocks?date={today}` | GET |
| 実績取得 | `/time-entries?date={today}` | GET |
| 時間記録追加 | `/time-entries` | POST |
| 時間記録更新 | `/time-entries/{id}` | PUT |
| 時間記録削除 | `/time-entries/{id}` | DELETE |
| 明日の計画追加 | `/timeblocks` | POST |

---

### T01: タスク管理 (`/tasks`)

```
┌─────────────────────────────────────────────────────────────────┐
│                      タスク管理 (T01)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  プロジェクト一覧                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ GET /projects                                           │   │
│  │ POST /projects        (新規作成)                        │   │
│  │ PUT /projects/{id}    (更新)                            │   │
│  │ DELETE /projects/{id} (削除)                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  タスク一覧（プロジェクト別）                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ GET /tasks?project_id={id}                              │   │
│  │ POST /tasks           (新規作成)                        │   │
│  │ PUT /tasks/{id}       (更新)                            │   │
│  │ DELETE /tasks/{id}    (削除)                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  タスク完了切り替え                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ PATCH /tasks/{id}/complete                              │   │
│  │ { "completed": true }                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Clockify同期                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ POST /sync/clockify/projects                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### R01: 定期タスク管理 (`/routines`)

| 操作 | API | メソッド |
|------|-----|----------|
| 定期タスク一覧 | `/routines` | GET |
| 定期タスク作成 | `/routines` | POST |
| 定期タスク更新 | `/routines/{id}` | PUT |
| 有効/無効切替 | `/routines/{id}/toggle` | PATCH |
| 定期タスク削除 | `/routines/{id}` | DELETE |

---

### L01/L02: 学習記録 (`/learning-records`)

| 操作 | API | メソッド |
|------|-----|----------|
| 記録一覧 | `/records` | GET |
| 検索 | `/records?q={query}` | GET |
| フィルタ | `/records?project_id={id}&goal_tag={tag}` | GET |
| 記録詳細 | `/records/{id}` | GET |
| 記録作成 | `/records` | POST |
| 記録更新 | `/records/{id}` | PUT |
| 記録削除 | `/records/{id}` | DELETE |
| セマンティック検索 | `/records/search/semantic` | POST |

---

### D01/D02: 日記 (`/diaries`)

| 操作 | API | メソッド |
|------|-----|----------|
| 日記一覧 | `/diaries` | GET |
| 日付で取得 | `/diaries/by-date/{date}` | GET |
| 日記詳細 | `/diaries/{id}` | GET |
| 日記作成 | `/diaries` | POST |
| 日記更新 | `/diaries/{id}` | PUT |
| 日記削除 | `/diaries/{id}` | DELETE |

---

### A01: 分析レポート (`/analytics`)

| 操作 | API | メソッド |
|------|-----|----------|
| 週次サマリー | `/analytics/summary/weekly?week_start={date}` | GET |
| 月次サマリー | `/analytics/summary/monthly?year={y}&month={m}` | GET |
| トレンド | `/analytics/trends?period=week&count=4` | GET |
| 目標進捗 | `/analytics/goal-progress` | GET |

---

### A02: AIレビュー (`/ai-review`)

| 操作 | API | メソッド |
|------|-----|----------|
| レポート生成 | `/ai/reviews/generate` | POST |
| レポート一覧 | `/ai/reviews` | GET |
| レポート詳細 | `/ai/reviews/{id}` | GET |
| AIに質問 | `/ai/ask` | POST |

---

## Zustand Store → API マッピング

フロントエンドのZustandストアとバックエンドAPIの対応関係を示します。

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Frontend (Zustand Stores)                          │
├──────────────────┬──────────────────────────────────────────────────────┤
│                  │                                                      │
│  useSettingsStore├──▶ User Service                                     │
│  ├─ userName     │    ├─ GET  /users/me                                │
│  ├─ theme        │    └─ PUT  /users/me/settings                       │
│  └─ clockifyApiKey│                                                     │
│                  │                                                      │
├──────────────────┼──────────────────────────────────────────────────────┤
│                  │                                                      │
│  useTaskStore    ├──▶ Task Service                                     │
│  ├─ projects     │    ├─ GET    /projects                              │
│  ├─ tasks        │    ├─ POST   /projects                              │
│  ├─ addProject   │    ├─ PUT    /projects/{id}                         │
│  ├─ addTask      │    ├─ DELETE /projects/{id}                         │
│  └─ toggleTask   │    ├─ GET    /tasks                                 │
│                  │    ├─ POST   /tasks                                 │
│                  │    ├─ PUT    /tasks/{id}                            │
│                  │    ├─ PATCH  /tasks/{id}/complete                   │
│                  │    └─ DELETE /tasks/{id}                            │
│                  │                                                      │
├──────────────────┼──────────────────────────────────────────────────────┤
│                  │                                                      │
│  useTimeBlockStore├──▶ TimeBlock Service                               │
│  ├─ timeBlocks   │    ├─ GET    /timeblocks                            │
│  ├─ timeEntries  │    ├─ POST   /timeblocks                            │
│  ├─ addTimeBlock │    ├─ PUT    /timeblocks/{id}                       │
│  ├─ addTimeEntry │    ├─ DELETE /timeblocks/{id}                       │
│  └─ getToday*    │    ├─ POST   /timeblocks/generate-from-routines     │
│                  │    ├─ GET    /time-entries                          │
│                  │    ├─ POST   /time-entries                          │
│                  │    ├─ PUT    /time-entries/{id}                     │
│                  │    └─ DELETE /time-entries/{id}                     │
│                  │                                                      │
├──────────────────┼──────────────────────────────────────────────────────┤
│                  │                                                      │
│  useRoutineStore ├──▶ Routine Service                                  │
│  ├─ routines     │    ├─ GET    /routines                              │
│  ├─ addRoutine   │    ├─ POST   /routines                              │
│  ├─ updateRoutine│    ├─ PUT    /routines/{id}                         │
│  ├─ toggleEnabled│    ├─ PATCH  /routines/{id}/toggle                  │
│  └─ deleteRoutine│    └─ DELETE /routines/{id}                         │
│                  │                                                      │
├──────────────────┼──────────────────────────────────────────────────────┤
│                  │                                                      │
│  useLearningRecordStore├──▶ Record Service                             │
│  ├─ records      │    ├─ GET    /records                               │
│  ├─ addRecord    │    ├─ GET    /records/{id}                          │
│  ├─ updateRecord │    ├─ POST   /records                               │
│  ├─ deleteRecord │    ├─ PUT    /records/{id}                          │
│  └─ searchRecords│    ├─ DELETE /records/{id}                          │
│                  │    └─ POST   /records/search/semantic               │
│                  │                                                      │
├──────────────────┼──────────────────────────────────────────────────────┤
│                  │                                                      │
│  useDiaryStore   ├──▶ Diary Service                                    │
│  ├─ entries      │    ├─ GET    /diaries                               │
│  ├─ addEntry     │    ├─ GET    /diaries/{id}                          │
│  ├─ updateEntry  │    ├─ GET    /diaries/by-date/{date}                │
│  └─ deleteEntry  │    ├─ POST   /diaries                               │
│                  │    ├─ PUT    /diaries/{id}                          │
│                  │    └─ DELETE /diaries/{id}                          │
│                  │                                                      │
└──────────────────┴──────────────────────────────────────────────────────┘
```

---

## APIクライアント実装例

フロントエンドでのAPI呼び出しには、以下のようなクライアント実装を推奨します。

```typescript
// src/lib/api/client.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.kensan.example.com/api/v1'

interface ApiResponse<T> {
  data: T
  meta: {
    requestId: string
    timestamp: string
  }
  pagination?: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

interface ApiError {
  error: {
    code: string
    message: string
    details?: Array<{ field: string; message: string }>
  }
  meta: {
    requestId: string
    timestamp: string
  }
}

class ApiClient {
  private token: string | null = null

  setToken(token: string) {
    this.token = token
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error: ApiError = await response.json()
      throw new ApiClientError(error)
    }

    return response.json()
  }

  // Convenience methods
  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  post<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  put<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  patch<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()
```

### ストアでの使用例

```typescript
// src/stores/useTaskStore.ts (API連携版)
import { create } from 'zustand'
import { apiClient } from '@/lib/api/client'
import type { Project, Task } from '@/types'

interface TaskState {
  projects: Project[]
  tasks: Task[]
  isLoading: boolean
  error: string | null

  // API連携アクション
  fetchProjects: () => Promise<void>
  fetchTasks: (projectId?: string) => Promise<void>
  createProject: (project: Omit<Project, 'id'>) => Promise<Project>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  toggleTaskComplete: (id: string, completed: boolean) => Promise<void>
}

export const useTaskStore = create<TaskState>((set, get) => ({
  projects: [],
  tasks: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.get<Project[]>('/projects')
      set({ projects: response.data, isLoading: false })
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchTasks: async (projectId) => {
    set({ isLoading: true, error: null })
    try {
      const endpoint = projectId
        ? `/tasks?project_id=${projectId}`
        : '/tasks'
      const response = await apiClient.get<Task[]>(endpoint)
      set({ tasks: response.data, isLoading: false })
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },

  createProject: async (project) => {
    const response = await apiClient.post<Project>('/projects', project)
    set((state) => ({
      projects: [...state.projects, response.data],
    }))
    return response.data
  },

  toggleTaskComplete: async (id, completed) => {
    await apiClient.patch(`/tasks/${id}/complete`, { completed })
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, completed } : t
      ),
    }))
  },
}))
```

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 1.0.0 | 2025-01-05 | 初版作成 |
