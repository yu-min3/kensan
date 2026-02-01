# 統一ベクトル検索アーキテクチャ実装計画

> **ステータス**: 計画完了、実装待ち
> **日付**: 2026-02-01
> **関連ADR**: 実装時に `docs/adr/0007-unified-search-architecture.md` を作成すること

## 背景

現状、検索・ストレージが2系統に分かれている:

- **notes + note_contents + note_content_chunks** (note-service/Go所有、MinIO)
- **documents** (kensan-ai/Python所有、Cloudflare R2)

これにより: データ重複、横断検索不可、ストレージ二重管理、チャンク検索未活用、という問題がある。

## ゴール

- `documents`テーブルとR2ストレージを廃止
- `notes` + `note_content_chunks` に検索を統一
- kensan-aiがMinIOからコンテンツを読み取り、チャンク分割・embedding生成

## 現状の理解

### ストレージ判定ロジック (note-service)

`backend/services/note/internal/service/service.go` の `shouldUseExternalStorage()`:

| コンテンツ | 保存先 | DB `content` カラム |
|---|---|---|
| Markdown/Drawio/Code < 100KB | DB inline | テキストあり |
| Markdown/Drawio/Code >= 100KB | MinIO | **NULL** |
| 画像 (全サイズ) | MinIO | **NULL** |
| PDF (全サイズ) | MinIO | **NULL** |

MinIO行きの場合、`note_contents.content = NULL`、`storage_key` にMinIOパスが入る。

### 検索ツール現状 (kensan-ai)

| ツール | 対象テーブル | 方式 |
|---|---|---|
| `semantic_search` | **documents** | pgvector cosine |
| `keyword_search` | **documents** | tsvector |
| `hybrid_search` | **documents** | semantic 70% + keyword 30% |
| `search_notes` | notes | tsvector |
| `semantic_search_notes` | notes | pgvector (notes.embedding) |
| `backfill_note_embeddings` | notes | embedding一括生成 |

### note_content_chunks テーブル

テーブルとHNSWインデックスは`backend/migrations/018_note_contents.sql`で作成済みだが、検索ツール側では未使用。

---

## 設計判断

| 項目 | 判断 | 理由 |
|------|------|------|
| MinIOアクセス方式 | boto3直接 (read-only) | presigned URLより簡潔、HTTP往復不要。boto3は既に依存関係にある |
| notes.embedding | 維持 | ノート全体の粗い検索用。チャンク検索と2段構え |
| チャンク戦略 | content_type別 | Markdown: 見出し区切り / Code: 固定長500トークン / Drawio: ラベル抽出→1ベクトル / Image,PDF: スキップ |
| インデックス起動 | polling | `WHERE index_status = 'pending'`。note-serviceが既にpendingを設定済み |
| 責務分離 | note-service=CRUD+ファイル保存、kensan-ai=embedding+チャンク+検索 | Go側にAI関心事を入れない |

---

## 実装タスク

### Task 1: DBマイグレーション

**ファイル**: `backend/migrations/037_unified_search.sql`

```sql
-- note_content_chunks に user_id, content_type を追加 (検索時のJOIN削減)
ALTER TABLE note_content_chunks
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE note_content_chunks
    ADD COLUMN IF NOT EXISTS content_type VARCHAR(50);

UPDATE note_content_chunks ncc SET user_id = n.user_id
FROM notes n WHERE ncc.note_id = n.id AND ncc.user_id IS NULL;

ALTER TABLE note_content_chunks ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON note_content_chunks(user_id);

-- documents テーブル削除
DROP TABLE IF EXISTS documents;
```

---

### Task 2: kensan-ai config.py — R2→MinIO

**ファイル**: `kensan-ai/src/kensan_ai/config.py`

- 削除: `r2_endpoint`, `r2_access_key`, `r2_secret_key`, `r2_bucket`
- 追加:
```python
# MinIO Storage (read-only, for fetching large note content)
minio_endpoint: str = "localhost:9000"
minio_access_key: str = "kensan"
minio_secret_key: str = "kensan-minio"
minio_bucket: str = "kensan-notes"
minio_use_ssl: bool = False
```

