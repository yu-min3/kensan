# AIエージェント強化 実装レポート

**日付**: 2026-02-06
**ブランチ**: `hackathon/gch4`
**対象計画**: `immutable-gliding-stardust.md`

---

## 全体フェーズ構成

AI機能を「生データのLLM要約」から「パターン検出 + アクション提案 + ワンクリック実行」へ進化させる3フェーズ計画。

| Phase | 名称 | スコープ | ステータス |
|-------|------|---------|-----------|
| **Phase 1** | AI機能の根本実装 | kensan-ai にパターン計算エンジン + Planning Agent 追加 | **完了** |
| **Phase 2** | UI統合 | フロントエンドに AIPlanningCard + Dailyページ統合 | **完了** |
| **Phase 3** | Lakehouse統合 | パターンデータのレイクハウスパイプライン化 | 未着手 |

---

## Phase 1: AI機能の根本実装（完了）

### 概要

kensan-ai（Python）にユーザー行動パターンの計算エンジンと、それを活用する Planning Agent を新規追加。
既存の Go analytics-service は変更せず、Python 側に集約する方針。

### 実装内容

#### 1.1 パターン計算クエリ（`db/queries/patterns.py` — 新規）

6つの SQL クエリでユーザーの行動パターンを算出:

| メトリクス | 内容 | AI活用例 |
|-----------|------|---------|
| `productivityByHour` | 時間帯別の作業実績（分数・件数） | ピーク時間帯に重要タスクを配置 |
| `planAccuracy` | 計画 vs 実績の比率 | overcommit 傾向を検出・補正 |
| `overcommitRatio` | 計画時間 / 実績時間 | 「計画詰め込み過ぎ」アラート |
| `chronicOverdueTasks` | 2週以上繰り越されたタスク | 繰り越しアラート・対処提案 |
| `goalVelocity` | 目標別の週次推移 + トレンド判定 | 停滞目標の警告 |
| `avgSessionMinutes` | 平均セッション時間 | タイムブロックサイズの最適化 |

Python 側で後処理:
- `executionRate`: 時間帯別の計画実行率
- `goalTrend`: 直近2週の変化率から `accelerating/stable/declining/stalled` を判定
- タイムゾーン変換: ユーザーのローカル時間でクエリ

#### 1.2 パターンツール（`tools/pattern_tools.py` — 新規）

```
@tool get_user_patterns(lookback_weeks?: int)
```

- Planning Agent のツールとして登録
- デフォルト4週、最大12週の分析期間
- `TOOL_GROUPS["patterns"]` として chat.py に追加

#### 1.3 Planning Agent（`agents/planning_agent.py` — 新規）

パターンデータを解釈し、構造化された計画提案を生成するエージェント。

**プロンプト変数**（コンテキスト注入）:
- `{current_datetime}`, `{user_memory}`, `{goal_progress}`, `{pending_tasks}`
- `{today_schedule}`, `{today_entries}`, `{user_patterns}`（新規）

**構造化出力フォーマット**:
```json
{
  "insights": [{"category": "productivity|goal|planning|alert", "title": "...", "description": "..."}],
  "proposedBlocks": [{"taskId": "...", "startTime": "HH:mm", "endTime": "HH:mm", "reason": "..."}],
  "taskPriorities": [{"taskId": "...", "suggestedAction": "today|defer|split", "reason": "..."}],
  "alerts": [{"type": "goal_stalled|overdue|overcommit", "message": "..."}]
}
```

**ツール権限**: `get_user_patterns`, `get_tasks`, `get_time_blocks`, `get_time_entries`, `get_goals_and_milestones`, `get_daily_summary`, `create_time_block`, `update_task`

#### 1.4 コンテキスト変数（`variable_replacer.py` — 編集）

`{user_patterns}` 変数を追加:
- `get_user_patterns()` を呼び出し、結果を人間が読みやすいテキストに整形
- ピーク時間帯、計画精度、目標トレンド、繰り越しタスクを構造的に表示
- `VARIABLE_EXCLUDES_TOOLS` でツール呼び出しとの重複を排除

