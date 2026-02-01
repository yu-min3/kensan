# Kensan ドキュメント整備計画

## 目的

各コードベースのARCHITECTURE.mdを拡充し、以下を追加する：
- Mermaid図によるビジュアル化（ER図、データフロー、アーキテクチャ図）
- 勉強用かつ実際の開発で使える実用的なリファレンス

---

## 1. backend/ARCHITECTURE.md の改善

### 追加するセクション

#### 1.1 System Architecture Diagram
サービス間の関係を示す全体図（Mermaidフローチャート）

```mermaid
graph TB
    subgraph Frontend
        SPA[React SPA]
    end

    subgraph Backend Services
        US[user-service :8081]
        TS[task-service :8082]
        TBS[timeblock-service :8084]
        AS[analytics-service :8088]
        MS[memo-service :8090]
        NS[note-service :8091]
    end

    subgraph AI Service
        AI[kensan-ai :8089]
    end

    subgraph Storage
        PG[(PostgreSQL 16)]
        R2[(Cloudflare R2)]
    end

    SPA --> US
    SPA --> TS
    SPA --> TBS
    SPA --> AS
    SPA --> MS
    SPA --> NS
    SPA --> AI

    US --> PG
    TS --> PG
    TBS --> PG
    AS --> PG
    MS --> PG
    NS --> PG
    AI --> PG
    AI --> R2
```

#### 1.2 Entity Relationship Diagram (ER図)
全テーブルの関係を示す詳細なER図

```mermaid
erDiagram
    users ||--o| user_settings : "has"
    users ||--o{ goals : "owns"
    users ||--o{ milestones : "owns"
    users ||--o{ tags : "owns"
    users ||--o{ tasks : "owns"
    users ||--o{ time_blocks : "owns"
    users ||--o{ time_entries : "owns"
    users ||--o{ notes : "owns"
    users ||--o{ memos : "owns"
    users ||--o| running_timers : "has"
    users ||--o{ ai_interactions : "has"
    users ||--o| user_memory : "has"
    users ||--o{ user_facts : "has"
    users ||--o{ documents : "owns"

    goals ||--o{ milestones : "contains"
    milestones ||--o{ tasks : "contains"
    tasks ||--o{ tasks : "has subtasks"
    tasks }o--o{ tags : "tagged with"
    notes }o--o{ tags : "tagged with"

    tasks {
        uuid id PK
        uuid user_id FK
        uuid milestone_id FK
        uuid parent_task_id FK
        string name
        int estimated_minutes
        bool completed
        date due_date
    }

    goals {
        uuid id PK
        uuid user_id FK
        string name
        string color
        bool is_archived
    }

    milestones {
        uuid id PK
        uuid user_id FK
        uuid goal_id FK
        string name
        date target_date
        string status
    }

    time_blocks {
        uuid id PK
        uuid user_id FK
        date date
        time start_time
        time end_time
        string task_name
        uuid goal_id FK
        string goal_color
    }

    notes {
        uuid id PK
        uuid user_id FK
        string type
        string format
        string title
        text content
        date date
        bool archived
    }
```

#### 1.3 Authentication Flow Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant US as user-service
    participant DB as PostgreSQL

    C->>US: POST /auth/login {email, password}
    US->>DB: SELECT user WHERE email = ?
    DB-->>US: user record
    US->>US: bcrypt.Compare(password, hash)
    US->>US: jwt.Generate(userID, email)
    US-->>C: {token, user}

    Note over C: Store token in localStorage

    C->>US: GET /users/me (Authorization: Bearer token)
    US->>US: jwt.Validate(token)
    US->>US: Extract userID from claims
    US->>DB: SELECT user WHERE id = userID
    DB-->>US: user record
    US-->>C: {user}