---

### Task 3: MinIO読み取りクライアント (新規)

**ファイル**: `kensan-ai/src/kensan_ai/storage/__init__.py` (空)
**ファイル**: `kensan-ai/src/kensan_ai/storage/minio_client.py`

```python
class MinIOReadClient:
    """Read-only S3 client for fetching note content from MinIO."""
    def __init__(self): ...  # boto3 client, config from get_settings()
    def download_text(self, storage_key: str) -> str: ...  # GetObject → decode utf-8

def get_minio_client() -> MinIOReadClient: ...  # singleton
```

boto3は既に依存関係に含まれている (旧R2用)。

---

### Task 4: チャンク分割サービス (新規)

**ファイル**: `kensan-ai/src/kensan_ai/indexing/__init__.py` (空)
**ファイル**: `kensan-ai/src/kensan_ai/indexing/chunker.py`

```python
@dataclass
class Chunk:
    index: int
    text: str
    token_count: int

def chunk_content(text: str, content_type: str) -> list[Chunk]:
    """content_typeに応じたチャンク分割ルーター"""

def chunk_markdown(text, max_tokens=500) -> list[Chunk]:
    """見出し(h1-h3)で分割、長いセクションは段落で追加分割"""

def chunk_code(text, max_tokens=500) -> list[Chunk]:
    """固定長分割 (50トークンoverlap)"""

def chunk_drawio(xml_text) -> list[Chunk]:
    """XMLからvalue属性を抽出、ラベル結合して1チャンク"""

def estimate_tokens(text) -> int:
    """日本語/英語混在のトークン数推定 (CJK ~1.5 chars/token, 英語 ~4 chars/token)"""
```

**チャンク戦略の詳細**:
- **Markdown**: `re.split(r'(?=^#{1,3}\s)', text, flags=re.MULTILINE)` で見出し分割。500トークン超のセクションは`\n\n`で段落分割。
- **Code**: `max_tokens * 3` 文字で切る。50トークン分のoverlap。
- **Drawio**: `re.findall(r'value="([^"]*)"', xml_text)` でラベル抽出。HTMLタグ除去。結合して1チャンク。
- **Image/PDF**: 空リスト返却 (将来対応)。

---

### Task 5: インデックスパイプライン (新規)

**ファイル**: `kensan-ai/src/kensan_ai/indexing/pipeline.py`

```python
async def reindex_pending_notes(user_id: UUID, batch_size: int = 10) -> dict:
    """
    フロー:
    1. SELECT notes WHERE user_id = $1 AND index_status = 'pending' LIMIT batch_size
    2. 各ノートについて:
       a. UPDATE notes SET index_status = 'processing' WHERE id = $1
       b. SELECT note_contents WHERE note_id = $1 ORDER BY sort_order
       c. 各コンテンツのテキスト取得:
          - content IS NOT NULL → inline使用
          - content IS NULL AND storage_key IS NOT NULL → MinIO download_text()
          - content_type IN ('image', 'pdf') → スキップ
       d. chunk_content(text, content_type) でチャンク分割
       e. EmbeddingService.generate_embeddings(texts) で一括embedding
       f. DELETE FROM note_content_chunks WHERE note_id = $1
       g. INSERT INTO note_content_chunks (note_id, note_content_id, user_id, content_type,
              chunk_index, chunk_text, token_count, embedding, embedding_model, processed_at)
       h. UPDATE notes SET index_status = 'indexed', indexed_at = NOW()
    3. エラー時: UPDATE notes SET index_status = 'failed'

    Returns: {"processed": N, "chunks_created": N}
    """
```

**依存**: Task 3 (MinIOクライアント), Task 4 (チャンク分割)

---

### Task 6: search_tools.py 書き換え

**ファイル**: `kensan-ai/src/kensan_ai/tools/search_tools.py`

**変更する3ツール** (documentsテーブル → note_content_chunksテーブル):