#### 1.5 Situation 拡張（`chat.py` — 編集）

```python
SITUATION_TOOL_GROUPS["planning"] = ["core", "planning", "task", "goals_read", "analytics", "patterns"]
```

#### 1.6 DBマイグレーション（`045_planning_context.sql` — 新規）

`ai_contexts` テーブルに `situation='planning'` の行を追加。
temperature=0.3（構造化出力向け）、max_turns=5。

### 新規ファイル

| ファイル | 行数 |
|---------|------|
| `kensan-ai/src/kensan_ai/db/queries/patterns.py` | ~200 |
| `kensan-ai/src/kensan_ai/tools/pattern_tools.py` | ~40 |
| `kensan-ai/src/kensan_ai/agents/planning_agent.py` | ~80 |
| `backend/migrations/045_planning_context.sql` | ~50 |

### 編集ファイル

| ファイル | 変更内容 |
|---------|---------|
| `kensan-ai/src/kensan_ai/tools/__init__.py` | pattern_tools の import + ALL_TOOLS 追加 |
| `kensan-ai/src/kensan_ai/db/queries/__init__.py` | patterns の export 追加 |
| `kensan-ai/src/kensan_ai/agents/__init__.py` | planning_agent の import + export |
| `kensan-ai/src/kensan_ai/agents/chat.py` | patterns グループ + planning situation 追加 |
| `kensan-ai/src/kensan_ai/context/variable_replacer.py` | `{user_patterns}` 変数追加 |

---

## Phase 2: UI統合（完了）

### 概要

Phase 1 で構築した Planning Agent の出力を、Dailyページ上でインタラクティブに操作できる UI を実装。
SSE ストリーミングで生成 → 構造化 JSON パース → カード型 UI で表示 → ワンクリックでタイムブロック作成。

### 実装内容

#### 2.1 型定義（`types/index.ts` — 編集）

5つの新規インターフェースを追加:
- `PlanningInsight`, `ProposedBlock`, `TaskPrioritySuggestion`, `PlanningAlert`, `AIPlanningResult`

#### 2.2 AIPlanningCard コンポーネント（新規）

既存の `AIReviewSection` パターンを踏襲した SSE ストリーミングコンポーネント。

**フロー**:
```
ボタンクリック → streamAgentChat(situation: 'planning')
→ SSE チャンク蓄積 → 完了後 JSON パース → 構造化 UI 表示
```

**4セクション構成**:

| セクション | 内容 | インタラクション |
|-----------|------|----------------|
| Alerts | 目標停滞・期限超過・計画過多の警告 | 色分けアラートカード（黄/赤/橙） |
| Insights | 生産性・目標・計画のインサイト | カテゴリアイコン付きカードグリッド |
| Proposed Blocks | タイムブロック提案リスト | チェックボックス選択 + 「まとめて適用」ボタン |
| Task Priorities | タスク優先度提案 | suggestedAction バッジ（今日やる/延期/分割） |

**「まとめて適用」機能**:
- 選択されたブロックを `useTimeBlockStore.addTimeBlock()` で一括作成
- 適用後はタイムラインに即反映（Zustand store 経由）
- action_proposal は不使用（画面確認済みのため二重承認不要）

#### 2.3 Dailyページ統合（`DailyPage.tsx` — 編集）

PageMemo の下、TimeBlockSection の上に配置:
```tsx
{isToday && <AIPlanningCard selectedDate={selectedDateIso} />}
```
今日の日付の場合のみ表示。

#### 2.4 Agent API 拡張（`agent.ts` — 編集）

`AgentStreamRequest.situation` の型に `'planning'` を追加。

### 新規ファイル

| ファイル | 行数 |
|---------|------|
| `src/components/daily/AIPlanningCard.tsx` | ~390 |

