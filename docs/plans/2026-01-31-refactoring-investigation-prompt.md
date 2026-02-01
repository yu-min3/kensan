# Mission

あなたはシニアソフトウェアアーキテクト（コードレビュー・品質監査専門）として、React + Go + Pythonで構成されたアプリケーション「Kensan」のコードベースを調査し、リファクタリングすべき箇所を洗い出してください。
調査結果は、後続のリファクタリング実行エージェントが即座に着手できる粒度で報告すること。

# Execution Strategy

各観点を専門のsubagentに委任し、**並列で調査を実行**すること。

| Subagent | 担当 | 調査対象ディレクトリ |
|----------|------|---------------------|
| frontend-agent | 観点1: デザインシステム | `src/` |
| backend-agent | 観点2: サービス境界 | `backend/services/`, `backend/shared/` |
| note-agent | 観点3: ノート拡張性 | `backend/services/note/`, `src/components/note/`, `src/pages/N*`, `kensan-ai/src/` |
| ai-agent | 観点4: AIデータアクセス | `kensan-ai/src/`, `backend/services/`（参照用） |
| otel-agent | 観点5: OpenTelemetry | `backend/shared/telemetry/`, `backend/shared/middleware/`, `kensan-ai/src/`, `observability/` |

**ワークフロー:**
1. 全subagentを同時に起動し、各観点の調査を並列実行
2. 各subagentは担当観点の「発見事項」と「推奨アクション」を返す
3. 親エージェントが全結果を統合し、「横断評価」「推奨リファクタリング順序」を作成

**各subagentへの共通指示（起動時にContext、横断的な評価基準、Constraintsと合わせて渡すこと）:**
- 横断的な評価基準（クリーンアーキテクチャ、モダナイズと実用のバランス）をレンズとして適用すること
- 他の観点に関連する発見があれば `[横断: 観点N関連]` と付記すること

# Context

## アプリケーション概要

エンジニア向け個人生産性アプリ。時間管理、タスク管理、学習記録、AI週次レビューが主な機能。

ユーザー自身がエンジニアであり、このアプリを「使うだけ」でなく「自分で育てる」ことを前提としている。新しいドメインの追加、既存機能の拡張、AIツールの追加が最小限の変更箇所で実現できることが、アーキテクチャ上の最重要要件の一つ。

## 技術スタック

| Layer | Stack |
|-------|-------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS 4 + shadcn/ui + Zustand |
| Backend | Go 1.24 + chi v5 + pgx v5 + PostgreSQL 16（マイクロサービス6つ: user, task, timeblock, analytics, memo, note） |
| AI Service | Python + Anthropic Claude API + Direct Tools + pgvector |
| Observability | OpenTelemetry（Go SDK + Python SDK） |

全サービスが同一PostgreSQLを共有、サービス間通信なし。AIサービスはGoサービスをバイパスして直接DBアクセス。

## 事前に読むドキュメント

`CLAUDE.md`, `backend/ARCHITECTURE.md`, `src/ARCHITECTURE.md`, `kensan-ai/ARCHITECTURE.md`

## 調査スコープ

- **対象**: `src/`, `backend/services/`, `backend/shared/`, `kensan-ai/src/`, `observability/`
- **対象外**: `docker-compose.yml`, `k8s/`, `Makefile`, マイグレーションSQL（参照はOKだが改善提案の対象外）

# 横断的な評価基準

全観点を通じて、以下の2軸が一貫しているかを評価し、各観点の発見事項にこの基準に照らした判断を含めること。

## クリーンアーキテクチャの一貫性

- **依存の方向**: handler → service → repository interfaceの一方向が守られているか。逆方向やレイヤー飛び越えがないか
- **インターフェース分離**: service層がrepository実装ではなくinterfaceに依存し、テスタビリティが確保されているか
- **ドメインモデルの純粋性**: model.goが外部パッケージ（DBドライバ、HTTPフレームワーク等）に依存していないか
- **フロントエンド**: コンポーネント → Zustand store → APIサービスの責務分離が一貫しているか

## モダナイズと実用のバランス

- 現在の規模に不釣り合いな過剰抽象化がないか
- 少ない労力でモダン化の恩恵を受けられる箇所が残っていないか
- 同じ問題に対してサービス間で異なるアプローチが取られていないか

# 調査の観点

以下の5観点で調査せよ。各発見に**ファイルパス:行番号、コード断片、問題の説明**を含めること。

**優先度: 観点4 > 観点5 > 観点2 > 観点1 > 観点3**（トークン上限時は低優先度の深掘りを省略してよい）

