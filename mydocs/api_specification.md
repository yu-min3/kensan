# Kensan API 仕様書

このドキュメントは、Kensanバックエンドの各マイクロサービスが提供するAPIの仕様を定義します。

## 目次

1. [アーキテクチャ概要](#アーキテクチャ概要)
2. [共通仕様](#共通仕様)
3. [User Service](#user-service)
4. [Task Service](#task-service)
5. [TimeBlock Service](#timeblock-service)
6. [Routine Service](#routine-service)
7. [Record Service](#record-service)
8. [Diary Service](#diary-service)
9. [Analytics Service](#analytics-service)
10. [AI Service](#ai-service)
11. [Sync Service](#sync-service)
12. [gRPC サービス定義](#grpc-サービス定義)

---

## アーキテクチャ概要

### マイクロサービス構成

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Frontend (React)                              │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API Gateway (Istio)                              │
│                      api.kensan.example.com                              │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
        ┌───────────┬───────────┬───┴───┬───────────┬───────────┐
        ▼           ▼           ▼       ▼           ▼           ▼
┌─────────────┐ ┌─────────┐ ┌───────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│    User     │ │  Task   │ │TimeBlk│ │ Routine │ │ Record  │ │  Diary  │
│   Service   │ │ Service │ │Service│ │ Service │ │ Service │ │ Service │
└──────┬──────┘ └────┬────┘ └───┬───┘ └────┬────┘ └────┬────┘ └────┬────┘
       │             │          │          │          │           │
       ▼             ▼          ▼          ▼          ▼           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          PostgreSQL + pgvector                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Analytics  │ │     AI      │ │    Sync     │
│   Service   │ │   Service   │ │   Service   │
└─────────────┘ └─────────────┘ └─────────────┘
       │               │               │
       ▼               ▼               ▼
   PostgreSQL    Claude API     Clockify API
```

### サービス一覧

| サービス | 役割 | 主要エンドポイント |
|----------|------|-------------------|
| **User Service** | ユーザー設定、認証 | `/api/v1/users` |
| **Task Service** | プロジェクト・タスク管理 | `/api/v1/projects`, `/api/v1/tasks` |
| **TimeBlock Service** | タイムブロック（計画）管理 | `/api/v1/timeblocks` |
| **Routine Service** | 定期タスク管理 | `/api/v1/routines` |
| **Record Service** | 学習記録CRUD | `/api/v1/records` |
| **Diary Service** | 日記CRUD | `/api/v1/diaries` |
| **Analytics Service** | 時間分析・レポート | `/api/v1/analytics` |
| **AI Service** | AI振り返り生成 | `/api/v1/ai` |
| **Sync Service** | Clockify同期 | `/api/v1/sync` |

---

## 共通仕様

### ベースURL

```
https://api.kensan.example.com/api/v1
```

### 認証

すべてのAPIはJWT認証を使用します。

```http
Authorization: Bearer <jwt_token>
```

### 共通ヘッダー

| ヘッダー | 必須 | 説明 |
|----------|------|------|
| `Authorization` | Yes | JWT Bearer トークン |
| `Content-Type` | Yes | `application/json` |
| `X-Request-ID` | No | リクエスト追跡用ID（指定がなければサーバーで生成） |
| `Accept-Language` | No | レスポンス言語（`ja`, `en`）デフォルト: `ja` |

### 共通レスポンス形式

#### 成功レスポンス

```json
{
  "data": { ... },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-01-05T10:30:00Z"
  }
}
```

#### リスト取得時（ページネーション付き）

```json
{
  "data": [ ... ],
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-01-05T10:30:00Z"
  },
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### エラーレスポンス

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です",
    "details": [
      {
        "field": "name",
        "message": "名前は必須です"
      }
    ]
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-01-05T10:30:00Z"
  }
}
```

### エラーコード一覧

| HTTPステータス | エラーコード | 説明 |
|---------------|--------------|------|
| 400 | `VALIDATION_ERROR` | 入力値バリデーションエラー |
| 400 | `INVALID_REQUEST` | リクエスト形式エラー |
| 401 | `UNAUTHORIZED` | 認証エラー |
| 403 | `FORBIDDEN` | 権限エラー |
| 404 | `NOT_FOUND` | リソースが見つからない |
| 409 | `CONFLICT` | リソースの競合 |
| 422 | `UNPROCESSABLE_ENTITY` | 処理不可能なエンティティ |
| 429 | `RATE_LIMITED` | レート制限超過 |
| 500 | `INTERNAL_ERROR` | サーバー内部エラー |
| 502 | `EXTERNAL_API_ERROR` | 外部API連携エラー |
| 503 | `SERVICE_UNAVAILABLE` | サービス一時停止 |

### 共通クエリパラメータ

| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|----------|------|
| `page` | integer | 1 | ページ番号 |
| `per_page` | integer | 20 | 1ページあたりの件数（最大100） |
| `sort` | string | - | ソート項目（例: `created_at`, `-updated_at`） |
| `fields` | string | - | 取得フィールド限定（カンマ区切り） |

### 日付・時刻形式

| 項目 | 形式 | 例 |
|------|------|-----|
| 日付 | `YYYY-MM-DD` | `2025-01-05` |
| 時刻 | `HH:mm` | `09:30` |
| タイムスタンプ | ISO 8601 | `2025-01-05T10:30:00Z` |

---

## User Service

ユーザー設定と認証を管理するサービス。

### データモデル

```typescript
interface User {
  id: string                    // UUID
  email: string
  name: string
  settings: UserSettings
  createdAt: string            // ISO 8601
  updatedAt: string            // ISO 8601
}

interface UserSettings {
  clockifyApiKey?: string       // 暗号化して保存
  workspaceId?: string
  workspaceName?: string
  timezone: string              // IANA timezone (例: "Asia/Tokyo")
  theme: "light" | "dark" | "system"
  isConfigured: boolean
  aiEnabled: boolean            // AI機能の有効/無効
  aiConsentGiven: boolean       // AI利用同意フラグ
}
```

### エンドポイント

#### GET /users/me

現在のユーザー情報を取得

**Response 200**
```json
{
  "data": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "田中太郎",
    "settings": {
      "clockifyApiKey": "***hidden***",
      "workspaceId": "ws_123",
      "workspaceName": "Personal",
      "timezone": "Asia/Tokyo",
      "theme": "dark",
      "isConfigured": true,
      "aiEnabled": true,
      "aiConsentGiven": true
    },
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-05T10:00:00Z"
  }
}
```

#### PUT /users/me/settings

ユーザー設定を更新

**Request Body**
```json
{
  "clockifyApiKey": "ck_xxxxx",
  "workspaceId": "ws_123",
  "timezone": "Asia/Tokyo",
  "theme": "dark"
}
```

**Response 200**
```json
{
  "data": {
    "settings": {
      "clockifyApiKey": "***hidden***",
      "workspaceId": "ws_123",
      "workspaceName": "Personal",
      "timezone": "Asia/Tokyo",
      "theme": "dark",
      "isConfigured": true
    }
  }
}
```

#### POST /users/me/ai-consent

AI機能の利用同意を記録

**Request Body**
```json
{
  "consent": true,
  "consentVersion": "1.0"
}
```

**Response 200**
```json
{
  "data": {
    "aiEnabled": true,
    "aiConsentGiven": true,
    "consentedAt": "2025-01-05T10:00:00Z"
  }
}
```

---

## Task Service

プロジェクトとタスクを管理するサービス。Clockifyと同期される。

### データモデル

```typescript
interface Project {
  id: string                    // UUID
  clockifyId?: string           // Clockify側のID
  name: string
  goalTag?: GoalTag
  color?: string                // HEXカラー
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

interface Task {
  id: string                    // UUID
  clockifyId?: string           // Clockify側のID
  projectId: string
  parentTaskId?: string         // 親タスクID（階層構造用）
  name: string
  estimatedMinutes?: number
  completed: boolean
  dueDate?: string              // YYYY-MM-DD
  createdAt: string
  updatedAt: string
}

type GoalTag = "GK" | "OSS" | "Output" | "Other"
```

### エンドポイント

#### GET /projects

プロジェクト一覧を取得

**Query Parameters**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `archived` | boolean | アーカイブ済みを含めるか |
| `goal_tag` | GoalTag | 目標タグでフィルタ |

**Response 200**
```json
{
  "data": [
    {
      "id": "prj_abc123",
      "clockifyId": "60a1b2c3d4e5f6",
      "name": "CKA取得",
      "goalTag": "GK",
      "color": "#FFD700",
      "isArchived": false,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-05T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

#### POST /projects

プロジェクトを作成

**Request Body**
```json
{
  "name": "CKA取得",
  "goalTag": "GK",
  "color": "#FFD700"
}
```

**Response 201**
```json
{
  "data": {
    "id": "prj_abc123",
    "name": "CKA取得",
    "goalTag": "GK",
    "color": "#FFD700",
    "isArchived": false,
    "createdAt": "2025-01-05T10:00:00Z",
    "updatedAt": "2025-01-05T10:00:00Z"
  }
}
```

#### GET /projects/{projectId}

プロジェクト詳細を取得

#### PUT /projects/{projectId}

プロジェクトを更新

**Request Body**
```json
{
  "name": "CKA取得（完了）",
  "isArchived": true
}
```

#### DELETE /projects/{projectId}

プロジェクトを削除（論理削除）

---

#### GET /tasks

タスク一覧を取得

**Query Parameters**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `project_id` | string | プロジェクトIDでフィルタ |
| `completed` | boolean | 完了状態でフィルタ |
| `parent_id` | string | 親タスクIDでフィルタ（`null`で最上位のみ） |

**Response 200**
```json
{
  "data": [
    {
      "id": "tsk_abc123",
      "projectId": "prj_abc123",
      "name": "第1章 クラスタアーキテクチャ",
      "estimatedMinutes": 120,
      "completed": false,
      "children": [
        {
          "id": "tsk_child1",
          "name": "1.1 Control Plane",
          "completed": true
        }
      ],
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-05T10:00:00Z"
    }
  ]
}
```

#### POST /tasks

タスクを作成

**Request Body**
```json
{
  "projectId": "prj_abc123",
  "parentTaskId": null,
  "name": "第2章 ワークロード",
  "estimatedMinutes": 90
}
```

#### PUT /tasks/{taskId}

タスクを更新

#### PATCH /tasks/{taskId}/complete

タスクの完了状態を切り替え

**Request Body**
```json
{
  "completed": true
}
```

#### DELETE /tasks/{taskId}

タスクを削除

---

## TimeBlock Service

日次のタイムブロック（計画）を管理するサービス。

### データモデル

```typescript
interface TimeBlock {
  id: string
  userId: string
  date: string                  // YYYY-MM-DD
  startTime: string             // HH:mm
  endTime: string               // HH:mm
  taskId?: string
  taskName: string
  projectId?: string
  projectName?: string
  goalTag?: GoalTag
  isRoutine: boolean
  routineTaskId?: string        // 定期タスクから生成された場合
  createdAt: string
  updatedAt: string
}

interface TimeEntry {
  id: string
  clockifyId?: string           // Clockify側のID
  userId: string
  date: string
  startTime: string
  endTime: string
  taskId?: string
  taskName: string
  projectId?: string
  projectName?: string
  goalTag?: GoalTag
  description?: string
  createdAt: string
  updatedAt: string
}
```

### エンドポイント

#### GET /timeblocks

タイムブロック一覧を取得

**Query Parameters**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `date` | string | 日付でフィルタ（YYYY-MM-DD） |
| `start_date` | string | 期間開始日 |
| `end_date` | string | 期間終了日 |

**Response 200**
```json
{
  "data": [
    {
      "id": "tb_abc123",
      "date": "2025-01-05",
      "startTime": "09:00",
      "endTime": "10:30",
      "taskId": "tsk_abc123",
      "taskName": "CKA学習",
      "projectId": "prj_abc123",
      "projectName": "CKA取得",
      "goalTag": "GK",
      "isRoutine": false,
      "createdAt": "2025-01-05T06:00:00Z",
      "updatedAt": "2025-01-05T06:00:00Z"
    }
  ]
}
```

#### POST /timeblocks

タイムブロックを作成

**Request Body**
```json
{
  "date": "2025-01-05",
  "startTime": "09:00",
  "endTime": "10:30",
  "taskId": "tsk_abc123",
  "taskName": "CKA学習"
}
```

#### POST /timeblocks/generate-from-routines

定期タスクから指定日のタイムブロックを生成

**Request Body**
```json
{
  "date": "2025-01-05"
}
```

**Response 201**
```json
{
  "data": {
    "generated": 3,
    "timeBlocks": [
      {
        "id": "tb_routine1",
        "taskName": "技術ニュースチェック",
        "isRoutine": true,
        "routineTaskId": "rt_abc123"
      }
    ]
  }
}
```

#### PUT /timeblocks/{timeBlockId}

タイムブロックを更新

#### DELETE /timeblocks/{timeBlockId}

タイムブロックを削除

---

#### GET /time-entries

時間記録（実績）一覧を取得

**Query Parameters**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `date` | string | 日付でフィルタ |
| `start_date` | string | 期間開始日 |
| `end_date` | string | 期間終了日 |
| `project_id` | string | プロジェクトでフィルタ |
| `goal_tag` | GoalTag | 目標タグでフィルタ |

**Response 200**
```json
{
  "data": [
    {
      "id": "te_abc123",
      "clockifyId": "60a1b2c3d4e5f6",
      "date": "2025-01-05",
      "startTime": "09:15",
      "endTime": "10:45",
      "taskId": "tsk_abc123",
      "taskName": "CKA学習",
      "projectId": "prj_abc123",
      "projectName": "CKA取得",
      "goalTag": "GK",
      "description": "第1章完了",
      "createdAt": "2025-01-05T10:45:00Z",
      "updatedAt": "2025-01-05T10:45:00Z"
    }
  ]
}
```

#### POST /time-entries

時間記録を作成

**Request Body**
```json
{
  "date": "2025-01-05",
  "startTime": "09:15",
  "endTime": "10:45",
  "taskId": "tsk_abc123",
  "taskName": "CKA学習",
  "description": "第1章完了"
}
```

#### PUT /time-entries/{entryId}

時間記録を更新

#### DELETE /time-entries/{entryId}

時間記録を削除

---

## Routine Service

定期タスクを管理するサービス。

### データモデル

```typescript
interface RoutineTask {
  id: string
  userId: string
  name: string
  frequency: RoutineFrequency
  daysOfWeek?: number[]         // 0=日曜, 1=月曜, ..., 6=土曜
  estimatedMinutes: number
  defaultStartTime?: string     // HH:mm
  enabled: boolean
  createdAt: string
  updatedAt: string
}

type RoutineFrequency = "daily" | "weekly" | "monthly" | "custom"
```

### エンドポイント

#### GET /routines

定期タスク一覧を取得

**Query Parameters**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `enabled` | boolean | 有効な定期タスクのみ |
| `for_date` | string | 指定日に該当する定期タスクのみ |

**Response 200**
```json
{
  "data": [
    {
      "id": "rt_abc123",
      "name": "技術ニュースチェック",
      "frequency": "daily",
      "estimatedMinutes": 30,
      "defaultStartTime": "07:00",
      "enabled": true,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    },
    {
      "id": "rt_def456",
      "name": "週次振り返り",
      "frequency": "weekly",
      "daysOfWeek": [0],
      "estimatedMinutes": 60,
      "enabled": true,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /routines

定期タスクを作成

**Request Body**
```json
{
  "name": "技術ニュースチェック",
  "frequency": "daily",
  "estimatedMinutes": 30,
  "defaultStartTime": "07:00",
  "enabled": true
}
```

#### PUT /routines/{routineId}

定期タスクを更新

#### PATCH /routines/{routineId}/toggle

定期タスクの有効/無効を切り替え

**Request Body**
```json
{
  "enabled": false
}
```

#### DELETE /routines/{routineId}

定期タスクを削除

---

## Record Service

学習記録を管理するサービス。MinIOにファイルを保存。

### データモデル

```typescript
interface LearningRecord {
  id: string
  userId: string
  title: string
  content: string               // Markdown または drawio XML
  format: RecordFormat
  projectId?: string
  projectName?: string
  goalTag?: GoalTag
  relatedTimeEntryIds?: string[]
  fileUrl?: string              // MinIO上のファイルURL
  embedding?: number[]          // pgvector用（内部利用）
  createdAt: string
  updatedAt: string
}

type RecordFormat = "markdown" | "drawio"
```

### エンドポイント

#### GET /records

学習記録一覧を取得

**Query Parameters**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `project_id` | string | プロジェクトでフィルタ |
| `goal_tag` | GoalTag | 目標タグでフィルタ |
| `format` | RecordFormat | フォーマットでフィルタ |
| `q` | string | 全文検索クエリ |

**Response 200**
```json
{
  "data": [
    {
      "id": "rec_abc123",
      "title": "Kubernetes Schedulerの仕組み",
      "format": "markdown",
      "projectId": "prj_abc123",
      "projectName": "CKA取得",
      "goalTag": "GK",
      "relatedTimeEntryIds": ["te_abc123"],
      "createdAt": "2025-01-05T10:00:00Z",
      "updatedAt": "2025-01-05T10:00:00Z"
    }
  ]
}
```

#### GET /records/{recordId}

学習記録の詳細を取得（コンテンツ含む）

**Response 200**
```json
{
  "data": {
    "id": "rec_abc123",
    "title": "Kubernetes Schedulerの仕組み",
    "content": "# Kubernetes Scheduler\n\n## 概要\n...",
    "format": "markdown",
    "projectId": "prj_abc123",
    "projectName": "CKA取得",
    "goalTag": "GK",
    "relatedTimeEntryIds": ["te_abc123"],
    "createdAt": "2025-01-05T10:00:00Z",
    "updatedAt": "2025-01-05T10:00:00Z"
  }
}
```

#### POST /records

学習記録を作成

**Request Body**
```json
{
  "title": "Kubernetes Schedulerの仕組み",
  "content": "# Kubernetes Scheduler\n\n## 概要\n...",
  "format": "markdown",
  "projectId": "prj_abc123",
  "goalTag": "GK"
}
```

#### PUT /records/{recordId}

学習記録を更新

#### DELETE /records/{recordId}

学習記録を削除

#### POST /records/search/semantic

セマンティック検索（Embedding検索）

**Request Body**
```json
{
  "query": "Kubernetesのスケジューリング戦略",
  "limit": 10
}
```

**Response 200**
```json
{
  "data": [
    {
      "id": "rec_abc123",
      "title": "Kubernetes Schedulerの仕組み",
      "score": 0.95,
      "snippet": "...Schedulerはノード選択のために..."
    }
  ]
}
```

---

## Diary Service

日記を管理するサービス。

### データモデル

```typescript
interface DiaryEntry {
  id: string
  userId: string
  date: string                  // YYYY-MM-DD
  title: string
  content: string               // Markdown
  tags: string[]
  createdAt: string
  updatedAt: string
}
```

### エンドポイント

#### GET /diaries

日記一覧を取得

**Query Parameters**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `start_date` | string | 期間開始日 |
| `end_date` | string | 期間終了日 |
| `tag` | string | タグでフィルタ |
| `q` | string | 全文検索クエリ |

**Response 200**
```json
{
  "data": [
    {
      "id": "diary_abc123",
      "date": "2025-01-05",
      "title": "CKA模試に合格！",
      "tags": ["CKA", "達成"],
      "createdAt": "2025-01-05T21:00:00Z",
      "updatedAt": "2025-01-05T21:00:00Z"
    }
  ]
}
```

#### GET /diaries/{diaryId}

日記の詳細を取得

#### GET /diaries/by-date/{date}

日付で日記を取得（YYYY-MM-DD）

#### POST /diaries

日記を作成

**Request Body**
```json
{
  "date": "2025-01-05",
  "title": "CKA模試に合格！",
  "content": "## 今日の出来事\n\n模擬試験で80%を取れた...",
  "tags": ["CKA", "達成"]
}
```

#### PUT /diaries/{diaryId}

日記を更新

#### DELETE /diaries/{diaryId}

日記を削除

---

## Analytics Service

時間分析とレポート生成を行うサービス。

### エンドポイント

#### GET /analytics/summary/weekly

週次サマリーを取得

**Query Parameters**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `week_start` | string | 週の開始日（YYYY-MM-DD） |

**Response 200**
```json
{
  "data": {
    "weekStart": "2024-12-30",
    "weekEnd": "2025-01-05",
    "totalMinutes": 2400,
    "byGoalTag": {
      "GK": 1200,
      "OSS": 600,
      "Output": 300,
      "Other": 300
    },
    "byProject": {
      "prj_abc123": 900,
      "prj_def456": 600
    },
    "completedTasks": 15,
    "plannedVsActual": {
      "planned": 2520,
      "actual": 2400
    },
    "dailyBreakdown": [
      { "date": "2024-12-30", "minutes": 360 },
      { "date": "2024-12-31", "minutes": 300 },
      { "date": "2025-01-01", "minutes": 180 },
      { "date": "2025-01-02", "minutes": 420 },
      { "date": "2025-01-03", "minutes": 480 },
      { "date": "2025-01-04", "minutes": 360 },
      { "date": "2025-01-05", "minutes": 300 }
    ]
  }
}
```

#### GET /analytics/summary/monthly

月次サマリーを取得

**Query Parameters**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `year` | integer | 年 |
| `month` | integer | 月（1-12） |

#### GET /analytics/trends

トレンド分析を取得

**Query Parameters**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `period` | string | `week`, `month`, `quarter` |
| `count` | integer | 期間数（デフォルト: 4） |

**Response 200**
```json
{
  "data": {
    "period": "week",
    "trends": [
      {
        "startDate": "2024-12-09",
        "endDate": "2024-12-15",
        "totalMinutes": 2100
      },
      {
        "startDate": "2024-12-16",
        "endDate": "2024-12-22",
        "totalMinutes": 2400
      },
      {
        "startDate": "2024-12-23",
        "endDate": "2024-12-29",
        "totalMinutes": 1800
      },
      {
        "startDate": "2024-12-30",
        "endDate": "2025-01-05",
        "totalMinutes": 2400
      }
    ],
    "averageMinutes": 2175,
    "trend": "increasing"
  }
}
```

#### GET /analytics/goal-progress

目標別の進捗を取得

**Query Parameters**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `goal_tag` | GoalTag | 目標タグ（省略時は全て） |

**Response 200**
```json
{
  "data": [
    {
      "goalTag": "GK",
      "weeklyTargetMinutes": 1200,
      "currentWeekMinutes": 1000,
      "progress": 83.3,
      "onTrack": true
    }
  ]
}
```

---

## AI Service

AI振り返り生成を行うサービス。Claude APIを使用。

### データモデル

```typescript
interface AIReviewReport {
  id: string
  userId: string
  weekStart: string
  weekEnd: string
  summary: string
  goodPoints: string[]
  improvementPoints: string[]
  advice: string[]
  rawResponse?: string          // デバッグ用（オプション）
  tokensUsed: {
    input: number
    output: number
  }
  createdAt: string
}
```

### エンドポイント

#### POST /ai/reviews/generate

週次振り返りレポートを生成

**Request Body**
```json
{
  "weekStart": "2024-12-30",
  "weekEnd": "2025-01-05"
}
```

**Response 200**
```json
{
  "data": {
    "id": "air_abc123",
    "weekStart": "2024-12-30",
    "weekEnd": "2025-01-05",
    "summary": "今週は合計40時間の自己研鑽を達成しました。CKA学習に注力し、目標の80%を達成しています。",
    "goodPoints": [
      "毎日コンスタントに学習時間を確保できた",
      "CKA模試で80%を達成し、順調に進んでいる",
      "技術ニュースチェックを欠かさず継続"
    ],
    "improvementPoints": [
      "OSS活動の時間が目標の50%に留まっている",
      "アウトプット（ブログ執筆）が後回しになりがち"
    ],
    "advice": [
      "来週はOSS活動に1日2時間を確保することをお勧めします",
      "CKA学習の合間にブログ記事のドラフトを作成してみてください",
      "模試の復習ノートを学習記録に残すと効果的です"
    ],
    "tokensUsed": {
      "input": 2500,
      "output": 800
    },
    "createdAt": "2025-01-05T21:00:00Z"
  }
}
```

#### GET /ai/reviews

過去の振り返りレポート一覧を取得

**Query Parameters**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `start_date` | string | 期間開始日 |
| `end_date` | string | 期間終了日 |

#### GET /ai/reviews/{reviewId}

振り返りレポートの詳細を取得

#### POST /ai/ask

AIに質問する（汎用チャット）

**Request Body**
```json
{
  "question": "CKA試験に向けて、残り2週間でどのような学習計画が良いですか？",
  "context": {
    "includeRecentRecords": true,
    "includeTimeStats": true
  }
}
```

**Response 200**
```json
{
  "data": {
    "answer": "あなたの学習履歴を分析すると...",
    "suggestions": [
      "模試を毎日1セクション解く",
      "苦手な分野（Networking）に重点を置く"
    ],
    "tokensUsed": {
      "input": 1500,
      "output": 600
    }
  }
}
```

---

## Sync Service

Clockifyとの同期を管理するサービス。

### エンドポイント

#### POST /sync/clockify/workspaces

Clockifyワークスペース一覧を取得

**Request Body**
```json
{
  "apiKey": "ck_xxxxx"
}
```

**Response 200**
```json
{
  "data": [
    {
      "id": "ws_123",
      "name": "Personal",
      "membersCount": 1
    }
  ]
}
```

#### POST /sync/clockify/projects

Clockifyプロジェクトを同期

**Response 200**
```json
{
  "data": {
    "synced": 5,
    "created": 2,
    "updated": 3
  }
}
```

#### POST /sync/clockify/time-entries

Clockify時間記録を同期

**Request Body**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-05"
}
```

**Response 200**
```json
{
  "data": {
    "synced": 25,
    "created": 10,
    "updated": 15
  }
}
```

#### GET /sync/status

同期状態を取得

**Response 200**
```json
{
  "data": {
    "lastSyncAt": "2025-01-05T10:00:00Z",
    "nextSyncAt": "2025-01-05T10:15:00Z",
    "status": "healthy",
    "pendingChanges": 0
  }
}
```

#### POST /sync/trigger

手動で同期をトリガー

**Response 202**
```json
{
  "data": {
    "message": "Sync triggered",
    "jobId": "sync_job_abc123"
  }
}
```

---

## gRPC サービス定義

マイクロサービス間通信はgRPCを使用します。以下は主要なサービス定義です。

### task_service.proto

```protobuf
syntax = "proto3";

package kensan.task.v1;

option go_package = "github.com/kensan/api/task/v1;taskv1";

import "google/protobuf/timestamp.proto";
import "google/protobuf/empty.proto";

// Project Service
service ProjectService {
  rpc ListProjects(ListProjectsRequest) returns (ListProjectsResponse);
  rpc GetProject(GetProjectRequest) returns (Project);
  rpc CreateProject(CreateProjectRequest) returns (Project);
  rpc UpdateProject(UpdateProjectRequest) returns (Project);
  rpc DeleteProject(DeleteProjectRequest) returns (google.protobuf.Empty);
}

// Task Service
service TaskService {
  rpc ListTasks(ListTasksRequest) returns (ListTasksResponse);
  rpc GetTask(GetTaskRequest) returns (Task);
  rpc CreateTask(CreateTaskRequest) returns (Task);
  rpc UpdateTask(UpdateTaskRequest) returns (Task);
  rpc DeleteTask(DeleteTaskRequest) returns (google.protobuf.Empty);
  rpc ToggleTaskComplete(ToggleTaskCompleteRequest) returns (Task);
}

// Enums
enum GoalTag {
  GOAL_TAG_UNSPECIFIED = 0;
  GOAL_TAG_GK = 1;
  GOAL_TAG_OSS = 2;
  GOAL_TAG_OUTPUT = 3;
  GOAL_TAG_OTHER = 4;
}

// Messages
message Project {
  string id = 1;
  optional string clockify_id = 2;
  string name = 3;
  optional GoalTag goal_tag = 4;
  optional string color = 5;
  bool is_archived = 6;
  google.protobuf.Timestamp created_at = 7;
  google.protobuf.Timestamp updated_at = 8;
}

message Task {
  string id = 1;
  optional string clockify_id = 2;
  string project_id = 3;
  optional string parent_task_id = 4;
  string name = 5;
  optional int32 estimated_minutes = 6;
  bool completed = 7;
  optional string due_date = 8;
  repeated Task children = 9;
  google.protobuf.Timestamp created_at = 10;
  google.protobuf.Timestamp updated_at = 11;
}

message ListProjectsRequest {
  optional bool include_archived = 1;
  optional GoalTag goal_tag = 2;
  int32 page = 3;
  int32 per_page = 4;
}

message ListProjectsResponse {
  repeated Project projects = 1;
  int32 total = 2;
}

message GetProjectRequest {
  string id = 1;
}

message CreateProjectRequest {
  string name = 1;
  optional GoalTag goal_tag = 2;
  optional string color = 3;
}

message UpdateProjectRequest {
  string id = 1;
  optional string name = 2;
  optional GoalTag goal_tag = 3;
  optional string color = 4;
  optional bool is_archived = 5;
}

message DeleteProjectRequest {
  string id = 1;
}

message ListTasksRequest {
  optional string project_id = 1;
  optional bool completed = 2;
  optional string parent_id = 3;
  int32 page = 4;
  int32 per_page = 5;
}

message ListTasksResponse {
  repeated Task tasks = 1;
  int32 total = 2;
}

message GetTaskRequest {
  string id = 1;
}

message CreateTaskRequest {
  string project_id = 1;
  optional string parent_task_id = 2;
  string name = 3;
  optional int32 estimated_minutes = 4;
}

message UpdateTaskRequest {
  string id = 1;
  optional string name = 2;
  optional int32 estimated_minutes = 3;
  optional string due_date = 4;
}

message DeleteTaskRequest {
  string id = 1;
}

message ToggleTaskCompleteRequest {
  string id = 1;
  bool completed = 2;
}
```

### timeblock_service.proto

```protobuf
syntax = "proto3";

package kensan.timeblock.v1;

option go_package = "github.com/kensan/api/timeblock/v1;timeblockv1";

import "google/protobuf/timestamp.proto";
import "google/protobuf/empty.proto";
import "kensan/task/v1/task_service.proto";

service TimeBlockService {
  rpc ListTimeBlocks(ListTimeBlocksRequest) returns (ListTimeBlocksResponse);
  rpc GetTimeBlock(GetTimeBlockRequest) returns (TimeBlock);
  rpc CreateTimeBlock(CreateTimeBlockRequest) returns (TimeBlock);
  rpc UpdateTimeBlock(UpdateTimeBlockRequest) returns (TimeBlock);
  rpc DeleteTimeBlock(DeleteTimeBlockRequest) returns (google.protobuf.Empty);
  rpc GenerateFromRoutines(GenerateFromRoutinesRequest) returns (GenerateFromRoutinesResponse);
}

service TimeEntryService {
  rpc ListTimeEntries(ListTimeEntriesRequest) returns (ListTimeEntriesResponse);
  rpc GetTimeEntry(GetTimeEntryRequest) returns (TimeEntry);
  rpc CreateTimeEntry(CreateTimeEntryRequest) returns (TimeEntry);
  rpc UpdateTimeEntry(UpdateTimeEntryRequest) returns (TimeEntry);
  rpc DeleteTimeEntry(DeleteTimeEntryRequest) returns (google.protobuf.Empty);
}

message TimeBlock {
  string id = 1;
  string user_id = 2;
  string date = 3;              // YYYY-MM-DD
  string start_time = 4;        // HH:mm
  string end_time = 5;          // HH:mm
  optional string task_id = 6;
  string task_name = 7;
  optional string project_id = 8;
  optional string project_name = 9;
  optional task.v1.GoalTag goal_tag = 10;
  bool is_routine = 11;
  optional string routine_task_id = 12;
  google.protobuf.Timestamp created_at = 13;
  google.protobuf.Timestamp updated_at = 14;
}

message TimeEntry {
  string id = 1;
  optional string clockify_id = 2;
  string user_id = 3;
  string date = 4;
  string start_time = 5;
  string end_time = 6;
  optional string task_id = 7;
  string task_name = 8;
  optional string project_id = 9;
  optional string project_name = 10;
  optional task.v1.GoalTag goal_tag = 11;
  optional string description = 12;
  google.protobuf.Timestamp created_at = 13;
  google.protobuf.Timestamp updated_at = 14;
}

message ListTimeBlocksRequest {
  optional string date = 1;
  optional string start_date = 2;
  optional string end_date = 3;
}

message ListTimeBlocksResponse {
  repeated TimeBlock time_blocks = 1;
}

message GetTimeBlockRequest {
  string id = 1;
}

message CreateTimeBlockRequest {
  string date = 1;
  string start_time = 2;
  string end_time = 3;
  optional string task_id = 4;
  string task_name = 5;
  optional string project_id = 6;
}

message UpdateTimeBlockRequest {
  string id = 1;
  optional string start_time = 2;
  optional string end_time = 3;
  optional string task_id = 4;
  optional string task_name = 5;
}

message DeleteTimeBlockRequest {
  string id = 1;
}

message GenerateFromRoutinesRequest {
  string date = 1;
}

message GenerateFromRoutinesResponse {
  int32 generated = 1;
  repeated TimeBlock time_blocks = 2;
}

message ListTimeEntriesRequest {
  optional string date = 1;
  optional string start_date = 2;
  optional string end_date = 3;
  optional string project_id = 4;
  optional task.v1.GoalTag goal_tag = 5;
}

message ListTimeEntriesResponse {
  repeated TimeEntry time_entries = 1;
}

message GetTimeEntryRequest {
  string id = 1;
}

message CreateTimeEntryRequest {
  string date = 1;
  string start_time = 2;
  string end_time = 3;
  optional string task_id = 4;
  string task_name = 5;
  optional string project_id = 6;
  optional string description = 7;
}

message UpdateTimeEntryRequest {
  string id = 1;
  optional string start_time = 2;
  optional string end_time = 3;
  optional string task_name = 4;
  optional string description = 5;
}

message DeleteTimeEntryRequest {
  string id = 1;
}
```

### analytics_service.proto

```protobuf
syntax = "proto3";

package kensan.analytics.v1;

option go_package = "github.com/kensan/api/analytics/v1;analyticsv1";

import "kensan/task/v1/task_service.proto";

service AnalyticsService {
  rpc GetWeeklySummary(GetWeeklySummaryRequest) returns (WeeklySummary);
  rpc GetMonthlySummary(GetMonthlySummaryRequest) returns (MonthlySummary);
  rpc GetTrends(GetTrendsRequest) returns (TrendsResponse);
  rpc GetGoalProgress(GetGoalProgressRequest) returns (GoalProgressResponse);
}

message WeeklySummary {
  string week_start = 1;
  string week_end = 2;
  int32 total_minutes = 3;
  map<string, int32> by_goal_tag = 4;  // GoalTag -> minutes
  map<string, int32> by_project = 5;   // ProjectId -> minutes
  int32 completed_tasks = 6;
  PlannedVsActual planned_vs_actual = 7;
  repeated DailyMinutes daily_breakdown = 8;
}

message PlannedVsActual {
  int32 planned = 1;
  int32 actual = 2;
}

message DailyMinutes {
  string date = 1;
  int32 minutes = 2;
}

message MonthlySummary {
  int32 year = 1;
  int32 month = 2;
  int32 total_minutes = 3;
  map<string, int32> by_goal_tag = 4;
  map<string, int32> by_project = 5;
  int32 completed_tasks = 6;
  repeated WeeklySummary weekly_breakdown = 7;
}

message GetWeeklySummaryRequest {
  string week_start = 1;
}

message GetMonthlySummaryRequest {
  int32 year = 1;
  int32 month = 2;
}

enum TrendPeriod {
  TREND_PERIOD_UNSPECIFIED = 0;
  TREND_PERIOD_WEEK = 1;
  TREND_PERIOD_MONTH = 2;
  TREND_PERIOD_QUARTER = 3;
}

message GetTrendsRequest {
  TrendPeriod period = 1;
  int32 count = 2;
}

message TrendDataPoint {
  string start_date = 1;
  string end_date = 2;
  int32 total_minutes = 3;
}

message TrendsResponse {
  TrendPeriod period = 1;
  repeated TrendDataPoint trends = 2;
  int32 average_minutes = 3;
  string trend_direction = 4;  // "increasing", "decreasing", "stable"
}

message GetGoalProgressRequest {
  optional task.v1.GoalTag goal_tag = 1;
}

message GoalProgress {
  task.v1.GoalTag goal_tag = 1;
  int32 weekly_target_minutes = 2;
  int32 current_week_minutes = 3;
  float progress = 4;
  bool on_track = 5;
}

message GoalProgressResponse {
  repeated GoalProgress goals = 1;
}
```

---

## 実装ガイドライン

### ディレクトリ構造（Go）

```
kensan-backend/
├── cmd/
│   ├── task-service/
│   │   └── main.go
│   ├── timeblock-service/
│   │   └── main.go
│   ├── routine-service/
│   │   └── main.go
│   ├── record-service/
│   │   └── main.go
│   ├── diary-service/
│   │   └── main.go
│   ├── analytics-service/
│   │   └── main.go
│   ├── ai-service/
│   │   └── main.go
│   └── sync-service/
│       └── main.go
├── api/
│   └── proto/
│       └── kensan/
│           ├── task/v1/
│           ├── timeblock/v1/
│           ├── routine/v1/
│           ├── record/v1/
│           ├── diary/v1/
│           ├── analytics/v1/
│           ├── ai/v1/
│           └── sync/v1/
├── internal/
│   ├── task/
│   │   ├── handler/
│   │   ├── service/
│   │   └── repository/
│   └── ...
├── pkg/
│   ├── auth/
│   ├── clockify/
│   ├── claude/
│   └── database/
├── deployments/
│   └── kubernetes/
└── go.mod
```

### 実装優先順位

```
Phase 1 (MVP)
├── 1. User Service      ← 認証基盤
├── 2. Task Service      ← プロジェクト・タスク管理
├── 3. TimeBlock Service ← 計画・実績管理
├── 4. Sync Service      ← Clockify連携
└── 5. Record Service    ← 学習記録

Phase 2
├── 6. Routine Service   ← 定期タスク
├── 7. Diary Service     ← 日記
├── 8. Analytics Service ← 分析・レポート
└── 9. AI Service        ← AI振り返り
```

### OpenTelemetry計装

各サービスでOpenTelemetryを計装し、分散トレーシングを実現します。

```go
// 例: gRPC Interceptor
import (
    "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
)

server := grpc.NewServer(
    grpc.UnaryInterceptor(otelgrpc.UnaryServerInterceptor()),
    grpc.StreamInterceptor(otelgrpc.StreamServerInterceptor()),
)
```

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 1.0.0 | 2025-01-05 | 初版作成 |
