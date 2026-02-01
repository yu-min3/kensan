# 2026-01-22 リファクタリング作業まとめ

## 1. データモデル移行

### 旧モデル → 新モデル
- `GoalTag` (enum) → `Goal` (エンティティ)
- `Project` → `Milestone`
- `ProjectID/ProjectName` → `GoalID/GoalName/GoalColor + MilestoneID/MilestoneName`

### 影響を受けたサービス
- task-service
- timeblock-service
- record-service
- analytics-service
- ai-service

### 変更ファイル（バックエンド）
- `services/*/internal/model.go`
- `services/*/internal/repository/repository.go`
- `services/*/internal/service/service.go`
- `services/*/internal/handler/handler.go`
- `shared/errors/errors.go` - `ErrGoalNotFound`, `ErrMilestoneNotFound`, `ErrTagNotFound` 追加

---

## 2. sync-service 削除（Clockify依存脱却）

### 削除したもの
- `backend/services/sync/` ディレクトリ全体
- `backend/e2e/sync_test.go`
- `src/mocks/handlers/sync.ts`
- `shared/config/config.go` の `ClockifyConfig`

### フロントエンド
- `src/api/config.ts` から sync service URL 削除
- `src/stores/useSettingsStore.ts` から Clockify 関連 state/action 削除
- `src/mocks/handlers.ts` から sync handlers 削除

---

## 3. ClockifyID フィールド削除

### 対象
- `task-service`: `Task.ClockifyID`
- `timeblock-service`: `TimeEntry.ClockifyID`
- `user-service`: `ClockifyAPIKey`, `WorkspaceID`, `WorkspaceName`

---

## 4. pq.Array() → pgx 互換修正

### 問題
`pq.Array()` は `lib/pq` 用で、`pgx` ドライバでは使えない → 500エラー発生

### 修正
```go
// Before (broken with pgx)
pq.Array(tagIDs)       // INSERT時
pq.Array(&tagIDs)      // SCAN時

// After (works with pgx)
tagIDs                 // INSERT時
&tagIDs                // SCAN時
```

### 対象ファイル
- `services/timeblock/internal/repository/repository.go`
- `services/record/internal/repository/repository.go`

---

## 5. Docker Compose 更新

### ポート割り当て（統一）
| Service | Port |
|---------|------|
| user | 8081 |
| task | 8082 |
| timeblock | 8084 |
| routine | 8085 |
| record | 8086 |
| diary | 8087 |
| analytics | 8088 |
| ai | 8089 |
| memo | 8090 |

※ 8083 は空き（旧 sync-service）

### 更新ファイル
- `/docker-compose.yml` (プロジェクトルート)
- `/backend/docker-compose.yml`
- `/Makefile`
- `/backend/Makefile`

---

## 6. タイマー機能改善

### 問題
- 画面遷移するとタイマーを停止できなくなる
- タイマー起動中であることが分かりにくい

### 解決策

#### 6.1 fetchCurrentTimer 追加
`TimerWidget.tsx` でマウント時にサーバーから現在のタイマー状態を取得

```tsx
useEffect(() => {
  fetchCurrentTimer()
}, [fetchCurrentTimer])
```

#### 6.2 タブタイトル更新
新規フック `src/hooks/useDocumentTitle.ts`
- タイマー実行中: `⏱ 00:32:15 - タスク名 | Kensan`
- タイマー停止中: `Kensan`

#### 6.3 StartTimerDialog 共通化
新規コンポーネント `src/components/common/StartTimerDialog.tsx`
- 「タスク名を入力」と「既存タスクから選択」の切り替えUI
- ヘッダー（TimerWidget）と朝の画面（M01_Morning）で共有

### 変更ファイル
- `src/components/common/TimerWidget.tsx` - StartTimerDialog使用、日本語化
- `src/components/common/StartTimerDialog.tsx` - 新規
- `src/hooks/useDocumentTitle.ts` - 新規
- `src/components/layout/Layout.tsx` - useDocumentTitle追加
- `src/pages/M01_Morning.tsx` - useTimerStore + StartTimerDialog使用

---

## 7. その他

### ai-service
- `CLAUDE_API_KEY` 環境変数が必要
- 現在作り直し中のため一時的に除外して起動可能

### トラブルシューティング
- 504 (Outdated Optimize Dep) エラー: ローカルの `npm run dev` と Docker が同じポートで競合
- 解決: ローカルの node プロセスを停止 (`kill <PID>`)

---

## 8. Kensan AI（Claude Agent SDK）

### 概要
Go製のai-serviceの代わりに、Python + Claude Agent SDKでAIエージェント層を構築。
MCPツールでDBアクセスを提供し、複数のエージェントで共有する設計。

### ディレクトリ構造
```
kensan-ai/
├── pyproject.toml
├── README.md
└── src/kensan_ai/
    ├── __init__.py         # パッケージエクスポート
    ├── main.py             # エントリポイント・エージェントファクトリ
    ├── mcp_server.py       # MCPサーバー設定
    ├── agents/
    │   ├── __init__.py     # エージェントエクスポート
    │   ├── base.py         # AgentRunner基底クラス（ClaudeSDKClient使用）
    │   └── weekly_review.py # 週次振り返りエージェント設定
    └── tools/
        ├── __init__.py     # ツールエクスポート（ALL_TOOLS）
        ├── data.py         # モックデータ・TypedDict定義
        └── goals.py        # 目標関連ツール
```

### 実装済み
- `get_goals_and_milestones` ツール（目標・マイルストーン取得）
- `AgentRunner` 基底クラス（`run()`, `stream()` メソッド）
- `weekly_review` エージェント設定

### 次のステップ
1. **APIキー設定**: `ANTHROPIC_API_KEY` 環境変数をセット
2. **動作確認**: `python -m kensan_ai.main` で週次振り返りテスト
3. **ツール追加**: time_entries, learning_records, diary などのツール追加
4. **エージェント追加**: morning_planner, search_assistant など
5. **DB接続**: `tools/data.py` のモックをPostgreSQL接続に置き換え
6. **API化**: FastAPIでHTTPエンドポイント提供（フロントエンド連携用）

### 技術メモ
- `query()` 関数はMCPサーバーと併用不可 → `ClaudeSDKClient` を使用
- ツールは `@tool` デコレーターで定義、`input_schema` パラメータ必須
- MCPツール名は `mcp__{server_name}__{tool_name}` 形式
