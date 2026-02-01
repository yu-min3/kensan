# timeblock-service

時間管理（予定・実績・タイマー）を提供するサービス。

---

## 目次

1. [概要](#概要)
2. [エンティティ](#エンティティ)
3. [API仕様](#api仕様)
4. [ビジネスロジック](#ビジネスロジック)
5. [リポジトリ](#リポジトリ)

---

## 概要

| 項目 | 値 |
|------|-----|
| ポート | 8084 |
| ベースパス | `/api/v1` |
| 責務 | TimeBlock（予定）、TimeEntry（実績）、RunningTimer（タイマー）の管理 |

### 主な機能

- **TimeBlock**: 日次の時間予定（朝の計画で作成）
- **TimeEntry**: 実際の作業記録（タイマーまたは手入力）
- **Timer**: リアルタイムの作業計測
- タイムゾーン対応のクエリ
- ルーティンからの予定自動生成

---

## エンティティ

### ER図

```mermaid
erDiagram
    time_blocks {
        uuid id PK
        uuid user_id FK
        timestamptz start_datetime
        timestamptz end_datetime
        uuid task_id FK
        string task_name
        uuid milestone_id
        string milestone_name
        uuid goal_id
        string goal_name
        string goal_color
        uuid[] tag_ids
        boolean is_routine
        uuid routine_task_id
        timestamp created_at
        timestamp updated_at
    }

    time_entries {
        uuid id PK
        uuid user_id FK
        timestamptz start_datetime
        timestamptz end_datetime
        uuid task_id FK
        string task_name
        uuid milestone_id
        string milestone_name
        uuid goal_id
        string goal_name
        string goal_color
        uuid[] tag_ids
        text description
        timestamp created_at
        timestamp updated_at
    }

    running_timers {
        uuid id PK
        uuid user_id FK,UK
        uuid task_id FK
        string task_name
        uuid milestone_id
        string milestone_name
        uuid goal_id
        string goal_name
        string goal_color
        uuid[] tag_ids
        timestamp started_at
        timestamp created_at
    }

    time_blocks }o--|| tasks : "links to"
    time_entries }o--|| tasks : "links to"
    running_timers }o--|| tasks : "links to"
```

### TimeBlock（予定）

```go
type TimeBlock struct {
    ID            string    `json:"id"`
    UserID        string    `json:"userId"`
    StartDatetime time.Time `json:"startDatetime"` // UTC
    EndDatetime   time.Time `json:"endDatetime"`   // UTC
    TaskID        *string   `json:"taskId,omitempty"`
    TaskName      string    `json:"taskName"`
    MilestoneID   *string   `json:"milestoneId,omitempty"`
    MilestoneName *string   `json:"milestoneName,omitempty"`
    GoalID        *string   `json:"goalId,omitempty"`
    GoalName      *string   `json:"goalName,omitempty"`
    GoalColor     *string   `json:"goalColor,omitempty"`
    TagIDs        []string  `json:"tagIds,omitempty"`
    IsRoutine     bool      `json:"isRoutine"`
    RoutineTaskID *string   `json:"routineTaskId,omitempty"`
    CreatedAt     time.Time `json:"createdAt"`
    UpdatedAt     time.Time `json:"updatedAt"`
}
```

### TimeEntry（実績）

```go
type TimeEntry struct {
    ID            string    `json:"id"`
    UserID        string    `json:"userId"`
    StartDatetime time.Time `json:"startDatetime"` // UTC
    EndDatetime   time.Time `json:"endDatetime"`   // UTC
    TaskID        *string   `json:"taskId,omitempty"`
    TaskName      string    `json:"taskName"`
    MilestoneID   *string   `json:"milestoneId,omitempty"`
    MilestoneName *string   `json:"milestoneName,omitempty"`
    GoalID        *string   `json:"goalId,omitempty"`
    GoalName      *string   `json:"goalName,omitempty"`
    GoalColor     *string   `json:"goalColor,omitempty"`
    TagIDs        []string  `json:"tagIds,omitempty"`
    Description   *string   `json:"description,omitempty"`
    CreatedAt     time.Time `json:"createdAt"`
    UpdatedAt     time.Time `json:"updatedAt"`
}
```

### RunningTimer

```go
type RunningTimer struct {
    ID            string    `json:"id"`
    UserID        string    `json:"userId"`
    TaskID        *string   `json:"taskId,omitempty"`
    TaskName      string    `json:"taskName"`
    MilestoneID   *string   `json:"milestoneId,omitempty"`
    MilestoneName *string   `json:"milestoneName,omitempty"`
    GoalID        *string   `json:"goalId,omitempty"`
    GoalName      *string   `json:"goalName,omitempty"`
    GoalColor     *string   `json:"goalColor,omitempty"`
    TagIDs        []string  `json:"tagIds,omitempty"`
    StartedAt     time.Time `json:"startedAt"`
    CreatedAt     time.Time `json:"createdAt"`
}
```

---

## API仕様

全エンドポイントは認証必須。

### TimeBlock API

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /timeblocks | 一覧取得 |
| POST | /timeblocks | 新規作成 |
| PUT | /timeblocks/{timeBlockId} | 更新 |
| DELETE | /timeblocks/{timeBlockId} | 削除 |
| POST | /timeblocks/generate-from-routines | ルーティンから生成 |

**GET /timeblocks クエリパラメータ:**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| start_datetime | string | UTC範囲開始（ISO8601） |
| end_datetime | string | UTC範囲終了（ISO8601） |
| goal_id | string | Goal IDでフィルタ |
| milestone_id | string | Milestone IDでフィルタ |

**POST /timeblocks リクエスト:**
```json
{
  "startDatetime": "2026-01-23T00:00:00Z",
  "endDatetime": "2026-01-23T02:00:00Z",
  "taskId": "uuid",
  "taskName": "Kubernetes学習",
  "milestoneId": "uuid",
  "milestoneName": "CKA合格",
  "goalId": "uuid",
  "goalName": "Golden Kubestronaut",
  "goalColor": "#3B82F6",
  "tagIds": ["uuid1", "uuid2"],
  "isRoutine": false
}
```

**POST /timeblocks/generate-from-routines:**

指定日のルーティンタスクからTimeBlockを自動生成。

```json
{
  "date": "2026-01-23"
}
```

**レスポンス:**
```json
{
  "data": {
    "generated": 3,
    "blocks": [...]
  }
}
```

### TimeEntry API

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /time-entries | 一覧取得 |
| POST | /time-entries | 新規作成 |
| PUT | /time-entries/{entryId} | 更新 |
| DELETE | /time-entries/{entryId} | 削除 |

クエリパラメータはTimeBlockと同様（`start_datetime`/`end_datetime`で範囲指定）。

**POST /time-entries リクエスト:**
```json
{
  "startDatetime": "2026-01-23T00:15:00Z",
  "endDatetime": "2026-01-23T01:45:00Z",
  "taskId": "uuid",
  "taskName": "Kubernetes学習",
  "goalId": "uuid",
  "goalName": "Golden Kubestronaut",
  "goalColor": "#3B82F6",
  "description": "Pod Securityの章を完了"
}
```

### Timer API

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /timer/current | 現在のタイマー取得 |
| POST | /timer/start | タイマー開始 |
| POST | /timer/stop | タイマー停止 |

**GET /timer/current レスポンス:**

タイマー稼働中:
```json
{
  "data": {
    "id": "uuid",
    "taskName": "Kubernetes学習",
    "goalName": "Golden Kubestronaut",
    "startedAt": "2026-01-23T09:00:00Z"
  }
}
```

タイマー停止中:
```json
{
  "data": null
}
```

**POST /timer/start リクエスト:**
```json
{
  "taskId": "uuid",
  "taskName": "Kubernetes学習",
  "milestoneId": "uuid",
  "milestoneName": "CKA合格",
  "goalId": "uuid",
  "goalName": "Golden Kubestronaut",
  "goalColor": "#3B82F6",
  "tagIds": ["uuid"]
}
```

**POST /timer/stop レスポンス:**
```json
{
  "data": {
    "timeEntry": {
      "id": "uuid",
      "startDatetime": "2026-01-23T00:00:00Z",
      "endDatetime": "2026-01-23T01:30:00Z",
      "taskName": "Kubernetes学習"
    },
    "duration": 5400
  }
}
```

---

## ビジネスロジック

### タイムゾーン変換

DBは `TIMESTAMPTZ`（UTC）で保存。APIはUTC ISO 8601文字列をそのまま返す。
タイムゾーン変換はフロントエンド側で実施。

```
ローカル日付: 2026-01-23 (Asia/Tokyo)
UTC範囲: 2026-01-22T15:00:00Z ~ 2026-01-23T15:00:00Z
```

```mermaid
sequenceDiagram
    participant Frontend
    participant Handler
    participant Service
    participant Repository

    Frontend->>Handler: GET /timeblocks?start_datetime=2026-01-22T15:00:00Z&end_datetime=2026-01-23T15:00:00Z
    Handler->>Service: ListTimeBlocks(filter)
    Service->>Repository: List(userID, filter)
    Note over Repository: WHERE start_datetime >= $1 AND start_datetime < $2
    Repository-->>Service: []TimeBlock (UTC)
    Service-->>Handler: []TimeBlock (UTC)
    Handler-->>Frontend: 200 OK (UTC ISO 8601)
    Note over Frontend: getLocalTime()でローカル表示に変換
```

### タイマーフロー

```mermaid
sequenceDiagram
    participant User
    participant Handler
    participant Service
    participant Repository

    User->>Handler: POST /timer/start
    Handler->>Service: StartTimer(input)
    Service->>Repository: GetRunningTimer(userID)
    alt タイマー稼働中
        Service-->>Handler: ErrTimerAlreadyRunning
        Handler-->>User: 409 Conflict
    else タイマーなし
        Service->>Repository: CreateRunningTimer(timer)
        Repository-->>Service: timer
        Service-->>Handler: timer
        Handler-->>User: 201 Created
    end

    User->>Handler: POST /timer/stop
    Handler->>Service: StopTimer()
    Service->>Repository: GetRunningTimer(userID)
    alt タイマー稼働中
        Service->>Service: 経過時間計算
        Service->>Repository: CreateTimeEntry(entry)
        Service->>Repository: DeleteRunningTimer(timerID)
        Repository-->>Service: timeEntry
        Service-->>Handler: {timeEntry, duration}
        Handler-->>User: 200 OK
    else タイマーなし
        Service-->>Handler: ErrRunningTimerNotFound
        Handler-->>User: 404 Not Found
    end
```

### 日跨ぎ処理

`TIMESTAMPTZ`方式では日跨ぎは自然に処理される:
- `start_datetime` と `end_datetime` が異なる日付でも問題なし
- タイマー停止時は `started_at` と `now()` をそのまま使用

### 入力バリデーション

| フィールド | ルール |
|----------|--------|
| startDatetime | ISO 8601 (RFC3339) 形式 |
| endDatetime | ISO 8601 (RFC3339) 形式、startDatetime より後 |
| taskName | 必須 |

---

## リポジトリ

### インターフェース（ISP準拠）

```go
// TimeBlockRepository はTimeBlockの永続化を処理
type TimeBlockRepository interface {
    GetByID(ctx context.Context, id string) (*TimeBlock, error)
    GetByIDAndUserID(ctx context.Context, id, userID string) (*TimeBlock, error)
    List(ctx context.Context, userID string, filter TimeBlockFilter) ([]*TimeBlock, error)
    Create(ctx context.Context, block *TimeBlock) error
    Update(ctx context.Context, block *TimeBlock) error
    Delete(ctx context.Context, id string) error
}

// TimeEntryRepository はTimeEntryの永続化を処理
type TimeEntryRepository interface {
    GetByID(ctx context.Context, id string) (*TimeEntry, error)
    GetByIDAndUserID(ctx context.Context, id, userID string) (*TimeEntry, error)
    List(ctx context.Context, userID string, filter TimeEntryFilter) ([]*TimeEntry, error)
    Create(ctx context.Context, entry *TimeEntry) error
    Update(ctx context.Context, entry *TimeEntry) error
    Delete(ctx context.Context, id string) error
}

// RunningTimerRepository はRunningTimerの永続化を処理
type RunningTimerRepository interface {
    GetByUserID(ctx context.Context, userID string) (*RunningTimer, error)
    Create(ctx context.Context, timer *RunningTimer) error
    Delete(ctx context.Context, id string) error
}

// Repository は全リポジトリを統合
type Repository interface {
    TimeBlockRepository
    TimeEntryRepository
    RunningTimerRepository
}
```

### 主要クエリ

**ListTimeBlocks (datetime範囲フィルタ):**
```sql
SELECT id, user_id, start_datetime, end_datetime, task_id, task_name,
       milestone_id, milestone_name, goal_id, goal_name, goal_color,
       tag_ids, is_routine, routine_task_id, created_at, updated_at
FROM time_blocks
WHERE user_id = $1
  AND start_datetime >= $2  -- start_datetime
  AND start_datetime < $3   -- end_datetime
ORDER BY start_datetime ASC
```

**GetRunningTimer:**
```sql
SELECT id, user_id, task_id, task_name, milestone_id, milestone_name,
       goal_id, goal_name, goal_color, tag_ids, started_at, created_at
FROM running_timers
WHERE user_id = $1
```

**CreateTimeEntry (タイマー停止時):**
```sql
INSERT INTO time_entries (
    id, user_id, start_datetime, end_datetime, task_id, task_name,
    milestone_id, milestone_name, goal_id, goal_name, goal_color,
    tag_ids, description, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
)
```

---

## エラー定義

```go
var (
    ErrTimeBlockNotFound    = errors.New("time block not found")
    ErrTimeEntryNotFound    = errors.New("time entry not found")
    ErrRunningTimerNotFound = errors.New("no running timer")
    ErrTimerAlreadyRunning  = errors.New("timer already running")
    ErrInvalidDatetime      = errors.New("invalid datetime format")
    ErrInvalidInput         = errors.New("invalid input")
)
```
