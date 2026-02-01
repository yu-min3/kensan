# Kensan Lakehouse

Apache Iceberg + Nessie Catalog によるデータレイクハウス基盤。
Kensanアプリケーションの PostgreSQL データを Medallion Architecture（Bronze → Silver → Gold）で段階的に加工し、DuckDB でアドホック分析を行う。

## アーキテクチャ

```
PostgreSQL ──batch──▶ Bronze ──PyArrow──▶ Silver ──PyArrow──▶ Gold
(Kensan DB)           (生データ)           (整形済み)           (集計済み)
                         │                    │                   │
                         └────────────────────┴───────────────────┘
                                              │
                                     ┌────────▼────────┐
                                     │     DuckDB      │
                                     │  (アドホック分析) │
                                     └─────────────────┘
```

### インフラ構成

| コンポーネント | 役割 | ポート |
|--------------|------|--------|
| PostgreSQL | Kensanアプリ DB（データソース） | 5432 |
| MinIO | S3互換オブジェクトストレージ（Parquetファイル格納） | 9000 (API) / 9001 (Console) |
| Nessie | Iceberg REST Catalog（テーブルメタデータ管理） | 19120 |

### ツール

| ツール | 役割 |
|--------|------|
| PyIceberg | テーブル管理、ingestion、変換（Bronze→Silver→Gold） |
| PyArrow | データ変換・型処理 |
| DuckDB | アドホッククエリ、データ確認 |
| uv | Python依存関係管理 |

## セットアップ

```bash
cd lakehouse

# 1. Python依存関係インストール
make install

# 2. インフラ起動（PostgreSQL + MinIO + Nessie）
make up

# 3. Icebergテーブル作成
make init

# 4. パイプライン実行（Bronze → Silver → Gold）
make pipeline
```

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `make up` | PostgreSQL, MinIO, Nessie を起動 |
| `make down` | 全コンテナを停止 |
| `make install` | Python依存関係をインストール |
| `make init` | Nessie Catalog にIcebergテーブルを作成 |
| `make ingest` | PostgreSQL → Bronze（バッチ取り込み） |
| `make transform` | Bronze → Silver（整形・算出値追加） |
| `make aggregate` | Silver → Gold（週次集計） |
| `make pipeline` | ingest + transform + aggregate を一括実行 |
| `make query` | DuckDB インタラクティブシェル起動 |
| `make summary` | Gold/Silverテーブルのサマリーを表示 |
| `make health` | 各サービスのヘルスチェック |
| `make logs` | コンテナログをtail |
| `make clean` | コンテナとボリュームを削除 |

## テーブル設計

### Bronze層（生データ）

PostgreSQLのデータをそのまま格納。`_ingested_at` カラムを付与。

| テーブル | ソース | パーティション | 取り込み方式 |
|---------|--------|---------------|-------------|
| `bronze.time_entries_raw` | time_entries | `month(start_datetime)` | PG batch |
| `bronze.tasks_raw` | tasks | なし | PG batch |
| `bronze.notes_raw` | notes | なし | PG batch |
| `bronze.ai_interactions_raw` | ai_interactions | `month(created_at)` | PG batch |
| `bronze.ai_facts_raw` | user_facts | なし | PG batch |
| `bronze.ai_reviews_raw` | ai_review_reports | なし | PG batch |
| `bronze.ai_contexts_raw` | ai_contexts | なし | PG batch |
| `bronze.external_tool_results_raw` | kensan-ai直接書込 | `month(executed_at)` | Direct append |

**データフロー 2系統:**
1. **PG → Bronze (batch)**: `ingest_postgres.py` による定期バッチ取り込み
2. **kensan-ai → Bronze (direct)**: 外部ツール結果を kensan-ai の LakehouseWriter が fire & forget で直接 append

### Silver層（整形済み）

クリーニング、不要カラム除去、算出値の追加。

| テーブル | 主な変換 | パーティション |
|---------|---------|---------------|
| `silver.time_entries` | `duration_minutes` 算出、`date` 抽出 | `month(date)` |
| `silver.tasks` | `is_subtask` 判定（parent_task_id の有無） | なし |
| `silver.notes` | `content_length` 算出、本文除去 | なし |
| `silver.ai_interactions` | `date` 抽出、ツール情報解析、`tokens_total` 算出 | `month(date)` |
| `silver.ai_token_usage` | 日別×situation別のトークン使用量集計 | なし |

### Gold層（集計済み）

分析用の集計テーブル。

| テーブル | 内容 | 集計軸 |
|---------|------|--------|
| `gold.weekly_summary` | 週次の時間・タスク・ノート集計 | user_id × week_start |
| `gold.goal_progress` | ゴール別の週次進捗 | user_id × goal_name × week_start |
| `gold.ai_usage_weekly` | AI使用量の週次集計（トークン、ツール利用分布） | user_id × week_start |
| `gold.ai_quality_weekly` | AI品質の週次集計（評価、ファクト数、レビュー有無） | user_id × week_start |

## DuckDBクエリ

### インタラクティブシェル

```bash
make query
```

全Icebergテーブルが自動で登録される。使えるテーブル名：