### 編集ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/types/index.ts` | AI Planning 型5つ追加 |
| `src/api/services/agent.ts` | situation に 'planning' 追加 |
| `src/pages/DailyPage.tsx` | AIPlanningCard import + 配置 |

---

## Phase 3: Lakehouse統合（未着手）

### 構想

Phase 1 で kensan-ai 内に構築したパターン計算を、レイクハウスパイプライン（Dagster + DuckDB/Iceberg）に移行する。

**目的**:
- パターン計算のスケーラビリティ確保（リアルタイム計算 → バッチ計算）
- 集計済みデータの永続化（毎回 SQL 実行 → 事前計算テーブル参照）
- 分析用データマートの構築（BI ダッシュボード対応）

**想定される実装**:

| コンポーネント | 内容 |
|--------------|------|
| Bronze層 | PostgreSQL → time_entries, time_blocks, tasks の raw データ取り込み |
| Silver層 | 時間帯別集計、目標別週次集計、計画精度計算 |
| Gold層 | ユーザーパターンプロファイル（productivity_by_hour, goal_velocity 等） |
| AI連携 | kensan-ai が Gold 層を参照（現在の直接 SQL → レイクハウスクエリ） |

**Phase 1 との関係**:
- Phase 1 の `patterns.py` が計算するメトリクスと同じものを Gold 層で事前計算
- 移行時は `get_user_patterns()` の実装を「SQL直接実行」から「Gold層参照」に差し替え
- インターフェース（返却フォーマット）は変更なし → フロントエンド・Agent への影響ゼロ

**着手条件**:
- Phase 1/2 でパターンデータの有用性が確認できた後
- レイクハウスの Bronze/Silver 層が安定稼働している状態

---

## 期待される効果

### Phase 1 + 2（実装済み）による効果

| 効果 | 詳細 |
|------|------|
| **パターン駆動の計画提案** | 過去の行動データに基づく時間帯提案（「10時台が最も集中できる」等） |
| **overcommit 防止** | 計画過多を検知してアラート + 時間配分の自動調整 |
| **目標停滞の早期発見** | goalVelocity の trend 判定で declining/stalled 目標を警告 |
| **繰り越しタスクの可視化** | 2週以上放置されたタスクを明示 + 対処提案（今日やる/延期/分割） |
| **Daily ページ完結** | ブリーフィング → Dailyの画面遷移が不要に。計画立案〜実行が1画面で完結 |
| **ワンクリック実行** | AI提案のタイムブロックを「まとめて適用」でタイムラインに即反映 |

### Phase 3（将来）による追加効果

| 効果 | 詳細 |
|------|------|
| **計算コスト削減** | リアルタイム SQL → バッチ事前計算で応答速度向上 |
| **長期トレンド分析** | 12週以上のパターン分析が実用的に（現在は SQL コストで制限） |
| **BI対応** | Gold 層データをダッシュボードツールから直接参照可能 |
| **データリネージ** | Dagster によるパイプライン可視化・依存関係管理 |

---

## 技術的判断

| 判断 | 理由 |
|------|------|
| パターン計算を kensan-ai（Python）に集約 | Go analytics-service の変更を最小化。YAGNI原則 |
| `{user_patterns}` をプロンプト変数で注入 | ツール呼び出しラウンドトリップを削減。初回から全パターンを参照可能 |
| `VARIABLE_EXCLUDES_TOOLS` で重複排除 | プロンプト注入済みデータのツール再取得を防止 |
| temperature=0.3 | 構造化 JSON 出力の安定性を重視 |
| action_proposal 不使用 | 画面で確認済みの提案にさらに承認ダイアログは冗長 |
| Phase 3 は YAGNI で後回し | パターンデータの有用性を先に検証してから最適化 |

---

## ビルド確認

```
npm run build — 成功（TypeScript エラーなし）
```

## 更新済みドキュメント

- `src/ARCHITECTURE.md` — AI Planning 型、AIPlanningCard コンポーネント追加
- `kensan-ai/ARCHITECTURE.md` — planning_agent、pattern_tools、`{user_patterns}` 変数追加