```

#### 1.4 Timer Start/Stop Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant TBS as timeblock-service
    participant DB as PostgreSQL

    C->>TBS: POST /timer/start {taskName, goalId, ...}
    TBS->>DB: DELETE FROM running_timers WHERE user_id = ?
    TBS->>DB: INSERT INTO running_timers
    DB-->>TBS: timer record
    TBS-->>C: {timer}

    Note over C: Timer running...

    C->>TBS: POST /timer/stop
    TBS->>DB: SELECT FROM running_timers WHERE user_id = ?
    DB-->>TBS: timer record
    TBS->>TBS: Calculate duration
    TBS->>DB: INSERT INTO time_entries
    TBS->>DB: DELETE FROM running_timers WHERE user_id = ?
    DB-->>TBS: time_entry record
    TBS-->>C: {timeEntry}
```

---

## 2. src/ARCHITECTURE.md の改善

### 追加するセクション

#### 2.1 Component Hierarchy Diagram

```mermaid
graph TB
    subgraph App
        Router[React Router]
    end

    subgraph Layout
        Header
        Sidebar
        Main[Main Content]
    end

    subgraph Pages
        Daily[DailyPage]
        Tasks[T01_TaskManagement]
        Notes[N01_NoteList / N02_NoteEdit]
        Analytics[A01_AnalyticsReport]
    end

    subgraph Common Components
        Timeline[TimeBlockTimeline]
        TaskCard
        TagBadge
        TimerWidget
    end

    subgraph UI Primitives
        Button
        Card
        Dialog
        Input
    end

    Router --> Layout
    Layout --> Header
    Layout --> Sidebar
    Layout --> Main
    Main --> Pages
    Daily --> Timeline
    Daily --> TaskCard
    Tasks --> TaskCard
    Timeline --> Card
    TaskCard --> TagBadge
    TaskCard --> Button
```

#### 2.2 Data Flow Diagram

```mermaid
flowchart LR
    subgraph Frontend
        Component -->|calls action| Store
        Store -->|updates| Component
    end

    subgraph API Layer
        Store -->|calls| APIService
        APIService -->|fetch| HttpClient
    end

    subgraph Backend
        HttpClient -->|HTTP| Service
        Service -->|response| HttpClient
    end

    HttpClient -->|extracts .data| APIService
    APIService -->|transforms| Store
```

#### 2.3 Store Interaction Diagram

```mermaid
graph TB
    subgraph Auth Flow
        useAuthStore -->|setToken| httpClient
        httpClient -->|401| useAuthStore
    end

    subgraph Data Fetching
        useInitializeData -->|fetchAll| useTaskStore
        useInitializeData -->|fetchAll| useTimeBlockStore
        useInitializeData -->|fetchSettings| useSettingsStore
    end

    subgraph Timezone Handling
        useSettingsStore -->|timezone| useTimeBlockStore
        useTimeBlockStore -->|localToUtc| timeblocksApi
        timeblocksApi -->|utcToLocal| useTimeBlockStore
    end
```

#### 2.4 Timezone Conversion Flow

```mermaid
sequenceDiagram
    participant UI as Component
    participant Store as useTimeBlockStore
    participant API as timeblocksApi
    participant BE as Backend

    UI->>Store: addTimeBlock({date: "2026-01-27", startTime: "09:00"})
    Store->>Store: getState().timezone → "Asia/Tokyo"
    Store->>API: createWithTimezone(input, "Asia/Tokyo")
    API->>API: localToUtcDateTime("2026-01-27", "09:00", "Asia/Tokyo")
    Note over API: → UTC: "2026-01-27T00:00:00Z"
    API->>BE: POST /timeblocks (UTC time)
    BE-->>API: {date, startTime} (UTC)
    API->>API: utcToLocalDateTime(response, "Asia/Tokyo")
    Note over API: → Local: "2026-01-27 09:00"
    API-->>Store: TimeBlock (local time)
    Store-->>UI: Updated state
```

---

## 3. kensan-ai/ARCHITECTURE.md の改善

### 追加するセクション

#### 3.1 Agent Execution Flow

