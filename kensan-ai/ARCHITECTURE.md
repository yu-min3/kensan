# Kensan AI Architecture

Python AI service using Claude with Direct Tools for the Kensan application.

---

## Table of Contents

1. [Overview](#overview)
2. [Direct Tools](#direct-tools)
3. [Agents](#agents)
4. [Context Management](#context-management)
5. [Database Queries](#database-queries)
6. [Embeddings & Search](#embeddings--search)
7. [Memory & Fact Extraction](#memory--fact-extraction)
8. [API Endpoints](#api-endpoints)
9. [Batch Processing](#batch-processing)
10. [Configuration](#configuration)
11. [Key Patterns](#key-patterns)
12. [Development](#development)

---

## Overview

### Architecture Style
- **FastAPI** application with async support
- **Agent-based** architecture using Claude's Direct Tools (function calling)
- **Context-aware** AI with situational personality selection
- **Memory system** with fact extraction and profile summarization

### Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | FastAPI |
| Runtime | Python 3.12+ |
| AI Model | Claude (Anthropic API) |
| Embeddings | OpenAI text-embedding-3-small |
| Database | PostgreSQL 16 + pgvector |
| Async DB | asyncpg |
| Storage | Cloudflare R2 (S3-compatible) |

### Directory Structure

```
kensan-ai/
├── src/kensan_ai/
│   ├── main.py                    # FastAPI app entry
│   ├── config.py                  # Settings (Pydantic BaseSettings)
│   ├── agents/                    # Agent implementations
│   │   ├── base.py               # AgentRunner core
│   │   ├── chat.py               # General chat agent
│   │   └── weekly_review.py      # Weekly review agent
│   ├── tools/                     # Direct Tools (18+ tools)
│   │   ├── base.py               # Tool registry & decorator
│   │   ├── db_tools.py           # Database operations (7 tools)
│   │   ├── memory_tools.py       # User memory (4 tools)
│   │   ├── search_tools.py       # Semantic/keyword search (3 tools)
│   │   └── storage_tools.py      # R2 file operations (4 tools)
│   ├── context/                   # AI context management
│   │   ├── detector.py           # Situation detection
│   │   ├── resolver.py           # Context loading
│   │   ├── variable_replacer.py  # Dynamic prompt variables
│   │   └── ab_selector.py        # A/B testing
│   ├── db/                        # Database layer
│   │   ├── connection.py         # AsyncPG pool
│   │   └── queries/              # Domain queries
│   ├── embeddings/                # Vector embeddings
│   │   └── service.py            # OpenAI embedding service
│   ├── extraction/                # Fact extraction
│   │   └── fact_extractor.py     # Claude-based extraction
│   ├── logging/                   # Interaction logging
│   │   └── interaction_logger.py
│   ├── api/                       # HTTP layer
│   │   ├── routes.py             # Endpoints
│   │   └── schemas.py            # Pydantic models
│   └── batch/                     # Offline jobs
│       ├── profile_summarizer.py
│       └── run_summarizer.py
├── Dockerfile
├── pyproject.toml
└── README.md
```

---

## Direct Tools

### Tool Infrastructure (`tools/base.py`)

Decorator-based tool registry:

```python
@tool(
    name="get_tasks",
    description="タスク一覧を取得します。",
    input_schema={
        "properties": {
            "user_id": {"type": "string", "description": "ユーザーID"},
            "completed": {"type": "boolean", "description": "完了状態"},
        },
        "required": ["user_id"],
    },
)
async def get_tasks(args: dict[str, Any]) -> dict[str, Any]:
    user_id = args.get("user_id")
    tasks = await db_get_tasks(user_id, completed=args.get("completed"))
    return {"tasks": tasks}
```

**Core Functions:**
```python
get_tool(name: str) -> ToolDefinition | None
get_all_tools() -> list[ToolDefinition]
get_tools_api_schema(tool_names?) -> list[dict]  # Anthropic API format
execute_tool(name: str, args: dict) -> Any
format_tool_result(result: Any) -> str
```

### Database Tools (`db_tools.py`)

| Tool | Description | Writes |
|------|-------------|--------|
| `get_goals_and_milestones` | 目標とマイルストーン取得 | No |
| `get_tasks` | タスク取得 (フィルタ可) | No |
| `create_task` | タスク作成 | Yes |
| `update_task` | タスク更新 | Yes |
| `get_time_blocks` | 予定取得 | No |
| `create_time_block` | 予定作成 | Yes |
| `get_time_entries` | 作業実績取得 | No |

**Example - create_time_block:**
```python
@tool(
    name="create_time_block",
    description="新しいタイムブロック（計画）を作成します。",
    input_schema={
        "properties": {
            "user_id": {"type": "string"},
            "date": {"type": "string", "description": "YYYY-MM-DD"},
            "start_time": {"type": "string", "description": "HH:MM"},
            "end_time": {"type": "string", "description": "HH:MM"},
            "task_name": {"type": "string"},
            "goal_id": {"type": "string"},
            "goal_name": {"type": "string"},
            "goal_color": {"type": "string"},
            "is_routine": {"type": "boolean"},
        },
        "required": ["user_id", "date", "start_time", "end_time", "task_name"],
    },
)
async def create_time_block(args: dict) -> dict:
    # Validates and creates time block
    block = await db_create_time_block(...)
    return {"timeBlock": block}
```

### Memory Tools (`memory_tools.py`)

| Tool | Description |
|------|-------------|
| `get_user_memory` | ユーザープロフィール取得 |
| `get_user_facts` | 抽出済みファクト取得 |
| `add_user_fact` | ファクト手動追加 |
| `get_recent_interactions` | 最近のやり取り取得 |

**Fact Types:**
- `preference` - 好み (例: "早朝が好き")
- `habit` - 習慣 (例: "毎朝7時に起きる")
- `skill` - スキル (例: "Pythonが得意")
- `goal` - 目標 (例: "来月までにリリース")
- `constraint` - 制約 (例: "平日は19時以降のみ")

### Search Tools (`search_tools.py`)

| Tool | Description |
|------|-------------|
| `semantic_search` | ベクトル類似検索 (pgvector) |
| `keyword_search` | 全文検索 (tsvector) |
| `hybrid_search` | セマンティック + キーワード複合 |

**Hybrid Search Algorithm:**
```python
combined_score = semantic_score * weight + keyword_score * (1 - weight)
# Default weight: 0.7 (semantic-heavy)
```

### Storage Tools (`storage_tools.py`)

| Tool | Description |
|------|-------------|
| `upload_file` | R2にファイルアップロード |
| `get_file` | ファイルメタデータ取得 |
| `delete_file` | ファイル削除 |
| `get_upload_url` | 署名付きアップロードURL生成 |

**Key Generation:**
```
users/{user_id}/{timestamp}/{uuid}_{filename}
```

---

## Agents

### AgentRunner (`agents/base.py`)

Core orchestrator for multi-turn Claude interactions:

```python
runner = AgentRunner(
    system_prompt="You are a helpful assistant...",
    allowed_tools=["get_tasks", "create_task"],
    max_turns=10,
    temperature=0.7,
)

result = await runner.run(
    user_message="明日の予定を作って",
    user_id="user-uuid",
)

print(result.text)        # Final response
print(result.tool_calls)  # List of executed tools
print(result.tokens_input, result.tokens_output)
```

**Execution Flow:**
1. Call Claude with system prompt + tools
2. If `tool_use` in response:
   - Execute each tool locally
   - Inject `user_id` automatically
   - Append results to conversation
   - Continue loop
3. If `end_turn` or no tools → return result

**Streaming:**
```python
async for chunk in runner.stream(user_message, user_id):
    print(chunk, end="")  # Real-time text output
```

### Chat Agent (`agents/chat.py`)

General conversation with task/time management:

```python
SYSTEM_PROMPT = """
あなたはKensanの学習管理アシスタントです。
ユーザーの目標達成をサポートします。

以下のツールを使えます：
- 目標・マイルストーンの確認
- タスクの作成・更新
- タイムブロックの計画
- 作業実績の記録
"""

ALLOWED_TOOLS = [
    "get_goals_and_milestones",
    "get_tasks", "create_task", "update_task",
    "get_time_blocks", "create_time_block",
    "get_time_entries",
]
```

### Weekly Review Agent (`agents/weekly_review.py`)

Structured retrospective:

```python
SYSTEM_PROMPT = """
週次レビューを行います。以下の観点で分析してください：
1. 目標への進捗
2. 今週の成果
3. 改善点
4. 来週へのアドバイス
"""

# Output parsing
def _parse_review_response(text: str) -> ReviewData:
    # Extracts sections: summary, good_points, improvement_points, advice
    # Detects bullet points: -, •, ・, ✓, →
```

**Response Format:**
```
### 今週の振り返り
(サマリー)

### よかった点
- ポイント1
- ポイント2

### 改善点
- ポイント1

### 来週へのアドバイス
- アドバイス1
```

---

## Context Management

### Situation Detection (`context/detector.py`)

Time-based context selection:

```python
class Situation(Enum):
    MORNING = "morning"   # 05:00-10:00
    EVENING = "evening"   # 17:00-22:00
    WEEKLY = "weekly"     # Explicit only
    CHAT = "chat"         # Default

def detect_situation(
    explicit: str | None = None,
    timezone: str = "Asia/Tokyo"
) -> Situation:
    if explicit:
        return Situation(explicit)

    hour = datetime.now(ZoneInfo(timezone)).hour
    if 5 <= hour < 10:
        return Situation.MORNING
    elif 17 <= hour < 22:
        return Situation.EVENING
    return Situation.CHAT
```

### Context Resolver (`context/resolver.py`)

Loads AI configuration from database:

```python
async def get_context(
    situation: Situation,
    user_id: str,
    experiment_id: str | None = None
) -> AIContext:
    # 1. If experiment_id → A/B test selection
    # 2. Else → default context for situation
    # 3. Apply variable replacement
    return context
```

**Database Schema (`ai_contexts`):**
```sql
id UUID PRIMARY KEY
name VARCHAR(100)
situation VARCHAR(20)  -- chat/morning/evening/weekly
system_prompt TEXT     -- May contain {variables}
allowed_tools TEXT[]   -- Tool names
max_turns INTEGER
temperature FLOAT
experiment_id UUID     -- For A/B testing
traffic_weight INTEGER
is_default BOOLEAN
is_active BOOLEAN
```

### Variable Replacement (`context/variable_replacer.py`)

Dynamic prompt personalization:

```python
SUPPORTED_VARIABLES = {
    "user_memory",      # Profile summary + strengths
    "today_schedule",   # Today's time blocks
    "pending_tasks",    # Incomplete tasks
    "recent_context",   # Last 3 interactions
}

# Example prompt with variables
system_prompt = """
{user_memory}

今日の予定:
{today_schedule}

未完了タスク:
{pending_tasks}
"""

# After replacement
system_prompt = """
Yu様はKubernetesとGo開発に興味があります。
強み: インフラ構築、問題解決
成長領域: 英語学習

今日の予定:
- 09:00〜10:00: CKA学習 [GK]
- 14:00〜16:00: Kensan開発 [OSS]

未完了タスク:
- CKA模擬試験 (期限: 2026-01-25)
- ブログ記事作成 (期限: なし)
"""
```

### A/B Testing (`context/ab_selector.py`)

Deterministic traffic allocation:

```python
def select_context(
    user_id: str,
    experiment_id: str,
    contexts: list[AIContext]
) -> AIContext:
    # SHA256 hash for deterministic bucket
    bucket = int(sha256(f"{user_id}:{experiment_id}").hexdigest()[:4], 16) % 100

    # Find context by cumulative weight
    cumulative = 0
    for ctx in contexts:
        cumulative += ctx.traffic_weight
        if bucket < cumulative:
            return ctx
```

---

## Database Queries

### Connection Pool (`db/connection.py`)

```python
# Singleton pool (min_size=2, max_size=10)
async def get_pool() -> asyncpg.Pool

# Context manager for connections
async with get_connection() as conn:
    rows = await conn.fetch("SELECT ...")
```

### Query Modules (`db/queries/`)

**goals.py:**
```python
async def get_goals_and_milestones(user_id: UUID) -> list[dict]:
    # Returns goals with nested milestones and task counts
    return [
        {
            "id": "...",
            "name": "GK取得",
            "color": "#0EA5E9",
            "milestones": [
                {
                    "id": "...",
                    "name": "CKA合格",
                    "status": "active",
                    "taskCount": {"total": 10, "completed": 3}
                }
            ]
        }
    ]
```

**tasks.py:**
```python
async def get_tasks(
    user_id: UUID,
    milestone_id: UUID | None = None,
    completed: bool | None = None,
    due_date: date | None = None
) -> list[dict]

async def create_task(user_id, name, milestone_id?, estimated_minutes?, due_date?)
async def update_task(task_id, user_id, name?, completed?, due_date?)
```

**time_blocks.py / time_entries.py:**
```python
async def get_time_blocks(
    user_id: UUID,
    target_date: date | None = None,
    start_date: date | None = None,
    end_date: date | None = None
) -> list[dict]

async def create_time_block(
    user_id, target_date, start_time, end_time, task_name,
    task_id?, milestone_id?, goal_id?, goal_color?, is_routine?
)
```

---

## Embeddings & Search

### Embedding Service (`embeddings/service.py`)

OpenAI embeddings wrapper:

```python
class EmbeddingService:
    MODEL = "text-embedding-3-small"  # 1536 dimensions

    async def generate_embedding(text: str) -> list[float]
    async def generate_embeddings(texts: list[str]) -> list[list[float]]
```

**Features:**
- Lazy initialization
- Text truncation (max 16000 chars)
- Batch processing

### Search Implementation

**Documents Table:**
```sql
id UUID PRIMARY KEY
user_id UUID
name VARCHAR(255)
content_type VARCHAR(50)  -- note/diary/learning_record
content TEXT
embedding vector(1536)    -- pgvector
created_at TIMESTAMP
```

**Semantic Search:**
```sql
SELECT id, name, content_type,
       1 - (embedding <=> $2) as similarity
FROM documents
WHERE user_id = $1
ORDER BY embedding <=> $2
LIMIT $3
```

**Keyword Search:**
```sql
SELECT id, name, content_type,
       ts_rank(to_tsvector('simple', content), query) as rank
FROM documents, plainto_tsquery('simple', $2) query
WHERE user_id = $1
  AND to_tsvector('simple', content) @@ query
ORDER BY rank DESC
```

**Hybrid Search:**
```sql
WITH semantic AS (...),
     keyword AS (...)
SELECT s.id, s.name,
       (s.similarity * $weight + COALESCE(k.rank, 0) * (1 - $weight)) as score
FROM semantic s
LEFT JOIN keyword k ON s.id = k.id
ORDER BY score DESC
```

---

## Memory & Fact Extraction

### Fact Extractor (`extraction/fact_extractor.py`)

Automatic extraction from conversations:

```python
class FactExtractor:
    VALID_TYPES = ["preference", "habit", "skill", "goal", "constraint"]

    async def extract_and_save(
        user_id: str,
        user_input: str,
        ai_output: str,
        interaction_id: str
    ) -> list[dict]:
        # 1. Call Claude with extraction prompt
        # 2. Parse JSON response
        # 3. Validate and deduplicate
        # 4. Save to user_facts table
```

**Extraction Prompt:**
```
以下の会話からユーザーに関する事実を抽出してください。
明示的に述べられた事実のみ抽出し、推測は避けてください。

会話:
ユーザー: {user_input}

JSON形式で出力:
[
  {"type": "preference", "content": "...", "confidence": 0.9}
]
```

**Database Schema (`user_facts`):**
```sql
id UUID PRIMARY KEY
user_id UUID
fact_type VARCHAR(50)
content TEXT
source VARCHAR(50)      -- ai_extraction/conversation
confidence FLOAT        -- 0.0-1.0
expires_at TIMESTAMP    -- Optional expiration
source_interaction_id UUID
created_at TIMESTAMP
```

### Interaction Logger (`logging/interaction_logger.py`)

Records all AI conversations:

```python
async def log(
    user_id: str,
    session_id: str,
    situation: str,
    user_input: str,
    ai_output: str,
    tool_calls: list[dict] | None = None,
    tokens_input: int | None = None,
    tokens_output: int | None = None,
    latency_ms: int | None = None,
    context_id: str | None = None
) -> str:  # Returns interaction_id

async def add_feedback(
    interaction_id: str,
    rating: int,      # 1-5
    feedback: str | None = None
)

async def get_user_interactions(
    user_id: str,
    limit: int = 10,
    situation: str | None = None
) -> list[dict]
```

---

## API Endpoints

### Routes (`api/routes.py`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | ヘルスチェック |
| POST | `/chat` | 非ストリーミングチャット |
| POST | `/chat/stream` | ストリーミングチャット |
| POST | `/advice` | 朝の計画アドバイス |
| POST | `/reflect` | 夕方の振り返り |
| POST | `/review` | 週次レビュー |
| POST | `/ai/reviews/generate` | レビュー生成 (フロントエンド用) |
| GET | `/ai/reviews` | レビュー一覧 |
| GET | `/ai/reviews/{id}` | レビュー詳細 |
| POST | `/ai/ask` | 質問応答 |
| POST | `/interactions/{id}/feedback` | フィードバック送信 |

### Authentication

JWT token from `Authorization: Bearer <token>`:

```python
def get_user_id_from_token(authorization: str) -> str:
    token = authorization.replace("Bearer ", "")
    payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    return payload["sub"]  # user_id
```

### Request/Response Examples

**POST /chat:**
```json
// Request
{
  "message": "明日の予定を作って",
  "session_id": "optional-session-id"
}

// Response
{
  "message": "明日の予定を作成しました...",
  "session_id": "abc123",
  "tool_calls": [
    {"name": "create_time_block", "input": {...}, "output": {...}}
  ],
  "tokens_input": 1500,
  "tokens_output": 200
}
```

**POST /ai/reviews/generate:**
```json
// Request
{
  "weekStart": "2026-01-20",
  "weekEnd": "2026-01-26"
}

// Response
{
  "id": "review-uuid",
  "userId": "user-uuid",
  "weekStart": "2026-01-20",
  "weekEnd": "2026-01-26",
  "summary": "今週は...",
  "goodPoints": ["ポイント1", "ポイント2"],
  "improvementPoints": ["改善点1"],
  "advice": ["アドバイス1"],
  "createdAt": "2026-01-26T12:00:00Z"
}
```

---

## Batch Processing

### Profile Summarizer (`batch/profile_summarizer.py`)

Aggregates facts into user profiles:

```python
class ProfileSummarizer:
    async def run_batch(
        since: datetime | None = None,
        days: int = 1
    ):
        # 1. Find users with new facts
        # 2. For each user:
        #    - Get existing profile
        #    - Fetch top 50 facts (by confidence)
        #    - Generate summary via Claude
        #    - Extract strengths (skill type, confidence >= 0.7)
        #    - Extract growth areas (goal/constraint types)
        #    - Upsert user_memory record
```

**Database Schema (`user_memory`):**
```sql
user_id UUID PRIMARY KEY
profile_summary TEXT        -- 300 chars max
preferences JSONB
strengths TEXT[]           -- From skills
growth_areas TEXT[]        -- From goals/constraints
last_updated TIMESTAMP
```

### CLI Usage

```bash
# Summarize users with facts from last 1 day
python -m kensan_ai.batch.run_summarizer --days 1

# Summarize since specific date
python -m kensan_ai.batch.run_summarizer --since 2026-01-01T00:00:00

# Verbose mode
python -m kensan_ai.batch.run_summarizer --days 7 --verbose
```

---

## Configuration

### Settings (`config.py`)

Pydantic BaseSettings with environment variables:

```python
class Settings(BaseSettings):
    # Database
    DATABASE_URL: str | None = None
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "kensan"
    DB_PASSWORD: str = "kensan"
    DB_NAME: str = "kensan"

    # AI
    ANTHROPIC_API_KEY: str
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"
    OPENAI_API_KEY: str | None = None
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Storage
    R2_ENDPOINT: str | None = None
    R2_ACCESS_KEY: str | None = None
    R2_SECRET_KEY: str | None = None
    R2_BUCKET: str | None = None

    # Server
    SERVER_PORT: int = 8089
    SERVER_ENV: str = "development"
    HOST: str = "0.0.0.0"

    # Agent
    DEFAULT_MAX_TURNS: int = 10
    DEFAULT_TEMPERATURE: float = 0.7

    # Security
    JWT_SECRET: str = "dev-secret-key"
```

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
# OR individual components
DB_HOST=localhost
DB_PORT=5432
DB_USER=kensan
DB_PASSWORD=kensan
DB_NAME=kensan

# Optional
OPENAI_API_KEY=sk-...          # For embeddings
R2_ENDPOINT=https://...        # For file storage
JWT_SECRET=your-secret-key
```

---

## Key Patterns

### Tool Registration Pattern

```python
# 1. Define tool with decorator
@tool(name="...", description="...", input_schema={...})
async def my_tool(args: dict) -> dict:
    return {"result": "..."}

# 2. Add to category list
ALL_MY_TOOLS = [my_tool]

# 3. Export from __init__.py
from .my_tools import my_tool, ALL_MY_TOOLS

# 4. Add to ALL_TOOLS aggregation
ALL_TOOLS = [*ALL_DB_TOOLS, *ALL_MY_TOOLS, ...]
```

### User ID Injection

AgentRunner automatically injects `user_id`:

```python
# In AgentRunner.run():
for tool_use in tool_uses:
    args = tool_use.input
    if self.user_id and "user_id" not in args:
        args["user_id"] = self.user_id
    result = await execute_tool(tool_use.name, args)
```

### Background Task Pattern

```python
# Non-blocking fact extraction
@router.post("/chat")
async def chat(request: ChatRequest):
    result = await runner.run(request.message, user_id)

    # Log interaction
    interaction_id = await logger.log(...)

    # Fire-and-forget fact extraction
    asyncio.create_task(
        extractor.extract_and_save(user_id, request.message, result.text, interaction_id)
    )

    return ChatResponse(message=result.text, ...)
```

### Context Variable Pattern

```python
# Define variable resolver
async def resolve_user_memory(user_id: str) -> str:
    memory = await get_user_memory(user_id)
    if not memory:
        return "(ユーザー情報なし)"
    return f"{memory.profile_summary}\n強み: {', '.join(memory.strengths)}"

# Register variable
VARIABLE_RESOLVERS = {
    "user_memory": resolve_user_memory,
    "today_schedule": resolve_today_schedule,
    ...
}

# Replace in prompt
async def replace_variables(prompt: str, user_id: str) -> str:
    for var, resolver in VARIABLE_RESOLVERS.items():
        if f"{{{var}}}" in prompt:
            value = await resolver(user_id)
            prompt = prompt.replace(f"{{{var}}}", value)
    return prompt
```

---

## Development

### Running Locally

```bash
cd kensan-ai

# Install dependencies
pip install -e .

# Run server
uvicorn kensan_ai.main:app --reload --port 8089
```

### Docker

```bash
# From project root
docker compose up ai-service
```

### Adding a New Tool

1. Create function in appropriate file (`db_tools.py`, `memory_tools.py`, etc.)
2. Decorate with `@tool(name, description, input_schema)`
3. Add to `ALL_*_TOOLS` list
4. Export from `tools/__init__.py`
5. Include in `ALL_TOOLS` aggregation

### Adding a New Situation

1. Add enum to `Situation` in `context/detector.py`
2. Add detection logic if time-based
3. Create system prompt in `agents/`
4. Add `ai_contexts` record in database

### Testing

```bash
# Run tests
pytest

# With coverage
pytest --cov=kensan_ai

# Specific test file
pytest tests/test_tools.py -v
```

---

## Data Flow Diagrams

### Chat Flow

```
POST /chat
    ↓
Extract user_id from JWT
    ↓
Detect situation (time-based or explicit)
    ↓
ContextResolver.get_context()
    ├─ Load ai_contexts from DB
    └─ Replace {variables} in prompt
    ↓
AgentRunner.run()
    ├─ Call Claude with tools
    ├─ Execute tool_use locally (inject user_id)
    ├─ Append results, continue loop
    └─ Return AgentResult
    ↓
InteractionLogger.log()
    ↓
asyncio.create_task(FactExtractor.extract_and_save())
    ↓
Return ChatResponse
```

### Memory Building Flow

```
Chat interaction
    ↓
InteractionLogger.log()
    ↓
FactExtractor.extract_and_save() (background)
    ├─ Claude extracts facts
    ├─ Validate & deduplicate
    └─ Save to user_facts
    ↓
Batch job (nightly): ProfileSummarizer
    ├─ Find users with new facts
    ├─ Generate profile summary via Claude
    └─ Upsert user_memory
    ↓
Future chats use {user_memory} variable
```

---

## Dependencies

```
anthropic>=0.40.0
openai>=1.50.0
fastapi>=0.115.0
uvicorn>=0.32.0
asyncpg>=0.30.0
pydantic>=2.10.0
pydantic-settings>=2.6.0
boto3>=1.35.0
python-jose>=3.3.0
```