**semantic_search**:
```sql
SELECT ncc.id, ncc.chunk_text, ncc.chunk_index, ncc.content_type,
       ncc.note_id, n.title as note_title, n.type as note_type,
       1 - (ncc.embedding <=> $1::vector) as similarity
FROM note_content_chunks ncc
JOIN notes n ON ncc.note_id = n.id
WHERE ncc.user_id = $2 AND ncc.embedding IS NOT NULL
ORDER BY ncc.embedding <=> $1::vector
LIMIT $3
```

**keyword_search**:
```sql
SELECT ncc.id, ncc.chunk_text, ncc.note_id, n.title as note_title,
       ts_rank(to_tsvector('simple', ncc.chunk_text), plainto_tsquery('simple', $1)) as rank
FROM note_content_chunks ncc
JOIN notes n ON ncc.note_id = n.id
WHERE ncc.user_id = $2
  AND to_tsvector('simple', ncc.chunk_text) @@ plainto_tsquery('simple', $1)
ORDER BY rank DESC
LIMIT $3
```

**hybrid_search**: 上記2つをCTEで組み合わせ (semantic_weight デフォルト 0.7)

**backfill_note_embeddings → reindex_notes に置き換え**:
```python
@tool(name="reindex_notes",
      description="インデックス未生成のノートに対してチャンク分割・embedding生成を一括実行します。",
      input_schema={"properties": {"batch_size": {"type": "integer", "description": "最大件数 (デフォルト: 10)"}}, "required": []})
async def reindex_notes(args):
    from kensan_ai.indexing.pipeline import reindex_pending_notes
    return await reindex_pending_notes(user_id, batch_size)
```

**変更しないもの**: `search_notes`, `semantic_search_notes` (notesテーブル直接検索、そのまま)

**ALL_SEARCH_TOOLS**: `backfill_note_embeddings` → `reindex_notes`

---

### Task 7: storage_tools.py 削除 + __init__.py 更新

**削除**: `kensan-ai/src/kensan_ai/tools/storage_tools.py`

**更新**: `kensan-ai/src/kensan_ai/tools/__init__.py`
- `from kensan_ai.tools.storage_tools import ...` 全削除
- `ALL_TOOLS` から `*ALL_STORAGE_TOOLS` 除去
- `__all__` から `upload_file`, `get_file`, `delete_file`, `get_upload_url`, `ALL_STORAGE_TOOLS` 削除

---

### Task 8: agents/chat.py 更新

**ファイル**: `kensan-ai/src/kensan_ai/agents/chat.py`

- `ALLOWED_TOOLS` (line 75付近) から削除: `"upload_file"`, `"get_file"`, `"delete_file"`, `"get_upload_url"`
- `TOOL_GROUPS` (line 160付近) から削除: `"files"` グループ全体
- `TOOL_GROUPS["search"]` に追加: `"reindex_notes"`
- `INTENT_READ_PATTERNS` (line 204) から削除: `(["ファイル", "画像"], ["files"])`
- `INTENT_WRITE_PATTERNS` (line 222) から削除: `(["ファイル", "アップロード"], ["files"])`

---

### Task 9: docker-compose.yml 更新

**ファイル**: `docker-compose.yml` (ルート)

kensan-ai サービスの environment:
```yaml
# 追加
MINIO_ENDPOINT: minio:9000
MINIO_ACCESS_KEY: kensan
MINIO_SECRET_KEY: kensan-minio
MINIO_BUCKET: kensan-notes
MINIO_USE_SSL: "false"

# 削除
# R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET
```

`depends_on` に `minio` を追加。

---

### Task 10: db/queries/notes.py 更新

**ファイル**: `kensan-ai/src/kensan_ai/db/queries/notes.py`

- `create_note` / `update_note` 内の fire-and-forget embedding は維持 (notes.embedding 用)
- `backfill_embeddings` 関数: notes.embedding バックフィルとして維持しつつ、処理済みノートの `index_status = 'pending'` も設定してチャンクパイプラインをトリガー

---

### Task 11: ドキュメント更新