```mermaid
flowchart TB
    subgraph API Layer
        Request[POST /chat]
        Response[ChatResponse]
    end

    subgraph Context Resolution
        Detect[Detect Situation]
        Load[Load AI Context]
        Replace[Replace Variables]
    end

    subgraph Agent Loop
        Call[Call Claude API]
        Check{tool_use?}
        Execute[Execute Tools]
        Append[Append Results]
        Return[Return Text]
    end

    subgraph Background
        Log[Log Interaction]
        Extract[Extract Facts]
    end

    Request --> Detect
    Detect --> Load
    Load --> Replace
    Replace --> Call
    Call --> Check
    Check -->|Yes| Execute
    Execute --> Append
    Append --> Call
    Check -->|No| Return
    Return --> Log
    Log --> Extract
    Extract --> Response
```

#### 3.2 Memory System Flow

```mermaid
flowchart LR
    subgraph Conversation
        Chat[User Chat]
    end

    subgraph Extraction
        Logger[InteractionLogger]
        Extractor[FactExtractor]
    end

    subgraph Storage
        Facts[(user_facts)]
        Memory[(user_memory)]
    end

    subgraph Batch
        Summarizer[ProfileSummarizer]
    end

    subgraph Future Chats
        Variable["{user_memory}"]
    end

    Chat --> Logger
    Logger --> Extractor
    Extractor --> Facts
    Facts --> Summarizer
    Summarizer --> Memory
    Memory --> Variable
    Variable --> Chat
```

#### 3.3 Tool Execution Detail

```mermaid
sequenceDiagram
    participant Agent as AgentRunner
    participant Registry as Tool Registry
    participant Tool as Tool Function
    participant DB as PostgreSQL

    Agent->>Agent: Claude returns tool_use
    Agent->>Agent: Inject user_id into args
    Agent->>Registry: execute_tool(name, args)
    Registry->>Tool: await tool_func(args)
    Tool->>DB: Query/Insert/Update
    DB-->>Tool: Result
    Tool-->>Registry: {result: ...}
    Registry-->>Agent: Formatted result
    Agent->>Agent: Append to messages
    Agent->>Agent: Continue loop
```

#### 3.4 Context Selection Flow

```mermaid
flowchart TB
    subgraph Input
        Time[Current Time]
        Explicit[Explicit Situation]
    end

    subgraph Detection
        Morning{05:00-10:00?}
        Evening{17:00-22:00?}
        Default[chat]
    end

    subgraph Loading
        Query[Query ai_contexts]
        ABTest{A/B Test?}
        Select[Select by Weight]
    end

    subgraph Output
        Context[AIContext]
    end

    Explicit -->|provided| Query
    Time --> Morning
    Morning -->|Yes| Query
    Morning -->|No| Evening
    Evening -->|Yes| Query
    Evening -->|No| Default
    Default --> Query
    Query --> ABTest
    ABTest -->|Yes| Select
    ABTest -->|No| Context
    Select --> Context
```

---

## 4. 実装順序

1. **backend/ARCHITECTURE.md** - ER図とデータフロー図の追加
2. **src/ARCHITECTURE.md** - コンポーネント階層とストア連携図の追加
3. **kensan-ai/ARCHITECTURE.md** - エージェントとツール実行フローの追加

---

## 5. 既存ドキュメントとの整合性

- 既存のテーブル一覧・パターン説明は維持
- Mermaid図は「Data Flow Diagrams」などの新セクションとして追加
- 重複を避け、図で補完する形式

---

## 期待される成果物

| ファイル | 追加する図 |
|---------|-----------|
| backend/ARCHITECTURE.md | System Architecture, ER Diagram, Auth Flow, Timer Flow |
| src/ARCHITECTURE.md | Component Hierarchy, Data Flow, Store Interaction, Timezone Flow |
| kensan-ai/ARCHITECTURE.md | Agent Execution, Memory System, Tool Execution, Context Selection |

---

## 補足

- Mermaid図はGitHub/VSCode/Obsidianで直接レンダリング可能
- 図の更新はコード変更時に必要に応じて実施
- 入門者向けの説明は mydocs/architecture_guide_for_beginners.md で既にカバー済み
