# Note統一化 実装計画

## 概要

DiaryEntry, LearningRecord, Memo を統一した `Note` エンティティに移行する。

---

## 1. 現状のDB構造

### diary_entries
```sql
CREATE TABLE diary_entries (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    tags TEXT[],  -- 自由テキスト配列
    created_at, updated_at,
    UNIQUE(user_id, date)
);
```

### learning_records
```sql
CREATE TABLE learning_records (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    format VARCHAR(20) NOT NULL,  -- 'markdown' | 'drawio'
    milestone_id UUID,
    milestone_name VARCHAR(255),
    goal_id UUID,
    goal_name VARCHAR(255),
    goal_color VARCHAR(7),
    tag_ids UUID[],  -- tagsテーブル参照
    related_time_entry_ids UUID[],
    file_url TEXT,
    created_at, updated_at
);
```

### memos
```sql
CREATE TABLE memos (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    archived BOOLEAN,
    created_at, updated_at
);
```

---

## 2. 新しいDB構造

### notes テーブル
```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 識別
    type VARCHAR(20) NOT NULL CHECK (type IN ('diary', 'learning', 'memo')),

    -- 基本情報
    title VARCHAR(255),  -- memo以外は必須（アプリ側でバリデーション）
    content TEXT,
    format VARCHAR(20) NOT NULL DEFAULT 'markdown' CHECK (format IN ('markdown', 'drawio')),

    -- 日付（diary: 必須、learning/memo: 任意）
    date DATE,

    -- Task連携（任意）
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

    -- Goal/Milestone連携（任意）
    milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
    -- 非正規化フィールド
    milestone_name VARCHAR(255),
    goal_name VARCHAR(255),
    goal_color VARCHAR(7),

    -- TimeEntry連携
    related_time_entry_ids UUID[] DEFAULT '{}',

    -- ファイルURL（将来のR2連携用）
    file_url TEXT,

    -- ステータス
    archived BOOLEAN DEFAULT FALSE,

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_type ON notes(type);
CREATE INDEX idx_notes_date ON notes(date);
CREATE INDEX idx_notes_user_type ON notes(user_id, type);
CREATE INDEX idx_notes_task_id ON notes(task_id);
CREATE INDEX idx_notes_milestone_id ON notes(milestone_id);
CREATE INDEX idx_notes_goal_id ON notes(goal_id);
CREATE INDEX idx_notes_archived ON notes(archived);

-- 全文検索インデックス
CREATE INDEX idx_notes_search ON notes
    USING GIN (to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(content, '')));

-- 日記の一意制約（1日1エントリ）
CREATE UNIQUE INDEX idx_notes_diary_unique
    ON notes(user_id, date)
    WHERE type = 'diary';
```

### note_tags テーブル（多対多）
```sql
CREATE TABLE note_tags (
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id);
```

---

## 3. バックエンド変更

### 新規サービス: note-service
既存の diary-service, record-service, memo-service を統合

```
backend/services/note/
├── cmd/main.go
├── internal/
│   ├── model.go      # Note, NoteType, NoteFormat
│   ├── handler/
│   ├── service/
│   └── repository/
└── Makefile
```

### model.go
```go
type NoteType string
const (
    NoteTypeDiary    NoteType = "diary"
    NoteTypeLearning NoteType = "learning"
    NoteTypeMemo     NoteType = "memo"
)

type NoteFormat string
const (
    NoteFormatMarkdown NoteFormat = "markdown"
    NoteFormatDrawio   NoteFormat = "drawio"
)

type Note struct {
    ID                  string     `json:"id"`
    UserID              string     `json:"userId"`
    Type                NoteType   `json:"type"`
    Title               *string    `json:"title,omitempty"`
    Content             string     `json:"content"`
    Format              NoteFormat `json:"format"`
    Date                *string    `json:"date,omitempty"`
    TaskID              *string    `json:"taskId,omitempty"`
    MilestoneID         *string    `json:"milestoneId,omitempty"`
    MilestoneName       *string    `json:"milestoneName,omitempty"`
    GoalID              *string    `json:"goalId,omitempty"`
    GoalName            *string    `json:"goalName,omitempty"`
    GoalColor           *string    `json:"goalColor,omitempty"`
    TagIDs              []string   `json:"tagIds,omitempty"`
    RelatedTimeEntryIDs []string   `json:"relatedTimeEntryIds,omitempty"`
    FileURL             *string    `json:"fileUrl,omitempty"`
    Archived            bool       `json:"archived"`
    CreatedAt           time.Time  `json:"createdAt"`
    UpdatedAt           time.Time  `json:"updatedAt"`
}

type NoteFilter struct {
    Types       []NoteType  // フィルタ: ['diary', 'learning']
    GoalID      *string
    MilestoneID *string
    TaskID      *string
    TagIDs      []string
    DateFrom    *string
    DateTo      *string
    Archived    *bool
    Query       *string     // 全文検索
}
```

### APIエンドポイント
```
GET    /notes                  # フィルタ付き一覧
GET    /notes/:id              # 詳細取得
POST   /notes                  # 作成
PUT    /notes/:id              # 更新
DELETE /notes/:id              # 削除
GET    /notes/search           # 全文検索
POST   /notes/:id/archive      # アーカイブ
```

### ポート割り当て
| Service | Port | 状態 |
|---------|------|------|
| note | 8091 | 新規 |
| diary | 8087 | 廃止予定 |
| record | 8086 | 廃止予定 |
| memo | 8090 | 廃止予定 |