- `bronze_time_entries`, `bronze_tasks`, `bronze_notes`
- `bronze_ai_interactions`, `bronze_ai_facts`, `bronze_ai_reviews`, `bronze_ai_contexts`
- `bronze_external_tool_results`
- `silver_time_entries`, `silver_tasks`, `silver_notes`
- `silver_ai_interactions`, `silver_ai_token_usage`
- `gold_weekly_summary`, `gold_goal_progress`
- `gold_ai_usage_weekly`, `gold_ai_quality_weekly`

```sql
D> SELECT goal_name, sum(duration_minutes)/60 AS hours
   FROM silver_time_entries GROUP BY goal_name ORDER BY hours DESC;
```

### サマリー表示

```bash
make summary
```

### クエリ例（queries/examples.sql）

```sql
-- ゴール別の合計時間
SELECT goal_name, sum(duration_minutes) / 60.0 AS total_hours
FROM silver_time_entries
GROUP BY goal_name
ORDER BY total_hours DESC;

-- 日別の作業時間
SELECT date, sum(duration_minutes) AS total_minutes
FROM silver_time_entries
GROUP BY date ORDER BY date DESC LIMIT 30;

-- タスク完了率
SELECT completed, count(*) FROM silver_tasks GROUP BY completed;

-- ノートタイプ別の文字数
SELECT type, count(*), round(avg(content_length)) AS avg_length
FROM silver_notes GROUP BY type;

-- AI: 週次トークン消費量
SELECT week_start, interaction_count, tokens_total,
       situation_distribution_json
FROM gold_ai_usage_weekly ORDER BY week_start DESC;

-- AI: situation別のトークン使用量
SELECT date, situation, interaction_count, tokens_total
FROM silver_ai_token_usage ORDER BY date DESC LIMIT 30;

-- AI: Web検索の利用頻度
SELECT tool_name, count(*) AS cnt
FROM bronze_external_tool_results GROUP BY tool_name;

-- AI: 品質メトリクス（評価ありのインタラクション）
SELECT week_start, rated_count, round(avg_rating, 2) AS avg_rating,
       fact_count, review_generated
FROM gold_ai_quality_weekly ORDER BY week_start DESC;
```

## Nessie設定の注意点

Nessie Catalog の S3 認証は **URN シークレット参照パターン** を使う。
docker-compose.yml の環境変数で Quarkus プロパティ名をそのまま指定する：

```yaml
nessie:
  environment:
    # Quarkus プロパティ名をそのまま環境変数として渡す
    nessie.catalog.default-warehouse: lakehouse
    nessie.catalog.warehouses.lakehouse.location: s3://kensan-lakehouse/
    nessie.catalog.service.s3.default-options.endpoint: http://minio:9000
    nessie.catalog.service.s3.default-options.external-endpoint: http://localhost:9000
    nessie.catalog.service.s3.default-options.path-style-access: "true"
    nessie.catalog.service.s3.default-options.region: us-east-1
    # S3認証: URN参照 → Quarkusシークレット → 実際のクレデンシャル
    nessie.catalog.service.s3.default-options.access-key: urn:nessie-secret:quarkus:nessie.catalog.secrets.s3
    nessie.catalog.secrets.s3.name: <access-key-id>
    nessie.catalog.secrets.s3.secret: <secret-access-key>
```

`external-endpoint` は PyIceberg などのクライアントが S3 にアクセスする際の外部URL。
`endpoint` は Nessie コンテナからMinIO にアクセスする際の内部URL。

## DuckDB + Iceberg の注意点

DuckDB の `iceberg_scan()` は S3 上の Iceberg テーブルを直接読めるが、Nessie Catalog 経由のパス構造（UUID入りディレクトリ）と互換性の問題がある。

本プロジェクトでは **PyIceberg でArrowに読み込み → DuckDB に登録** するアプローチを採用：

```python
# PyIceberg → Arrow → DuckDB
arrow_table = catalog.load_table("silver.time_entries").scan().to_arrow()
con.register("silver_time_entries", arrow_table)
con.sql("SELECT * FROM silver_time_entries")
```

将来的にDuckDB の Nessie/Iceberg REST Catalog サポートが改善されれば、直接クエリに移行可能。

## ディレクトリ構成

```
lakehouse/
├── .env                        # 接続設定
├── .gitignore
├── Makefile                    # コマンド一覧
├── pyproject.toml              # Python依存関係
├── README.md                   # このファイル
├── catalog/
│   ├── config.py               # Nessie/S3/PostgreSQL接続設定
│   └── init_catalog.py         # Bronze/Silver/Goldテーブル定義
├── pipelines/
│   ├── bronze/
│   │   └── ingest_postgres.py  # PostgreSQL → Bronze
│   ├── silver/
│   │   └── transform.py        # Bronze → Silver
│   └── gold/
│       └── aggregate.py        # Silver → Gold
└── queries/
    ├── examples.sql            # SQLクエリ例
    └── query.py                # DuckDBインタラクティブシェル
```

## ロードマップ

| Phase | 内容 | 状態 |
|-------|------|------|
| 1 | MinIO + Nessie + PyIceberg + DuckDB基盤 | ✅ 完了 |
| 1.5 | AI Data Lakehouse統合（Bronze/Silver/Gold AI テーブル、外部ツール連携） | ✅ 完了 |
| 2 | Argo Workflows で定期実行、Nessie branching | 未着手 |
| 3 | k8s デプロイ、Trino 追加、OTel Collector 連携 | 未着手 |
| 4 | Gold層を kensan-ai のコンテキストとして利用 | 未着手 |