| ファイル | 変更内容 |
|---------|---------|
| `kensan-ai/ARCHITECTURE.md` | R2削除、MinIO read client、chunking/indexing pipeline、ツール一覧更新 |
| `backend/ARCHITECTURE.md` | documentsテーブル削除、note_content_chunks の user_id/content_type 追加 |
| `ARCHITECTURE.md` (ルート) | ストレージ構成図からR2削除、検索アーキテクチャ更新 |
| `docs/adr/0007-unified-search-architecture.md` | ADR新規作成 |

---

## タスク依存関係

```
Group A (並列):        Task 1 (DB), Task 2 (config), Task 4 (chunker)
Group B (Task 2後):    Task 3 (MinIOクライアント)
Group C (Task 3,4後):  Task 5 (パイプライン)
Group D (Task 1,5後):  Task 6 (search_tools書き換え)
Group E (依存なし):    Task 7 (storage_tools削除)
Group F (Task 6,7後):  Task 8 (chat.py更新)
Group G (Task 2後):    Task 9 (docker-compose)
Group H (Task 5後):    Task 10 (notes.py更新)
Group I (全完了後):    Task 11 (ドキュメント)
```

---

## 検証手順

1. **マイグレーション**: documents テーブルが消えること、note_content_chunks に user_id/content_type 追加を確認
2. **チャンク分割ユニットテスト**:
   - Markdownの見出し分割が正しいこと
   - 500トークン超セクションの段落分割
   - drawioのラベル抽出 (HTMLタグ除去含む)
   - 画像/PDFが空リスト返すこと
3. **インデックスパイプライン**: index_status='pending' のテストノート作成 → `reindex_pending_notes()` 実行 → note_content_chunks にチャンク生成確認
4. **MinIO読み取り**: 100KB超のMarkdownノートがMinIOからダウンロード・チャンク化されること
5. **検索ツール**: `semantic_search` / `keyword_search` / `hybrid_search` が note_content_chunks からヒットすること
6. **ツール登録**: kensan-ai起動時に storage_tools が登録されず、reindex_notes が登録されること
7. **E2E**: チャットで「〇〇について検索して」→ チャンクレベルでヒットすること

---

## 参照ファイル一覧

### 変更対象 (kensan-ai)
- `kensan-ai/src/kensan_ai/config.py`
- `kensan-ai/src/kensan_ai/tools/search_tools.py`
- `kensan-ai/src/kensan_ai/tools/storage_tools.py` (削除)
- `kensan-ai/src/kensan_ai/tools/__init__.py`
- `kensan-ai/src/kensan_ai/agents/chat.py`
- `kensan-ai/src/kensan_ai/db/queries/notes.py`

### 新規作成 (kensan-ai)
- `kensan-ai/src/kensan_ai/storage/__init__.py`
- `kensan-ai/src/kensan_ai/storage/minio_client.py`
- `kensan-ai/src/kensan_ai/indexing/__init__.py`
- `kensan-ai/src/kensan_ai/indexing/chunker.py`
- `kensan-ai/src/kensan_ai/indexing/pipeline.py`

### 変更対象 (backend)
- `backend/migrations/037_unified_search.sql` (新規)

### 変更対象 (インフラ)
- `docker-compose.yml`

### 変更対象 (ドキュメント)
- `ARCHITECTURE.md`
- `backend/ARCHITECTURE.md`
- `kensan-ai/ARCHITECTURE.md`
- `docs/adr/0007-unified-search-architecture.md` (新規)

### 読むべき既存ファイル (実装時の参考)
- `backend/services/note/internal/service/service.go` — ストレージ判定ロジック、index_status設定箇所
- `backend/services/note/internal/storage/client.go` — MinIOクライアント実装の参考
- `backend/services/note/internal/model.go` — NoteContent, NoteContentChunk, StorageProvider, IndexStatus の型定義
- `backend/migrations/018_note_contents.sql` — note_contents, note_content_chunks スキーマ
- `backend/migrations/015_documents_pgvector.sql` — 削除対象のdocumentsテーブル定義
- `backend/migrations/034_notes_embedding.sql` — notes.embedding カラム定義
- `kensan-ai/src/kensan_ai/embeddings/service.py` — EmbeddingService (generate_embedding, generate_embeddings)
- `kensan-ai/src/kensan_ai/tools/base.py` — @tool デコレータの使い方