---

## 4. マイグレーション

### 010_create_notes.sql
```sql
-- 1. Create new tables
-- (上記のCREATE TABLE文)

-- 2. Migrate diary_entries
INSERT INTO notes (id, user_id, type, title, content, format, date, archived, created_at, updated_at)
SELECT id, user_id, 'diary', title, content, 'markdown', date, FALSE, created_at, updated_at
FROM diary_entries;

-- diary_entries.tags -> note_tags (自由テキストからTag作成 or スキップ)
-- 注: 既存の自由テキストタグは後で手動マッピングが必要

-- 3. Migrate learning_records
INSERT INTO notes (id, user_id, type, title, content, format, milestone_id, milestone_name,
                   goal_id, goal_name, goal_color, related_time_entry_ids, file_url,
                   archived, created_at, updated_at)
SELECT id, user_id, 'learning', title, content, format, milestone_id, milestone_name,
       goal_id, goal_name, goal_color, related_time_entry_ids, file_url,
       FALSE, created_at, updated_at
FROM learning_records;

-- learning_records.tag_ids -> note_tags
INSERT INTO note_tags (note_id, tag_id)
SELECT lr.id, unnest(lr.tag_ids)
FROM learning_records lr
WHERE lr.tag_ids IS NOT NULL AND array_length(lr.tag_ids, 1) > 0;

-- 4. Migrate memos
INSERT INTO notes (id, user_id, type, title, content, format, archived, created_at, updated_at)
SELECT id, user_id, 'memo', NULL, content, 'markdown', archived, created_at, updated_at
FROM memos;
```

### 011_drop_legacy_tables.sql（確認後に実行）
```sql
DROP TABLE IF EXISTS diary_entries CASCADE;
DROP TABLE IF EXISTS learning_records CASCADE;
DROP TABLE IF EXISTS memos CASCADE;
```

---

## 5. フロントエンド変更

### 新しい型定義 (types/index.ts)
```typescript
export type NoteType = 'diary' | 'learning' | 'memo'
export type NoteFormat = 'markdown' | 'drawio'

export interface Note {
  id: string
  type: NoteType
  title?: string
  content: string
  format: NoteFormat
  date?: string
  taskId?: string
  milestoneId?: string
  milestoneName?: string
  goalId?: string
  goalName?: string
  goalColor?: string
  tagIds?: string[]
  relatedTimeEntryIds?: string[]
  fileUrl?: string
  archived: boolean
  createdAt: Date
  updatedAt: Date
}
```

### 新しいStore (useNoteStore.ts)
- 統一されたCRUD
- type別フィルタ (`getByType('diary')`)
- 統一検索 (`search(query, { types: ['diary', 'learning'] })`)

### 新しいコンポーネント
- `NoteEditor.tsx` - 統一エディタ（Markdown/drawio切替）
- `NoteList.tsx` - 統一一覧（type別スタイル）
- `NoteSearchBar.tsx` - 統一検索UI

### ページ統合
```
Before:                    After:
L01_LearningRecordList  → N01_NoteList (type filter in URL)
L02_LearningRecordEdit  → N02_NoteEdit
D01_DiaryList           → N01_NoteList?type=diary
D02_DiaryEdit           → N02_NoteEdit?type=diary
(memo: FloatingMemo)    → same (uses useNoteStore)
```

---

## 6. 移行ステップ

### Phase 1: バックエンド準備
1. [ ] マイグレーションSQL作成 (010_create_notes.sql)
2. [ ] note-service 新規作成
3. [ ] テスト・動作確認

### Phase 2: フロントエンド準備
4. [ ] Note型定義追加
5. [ ] notesApi, useNoteStore 作成
6. [ ] NoteEditor コンポーネント作成

### Phase 3: 画面統合
7. [ ] N01_NoteList, N02_NoteEdit 作成
8. [ ] ルーティング更新
9. [ ] 旧画面からリダイレクト

### Phase 4: クリーンアップ
10. [ ] 旧サービス廃止 (diary, record, memo)
11. [ ] 旧テーブル削除マイグレーション

---

## 7. 検索機能

### 統一検索API
```
GET /notes/search?q=Istio&types=diary,learning&goal_id=xxx
```

### pgvector連携（将来）
```sql
-- embedding列追加
ALTER TABLE notes ADD COLUMN embedding vector(1536);

-- ハイブリッド検索
SELECT * FROM notes
WHERE to_tsvector('simple', title || ' ' || content) @@ to_tsquery(:query)
   OR embedding <-> :query_embedding < 0.5
ORDER BY
    ts_rank(to_tsvector('simple', title || ' ' || content), to_tsquery(:query)) DESC,
    embedding <-> :query_embedding
LIMIT 20;
```

---

## 8. 影響範囲

### 廃止するもの
- `diary-service` (port 8087)
- `record-service` (port 8086)
- `memo-service` (port 8090)
- `useDiaryStore.ts`
- `useLearningRecordStore.ts`
- `useMemoStore.ts`
- `D01_DiaryList.tsx`, `D02_DiaryEdit.tsx`
- `L01_LearningRecordList.tsx`, `L02_LearningRecordEdit.tsx`

### 残すもの
- `tags` テーブル - Note以外(Task等)でも使用
- `task_tags` テーブル - Task用
- `note_tags` テーブル - Note用（新規）