## 観点1: フロントエンド デザインシステム一貫性

- `src/index.css`のCSS変数の定義一覧と、実際の使用率
- セマンティックカラーを無視してTailwind直接指定（`slate-*`, `bg-[#xxx]`等）やinline styleを使っている箇所のパターン分類と代表例（パターンごとに2-3例で十分）
- opacity処理の統一性（`color-mix` vs hex末尾追加 vs Tailwind `/opacity`）
- ダークモード対応が欠落しているコンポーネントの特定

## 観点2: バックエンド サービス境界と責務

- 各サービスが実際にアクセスしているテーブルの一覧（SQLクエリから抽出）と、サービス境界を越えたアクセスの特定
- 非正規化フィールド（`goal_name`, `goal_color`等）の全リストと、更新時の整合性保証の有無
- task-serviceの責務範囲（Goals, Milestones, Tasks, Tags, Todos, EntityMemos）の適切さ
- レガシーコード（統合済みサービスの残骸等）の特定
- 共有パッケージ（`backend/shared/`）の変更影響範囲

## 観点3: ノートシステム 拡張性

- note_typesのデータ駆動型設計がフロントエンド〜バックエンドで一貫しているか
- 新しいノートタイプ追加時に変更が必要な全ファイルのリスト（ゼロが理想）
- metadata_schemaに基づくバリデーションの実装状況
- コンテンツタイプ（markdown, drawio, image, PDF, code）ごとの処理パイプラインの完成度

## 観点4: AI データアクセス自由度（最重要）

- AIがアクセス**できる/できない**データドメインの完全なリスト（ツール名、CRUD粒度、できない理由）
- GoサービスAPIとAI直接DBアクセスでデータ操作ロジックが重複している箇所
- AI経由のデータ変更で非正規化フィールドの整合性が壊れるシナリオ
- 新ドメイン/テーブル追加時にAIツールも追加するために必要な作業量
- 検索（semantic/keyword/hybrid）とchunking/embeddingの対応データ範囲と未対応範囲

## 観点5: OpenTelemetry 実装品質

- **計装の網羅性**: 全サービス（Go 6つ + Python AI）で計装が実装されているか。抜けているサービスやレイヤーの特定
- **セマンティック規約**: span名・attribute名がSemantic Conventions（`http.method`, `db.system`等）に従っているか。独自命名の特定
- **コンテキスト伝播**: フロントエンド → Go → Python AI間でtrace contextが途切れるポイントの特定
- **トレース粒度とエラー記録**: span階層の適切さ（handler/service/repository各層のカバー状況）。`RecordError()`/`SetStatus(codes.Error)`の適切な使用
- **メトリクス**: REDメソッド（Rate, Errors, Duration）の観点で不足しているメトリクスの特定
- **SDK初期化**: リソース属性（`service.name`, `service.version`等）の設定、graceful shutdownでのFlush呼び出し

# Output Format

以下の形式でMarkdownファイルとして出力すること。

```
# Kensan リファクタリング調査レポート

## Executive Summary
（全体の健全性を1段落で要約。最も緊急度の高い問題を1つ明示。）

## 観点4: AI データアクセス
### 発見事項
（番号付きリスト。各項目に ファイルパス:行番号、コード断片、問題の説明 を含む）
### 推奨アクション
（優先度 High/Medium/Low 付き）

## 観点5: OpenTelemetry 実装品質
### 発見事項
### 推奨アクション

## 観点2: バックエンド サービス境界
### 発見事項
### 推奨アクション

## 観点1: フロントエンド デザインシステム
### 発見事項
### 推奨アクション

## 観点3: ノートシステム 拡張性
### 発見事項
### 推奨アクション

## 横断評価: 設計思想の一貫性
### クリーンアーキテクチャ
### モダナイズと実用のバランス

## 推奨リファクタリング順序

| 順序 | 対象 | 内容 | 先行依存 | 改善効果 |
|------|------|------|----------|----------|
| 1 | 例: 観点2 | 非正規化フィールド整理 | なし | AI整合性の前提が整う |
| 2 | 例: 観点4 | AIツール修正 | #1 | 全ドメインへのアクセス確保 |
```

# Constraints

- **コードは変更しない**。調査と報告のみ。
- 推測ではなく、コードの実物を根拠に報告すること。
- 個人開発のため、運用コストの重い解決策（Kafka、複数DB等）は推奨しないこと。
- 「完璧なアーキテクチャ」ではなく「次に改善すべき具体的な箇所」にフォーカスすること。
