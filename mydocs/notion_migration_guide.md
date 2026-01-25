# Notion → Kensan マイグレーションガイド

Claude Codeを使用した手動マイグレーションのガイド。

---

## 1. Notion MCP セットアップ

### 1.1 概要

[Notion MCP](https://developers.notion.com/docs/mcp)を使用すると、Claude CodeからNotionのデータを直接読み書きできる。

**メリット:**
- エクスポート不要でリアルタイムにデータ取得
- Markdown形式で効率的にLLMに渡せる
- 検索、ページ取得、コメント追加など21ツール利用可能

**参考:**
- [公式ドキュメント](https://developers.notion.com/docs/get-started-with-mcp)
- [GitHub: notion-mcp-server](https://github.com/makenotion/notion-mcp-server)
- [Notionブログ: Hosted MCP Server](https://www.notion.com/blog/notions-hosted-mcp-server-an-inside-look)

### 1.2 セットアップ手順

#### 方法A: Hosted MCP（推奨・簡単）

1. **Claude CodeでMCP追加**
   ```bash
   claude mcp add --transport http notion https://mcp.notion.com/mcp
   ```

2. **Claude Code再起動**

3. **初回使用時にブラウザでOAuth認証**
   - Notionツールを使おうとするとブラウザが開く
   - Notionにログインして許可するだけ

#### 方法B: ローカル実行（Integration Token使用）

1. **Notion Integration作成**
   - https://www.notion.so/profile/integrations にアクセス
   - 「新しいインテグレーション」を作成
   - トークン (`ntn_****`) を取得

2. **Notionページに接続を許可**
   - マイグレーション対象のDB/ページを開く
   - 右上 `...` → `接続` → 作成したインテグレーションを追加

3. **Claude Code MCP設定**
   ```bash
   claude mcp add --transport stdio notion \
     --env NOTION_TOKEN=ntn_your_token \
     -- npx -y @notionhq/notion-mcp-server
   ```

4. **Claude Code再起動**

### 1.3 利用可能なツール（主要なもの）

| ツール | 説明 |
|--------|------|
| `search-content` | キーワード検索 |
| `retrieve-a-page` | ページ内容取得 |
| `query-data-source` | DB検索・フィルタ |
| `retrieve-a-database` | DB構造取得 |

---

## 2. Curation方針

### 2.1 優先事項

| 優先度 | 項目 | 詳細 |
|--------|------|------|
| **高** | タイトル生成 | 内容から検索しやすいタイトルを生成 |
| **高** | 重複検出・マージ | 同じトピックの断片的なメモを統合 |
| **高** | タグ付け | 検索性向上のためタグを適切に付与 |
| **中** | 内容整形 | Markdown化、構造化（元文は保持） |
| **低** | 要約 | 長文の場合のみ冒頭に要約追加 |
| **対象外** | Goal/Milestone推定 | Notionデータに対応する概念がない |

### 2.2 原則

1. **元の言葉を残す**
   - 自分の言葉・表現は極力そのまま保持
   - 整形はするが、言い換えや削除は最小限

2. **検索しやすさ重視**
   - タイトルは内容を端的に表す
   - 関連キーワードをタグとして付与
   - 同じトピックは1つのNoteにまとめる

3. **継続的に整理できる構造**
   - 完璧を目指さず、後で追記・修正しやすい形に
   - タグは後から変更可能なので暫定でOK

### 2.3 タグ設計案

元のNotion DB_タグを参考に:

| タグ | 用途 |
|------|------|
| `inbox` | 未整理・要分類 |
| `tech/go` | Go言語関連 |
| `tech/data` | データエンジニアリング |
| `tech/infra` | インフラ・DevOps |
| `book` | 読書メモ |
| `idea` | 思いつき・アイデア |
| `english` | 英語学習 |
| `life` | 生活・育児など |

---

## 3. マイグレーション手順

### Phase 1: 準備

1. MCP設定完了を確認
2. Kensan Note APIの動作確認
3. タグをKensanに事前登録

### Phase 2: データ取得（Claude Code）

```
# Claude Codeで実行
NotionのメモDBから全件取得して、JSON形式で出力して
```

### Phase 3: Curation（Claude Code）

```
# 取得したデータに対して
以下の方針でcurationして:
1. 重複・類似エントリを検出してグループ化
2. 各グループに適切なタイトルを提案
3. タグを提案
4. 内容をMarkdown整形（元文保持）
```

### Phase 4: 確認・調整

- 生成されたタイトル、タグを確認
- 必要に応じて修正指示

### Phase 5: インポート（Claude Code）

```
# Kensan APIを使用してインポート
curatioした結果をKensan Note APIでインポートして
- type: learning (メモ類)
- format: markdown
- タグは対応するtag_idに変換
```

---

## 4. マイグレーション対象

### 4.1 メモ一覧 DB

| Notionカラム | Kensan Note |
|--------------|-------------|
| 名前 | title |
| DB_タグ | tagIds |
| 日付 | createdAt |
| 内容 | content (NoteContent) |

→ `type: learning` としてインポート

### 4.2 日記 DB

| Notionカラム | Kensan Note |
|--------------|-------------|
| 作成日時 | date |
| タイトル | title |
| 詳細 | content (type: diary) |
| 技術内容 | 別Note (type: learning) として分離 |

→ 1行から2つのNoteを作成する可能性あり

---

## 5. 注意事項

- **バックアップ**: Notionデータはエクスポートしてバックアップ推奨
- **段階的実行**: 全件一括ではなく、カテゴリごとに段階的に実行
- **確認ループ**: AI生成結果は必ず目視確認してからインポート

---

## 6. MCP検証結果（2026-01-25）

### 6.1 検証環境

- Notion MCP: Hosted MCP (`https://mcp.notion.com/mcp`)
- 対象DB: `DB_メモ一覧` (collection://f7162be4-9262-4964-bd37-4a5e7a41fca2)

### 6.2 利用可能なツール（実際に確認）

| ツール | 用途 | 備考 |
|--------|------|------|
| `notion-search` | セマンティック検索 | data_source_urlでDB絞り込み可能 |
| `notion-fetch` | ページ/DB詳細取得 | ID or URLで指定 |
| `notion-create-pages` | ページ作成 | - |
| `notion-update-page` | ページ更新 | - |

### 6.3 取得可能なデータ

| 項目 | 可否 | 詳細 |
|------|------|------|
| ページ内容 | ✅ | Markdown形式（Notion拡張記法含む） |
| プロパティ | ✅ | タイトル、日付、タグ（URLとして） |
| タグ関連 | ✅ | NotionページURLで取得（要マッピング） |
| 画像 | ⚠️ | 署名付きS3 URL（1時間で期限切れ） |
| **全件一括取得** | ❌ | **セマンティック検索のみ** |

### 6.4 トークン数推定

サンプル取得結果から推定:

| メモタイプ | 文字数（画像URL除く） | 推定トークン |
|------------|----------------------|-------------|
| 短いメモ (Tips、リンク集) | ~500文字 | ~150トークン |
| 中程度 (AWS サービス解説) | ~1,500文字 | ~500トークン |
| 長いメモ (RAG勉強、コード含む) | ~4,000文字 | ~1,500トークン |
| **平均** | ~1,500文字 | **~500トークン** |

**全体見積もり:**
- AWS関連: 約50件 → 約25,000トークン
- 全体100件と仮定 → 約50,000トークン
- 画像URL込みの場合は2-3倍になる可能性あり

### 6.5 制約と対応策

| 制約 | 対応策 |
|------|--------|
| 全件一括取得不可 | キーワード別に複数回検索（例: "AWS", "英語", "メモ"等） |
| 画像URL期限切れ | **取得後すぐにダウンロードすれば可能**（下記参照） |
| タグがURLで返る | タグDBを事前取得してURL→名前のマッピングテーブル作成 |

### 6.6 画像移行（検証済み）

**結論: 画像移行は可能**

署名付きS3 URLは1時間有効。取得直後にダウンロードすれば問題なく移行できる。

**検証結果:**
```bash
$ curl -o test.png "<署名付きURL>"
$ file test.png
test.png: PNG image data, 2236 x 708, 8-bit/color RGBA (211KB)
```

**移行ワークフロー:**
```
1. notion-fetch でページ取得
2. <image source="..."> タグからURL抽出（正規表現等）
3. curl で即座にダウンロード（/tmp等へ）
4. Kensan MinIO にアップロード
5. Markdown内のURLを差し替え
```

**代替方法の比較:**

| 方法 | メリット | デメリット |
|------|----------|------------|
| **MCP + curl** | 自動化可能、Claude Codeで完結 | 1時間以内に処理必要 |
| **Notionエクスポート** | 画像も一括取得、確実 | 手動、ファイル構造が複雑 |
| **Notion API直接** | 柔軟性高い | 実装が必要 |

**推奨**: MCP + curl で自動化。1ページずつ処理すれば時間制限は問題にならない。

### 6.7 サンプルデータ

**DB_メモ一覧スキーマ:**
```sql
CREATE TABLE "collection://f7162be4-9262-4964-bd37-4a5e7a41fca2" (
  url TEXT UNIQUE,
  createdTime TEXT,
  "日付" TEXT NOT NULL,  -- created_time
  "DB_タグ" TEXT,        -- relation → DB_タグ一覧
  "名前" TEXT            -- title
)
```

**取得例（AWS ClientVPN）:**
```json
{
  "名前": "AWS ClientVPN",
  "日付": "2024-01-17T12:22:27.923Z",
  "DB_タグ": ["https://www.notion.so/a60d8bb5937f454bb92922a007d64d7c"],
  "content": "### 概要\nOpenVPNを使ったPCからAWSやオンプレネットワークに..."
}
```

### 6.8 結論

**移行は可能**（画像含む）

1. **全件取得**: セマンティック検索の特性上、キーワードを変えて複数回検索する必要がある
2. **画像**: ✅ 署名付きURL取得後すぐにダウンロードすれば移行可能
3. **トークン消費**: 全体で約50,000トークン程度（Claude Codeの1セッションで十分処理可能）
4. **作業時間**: 検索・取得・変換・インポートで1-2セッション程度

---

## 7. 今後の拡張

- [x] 画像・ファイル添付のマイグレーション → **検証済み（MCP + curl で可能）**
- [ ] 既存Kensan Noteとの重複チェック
- [ ] 定期同期（Notionを引き続き使う場合）
