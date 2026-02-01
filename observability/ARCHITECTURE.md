# Observability Architecture

Kensan のオブザーバビリティ基盤のアーキテクチャドキュメント。
テレメトリデータの収集・集計方法、ダッシュボードの設計思想、活用方法を解説する。

---

## 目次

1. [設計思想](#1-設計思想)
2. [スタック構成](#2-スタック構成)
3. [データフロー](#3-データフロー)
4. [計装（Instrumentation）](#4-計装instrumentation)
5. [メトリクス設計](#5-メトリクス設計)
6. [ダッシュボード](#6-ダッシュボード)
7. [データソース連携](#7-データソース連携)
8. [設定ファイル一覧](#8-設定ファイル一覧)
9. [運用ガイド](#9-運用ガイド)

---

## 1. 設計思想

### Three Pillars of Observability

本プロジェクトでは**メトリクス・トレース・ログ**の3本柱でオブザーバビリティを構成する。

| Pillar | 目的 | ストレージ | 保持期間 |
|--------|------|------------|----------|
| **Metrics** | リクエストレート、エラー率、レイテンシの時系列監視 | Prometheus | 48時間 |
| **Traces** | リクエスト単位のサービス間追跡、ボトルネック特定 | Tempo | 48時間 |
| **Logs** | 構造化ログ、エラー詳細、AI インタラクション記録 | Loki | 7日間 |

### 設計原則

1. **OpenTelemetry ネイティブ**: すべてのサービスが OTel SDK で計装。ベンダーロックインを避け、標準仕様（[Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)）に準拠する。
2. **RED メソッド**: ダッシュボードは **Rate（リクエストレート）**, **Errors（エラー率）**, **Duration（レイテンシ）** を基本指標とする。サービスの健全性をひと目で判断できる。
3. **低カーディナリティ**: ラベル数を最小限に抑え、ストレージ効率とクエリ性能を維持する。Loki では `job`, `level`, `instance`, `exporter` のみをインデックスラベルとする。
4. **Traces ↔ Logs 相互リンク**: トレース ID をキーにトレースとログを双方向にジャンプできる。障害調査のコンテキストスイッチを最小化する。
5. **ノイズ除去**: SSE ストリーミングの `http send` スパンなど、有用でない高頻度データは OTel Collector レベルで除外する。

---

## 2. スタック構成

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Go Services │  │  kensan-ai   │  │  Frontend    │
│  (chi/otel)  │  │  (FastAPI)   │  │  (React)     │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │ OTLP HTTP       │ OTLP HTTP       │ Loki API
       ▼                 ▼                 │
┌──────────────────────────────┐           │
│  OpenTelemetry Collector     │           │
│  (otel-collector-contrib)    │           │
│  Port 4317(gRPC) / 4318(HTTP)│          │
└──┬──────────┬──────────┬─────┘           │
   │          │          │                 │
   ▼          ▼          ▼                 │
┌──────┐ ┌────────┐ ┌──────┐              │
│Tempo │ │Prometh-│ │ Loki │◄─────────────┘
│:3200 │ │eus:9090│ │:3100 │
└──┬───┘ └───┬────┘ └──┬───┘
   │         │         │
   ▼         ▼         ▼
┌──────────────────────────────┐
│         Grafana :3000        │
│  ┌─────────┐ ┌────────────┐ │
│  │Service  │ │ Request    │ │
│  │Overview │ │ Explorer   │ │
│  └─────────┘ └────────────┘ │
└──────────────────────────────┘
```

### コンポーネント一覧

| コンポーネント | イメージ | ポート | 役割 |
|---------------|---------|--------|------|
| OTel Collector | `otel/opentelemetry-collector-contrib:0.120.0` | 4317, 4318, 13133 | テレメトリデータの受信・加工・振り分け |
| Tempo | `grafana/tempo:2.6.1` | 3200 | 分散トレーシングバックエンド |
| Prometheus | `prom/prometheus:v3.1.0` | 9090 | メトリクス収集・保存 |
| Loki | `grafana/loki:3.3.2` | 3100 | ログ集約 |
| Grafana | `grafana/grafana:11.4.0` | 3000 | 可視化・ダッシュボード |

---

## 3. データフロー

### 3.1 トレース

```
Service → OTLP HTTP/gRPC → Collector → filter/drop-http-send → batch → Tempo
```

- W3C TraceContext ヘッダーでサービス間のコンテキストを伝播
- OTel Collector で SSE ストリーミングのノイズスパンを除外
- Tempo の metrics_generator が受信トレースから RED メトリクスを自動生成

### 3.2 メトリクス

```
Service → OTLP HTTP → Collector → batch → Prometheus Remote Write
```

- 各サービスの OTel SDK が `http.server.request.duration` ヒストグラムを記録
- Collector が Prometheus Remote Write で Prometheus に送信
- Prometheus 側では OTel Collector 自身のメトリクス（`otel-collector:8888`）もスクレイプ

### 3.3 ログ

```
Service → OTLP HTTP → Collector → batch → Loki
```

- Go サービス: zerolog → OTel ログエクスポーター（trace_id/span_id 自動注入）
- Python (kensan-ai): Python logging → OTel LoggingHandler → Loki
- フロントエンドは Loki API に直接クエリして AI イベントを取得

---

## 4. 計装（Instrumentation）

### 4.1 Go バックエンドサービス

すべてのサービスが共通の `bootstrap` パッケージでミドルウェアチェーンを構成する。

**ミドルウェア適用順序:**

```
RequestID → OTelTrace → Metrics → Logger → CORS → Auth → Handler
```

| ミドルウェア | パッケージ | 役割 |
|-------------|-----------|------|
| `OTelTrace` | `otelhttp.NewHandler` | HTTP スパンの自動生成（メソッド、ルート、ステータス、レイテンシ） |
| `Metrics` | `shared/middleware/metrics.go` | `http.server.request.duration` ヒストグラムの記録 |
| `Logger` | zerolog | 構造化ログに trace_id / span_id を自動注入 |

**ビジネスロジック層のトレーシング:**

`shared/telemetry/tracing.go` の `StartSpan` ヘルパーでサービス層のオペレーションをスパン化する。

```go
tracer := telemetry.ServiceTracer("task-service")

func (s *Service) CreateTask(ctx context.Context, task *Task) error {
    ctx, end := telemetry.StartSpan(ctx, tracer, "CreateTask",
        attribute.String("task.project_id", task.ProjectID),
    )
    defer end(err)
    // ビジネスロジック
}
```

**環境変数:**

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `OTEL_ENABLED` | `false` | テレメトリの有効化 |
| `OTEL_COLLECTOR_URL` | `localhost:4318` | OTel Collector の OTLP HTTP エンドポイント |

### 4.2 Python AI サービス (kensan-ai)

`kensan_ai/telemetry.py` で TracerProvider, MeterProvider, LoggerProvider の三つを初期化する。

**自動計装:**

| ライブラリ | 関数 | 計装内容 |
|-----------|------|---------|
| FastAPI | `instrument_fastapi(app)` | HTTP リクエストスパン（`/health` 除外） |
| asyncpg | `instrument_asyncpg()` | DB クエリスパン |
| httpx | `instrument_httpx()` | 外部 HTTP リクエストスパン |

**GenAI カスタムメトリクス:**

`get_genai_metrics()` で遅延初期化される 3 つのメトリクス:

| メトリクス名 | 種別 | 単位 | 説明 |
|-------------|------|------|------|
| `gen_ai.client.token.usage` | Counter | `{token}` | Claude API のトークン消費量 |
| `gen_ai.client.operation.duration` | Histogram | `s` | エージェントインタラクションの所要時間 |
| `gen_ai.client.operation.count` | Counter | `{operation}` | エージェント実行回数 |

**Python ログ → OTel ログブリッジ:**

```
Python logging (kensan_ai logger)
  → OTel LoggingHandler
    → BatchLogRecordProcessor
      → OTLP HTTP Exporter
        → Collector → Loki
```

トレースコンテキスト（trace_id, span_id）が自動でログに付与されるため、Loki のログから Tempo のトレースへジャンプ可能。

### 4.3 フロントエンド

フロントエンド自体は OTel 計装していない。代わりに `src/api/services/observability.ts` で Loki API に直接クエリし、AI インタラクションの詳細を取得・表示する。

**取得可能な AI イベントタイプ:**

| イベント | 説明 | 主なフィールド |
|---------|------|---------------|
| `agent.prompt` | ユーザーメッセージ受信 | model, user_message, tool_names, context_* |
| `agent.system_prompt` | システムプロンプト構築 | system_prompt |
| `agent.turn` | エージェントターン | turn_number, input/output_tokens, cache_*, response_text |
| `agent.tool_call` | ツール呼び出し | tool_name, tool_input, tool_output, success |
| `agent.complete` | インタラクション完了 | outcome, total_turns, total_tokens, pending_actions |

---

## 5. メトリクス設計

### 5.1 HTTP サーバーメトリクス

本プロジェクトで使用するメトリクスは [OTel HTTP Semantic Conventions v1.26.0](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/) に準拠している。

**`http.server.request.duration` (Histogram, 単位: 秒)**

| 属性 | 説明 | 例 |
|------|------|-----|
| `http.request.method` | HTTP メソッド | `GET`, `POST`, `PUT`, `DELETE` |
| `http.route` | リクエストパス | `/api/v1/tasks` |
| `http.response.status_code` | レスポンスステータスコード | `200`, `404`, `500` |
| `server.address` | Host ヘッダー値 | `localhost:8082` |

このヒストグラムひとつから以下の RED メトリクスをすべて導出できる:

| 指標 | PromQL |
|------|--------|
| **Rate** (リクエスト/秒) | `sum(rate(http_server_request_duration_seconds_count{job=~"$service"}[5m]))` |
| **Error Rate** (5xx 率) | `sum(rate(...{http_response_status_code=~"5.."}[5m])) / sum(rate(...[5m]))` |
| **p50 Latency** | `histogram_quantile(0.50, sum by (le)(rate(..._bucket{job=~"$service"}[5m])))` |
| **p95 Latency** | `histogram_quantile(0.95, ...)` |
| **p99 Latency** | `histogram_quantile(0.99, ...)` |

### 5.2 GenAI メトリクス

| メトリクス | PromQL (例) |
|-----------|-------------|
| トークン消費レート | `rate(gen_ai_client_token_usage_total[5m])` |
| エージェント実行レート | `rate(gen_ai_client_operation_count_total[5m])` |
| エージェント処理時間 p95 | `histogram_quantile(0.95, rate(gen_ai_client_operation_duration_seconds_bucket[5m]))` |

---

## 6. ダッシュボード

### 6.1 Kensan - Service Overview

**ファイル:** `grafana/dashboards/kensan-service-overview.json`

**目的:** 全サービスの RED メトリクスを一覧し、システム全体の健全性をひと目で判断する。SRE の「最初に開くダッシュボード」。

**変数:**
- `service`: サービス名フィルター（複数選択可、デフォルト: 全サービス）

**パネル構成:**

| # | パネル名 | 種別 | 説明 |
|---|---------|------|------|
| 1 | Request Rate | Stat | 全サービス合計のリクエスト/秒 |
| 2 | Error Rate 5xx | Stat | 5xx エラーの割合。閾値: <1% 緑, 1-5% 黄, >5% 赤 |
| 3 | p95 Latency | Stat | 95パーセンタイルレイテンシ。閾値: <500ms 緑, <1s 黄, >1s 赤 |
| 4 | Active Services | Stat | テレメトリを送信中のサービス数 |
| 5 | Request Rate per Service | Time series | サービスごとのリクエストレート推移 |
| 6 | Error Rate 5xx per Service | Time series | サービスごとのエラー率推移（閾値ライン付き） |
| 7 | Latency p95 per Service | Time series | サービスごとの p95 レイテンシ推移 |
| 8 | Request Rate by Status Code | Stacked bar | ステータスコード別リクエスト数（2xx 緑, 4xx 黄, 5xx 赤） |
| 9 | Latency Comparison | Time series | p50, p95, p99 パーセンタイルの比較 |
| 10 | Error Budget | Gauge | SLO 99% に対する成功率ゲージ。99%以上 緑, 95-99% 黄, <95% 赤 |
| 11 | Service Map | Node Graph | Tempo ベースのサービス間トポロジー可視化 |
| 12 | Recent Errors | Logs | Loki からの直近エラーログ（level=error or status≥500） |

**活用シーン:**
- デプロイ後の健全性確認（Error Rate, Latency の急変がないか）
- 障害検知の第一画面（Error Budget が減っていないか）
- サービス間依存関係の把握（Service Map）

### 6.2 Kensan - Request Explorer

**ファイル:** `grafana/dashboards/kensan-request-explorer.json`

**目的:** 特定エンドポイントのパフォーマンス分析、スロークエリ調査、リクエスト単位のトレース探索。Service Overview で異常を発見した後のドリルダウン用。

**変数:**
- `service`: サービス名フィルター（デフォルト: 全サービス）
- `method`: HTTP メソッドフィルター（複数選択可、デフォルト: 全メソッド）

**パネル構成:**

| # | パネル名 | 種別 | データソース | 説明 |
|---|---------|------|-------------|------|
| 1 | Endpoint Latency Heatmap | Heatmap | Prometheus | レイテンシ分布をバケットごとに可視化。外れ値を発見しやすい |
| 2 | Top Endpoints by Request Count | Table | Prometheus | エンドポイント別のリクエスト数、p95 レイテンシ、エラー率（上位15件） |
| 3 | Slow DB Queries | Table | Tempo | 100ms 超の DB クエリをトレースから抽出（TraceQL: `name =~ "SELECT\|INSERT\|UPDATE\|DELETE" && duration > 100ms`） |
| 4 | Errors by Endpoint | Stacked bar | Prometheus | エンドポイント×ステータスコード別のエラー数 |
| 5 | Trace Search | Table | Tempo | 選択サービスのトレース一覧（最新30件） |
| 6 | Request Logs with Trace Correlation | Logs | Loki | 選択サービスのログ（JSON パース済み、トレース ID 付き） |

**活用シーン:**
- 「どのエンドポイントが遅い？」→ Endpoint Latency Heatmap + Top Endpoints
- 「DB がボトルネック？」→ Slow DB Queries でスロークエリを特定
- 「特定リクエストの詳細を追いたい」→ Trace Search でトレースを選択 → Tempo で全スパンを確認
- 「エラーの詳細を見たい」→ Logs パネルでトレース ID をクリック → Tempo にジャンプ

---

## 7. データソース連携

### 7.1 Traces → Logs（Tempo → Loki）

Tempo の `tracesToLogsV2` 設定により、トレース詳細画面からワンクリックで関連ログを表示できる。

```yaml
# datasources.yaml
tracesToLogsV2:
  datasourceUid: loki
  filterByTraceID: true
  customQuery: true
  query: '{service_name=~".+"} | json | trace_id="${__trace.traceId}"'
```

**フロー:**
1. Grafana の Tempo パネルでトレースを選択
2. 「Logs for this span」リンクをクリック
3. Loki にトレース ID でフィルターされたクエリが実行される

### 7.2 Logs → Traces（Loki → Tempo）

Loki の `derivedFields` 設定により、ログ内のトレース ID がクリック可能なリンクになる。

```yaml
# datasources.yaml
derivedFields:
  - datasourceUid: tempo
    matcherRegex: '"trace_id":"(\w+)"'
    name: TraceID
    url: "${__value.raw}"
    urlDisplayLabel: "View Trace"
```

**フロー:**
1. Grafana の Loki パネルでログを表示
2. ログ行の `TraceID` フィールドに「View Trace」リンクが表示される
3. クリックすると Tempo のトレース詳細画面に遷移

### 7.3 Service Map（Tempo → Prometheus）

Tempo の `serviceMap` 設定により、トレースデータからサービス間のトポロジーを自動生成する。

```yaml
serviceMap:
  datasourceUid: prometheus
```

Service Overview ダッシュボードの Node Graph パネルで表示される。

---

## 8. 設定ファイル一覧

| ファイル | 説明 |
|---------|------|
| `otel-collector-config.yaml` | OTel Collector のレシーバー・プロセッサー・エクスポーター設定 |
| `prometheus.yml` | Prometheus のスクレイプ設定 |
| `loki.yaml` | Loki のストレージ・スキーマ・リテンション設定 |
| `tempo.yaml` | Tempo のストレージ・コンパクション・メトリクスジェネレーター設定 |
| `grafana/provisioning/datasources/datasources.yaml` | Grafana データソース定義（Tempo, Loki, Prometheus） |
| `grafana/provisioning/dashboards/dashboards.yaml` | Grafana ダッシュボードプロビジョニング |
| `grafana/dashboards/kensan-service-overview.json` | Service Overview ダッシュボード定義 |
| `grafana/dashboards/kensan-request-explorer.json` | Request Explorer ダッシュボード定義 |

### OTel Collector パイプライン構成

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter/drop-http-send, batch]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [loki]
```

**`filter/drop-http-send` プロセッサー:**

FastAPI の自動計装が SSE ストリーミング時に yield ごとに `http send` スパンを生成する。μs 単位で有用な情報がなくトレースビューのノイズになるため、Collector レベルで除外する。

```yaml
filter/drop-http-send:
  traces:
    span:
      - 'name == "POST /api/v1/agent/stream http send"'
      - 'name == "GET /api/v1/agent/stream http send"'
```

---

## 9. 運用ガイド

### 9.1 ローカル開発での起動

```bash
# 全スタック起動（アプリ + observability）
make up

# Grafana にアクセス
open http://localhost:3000
```

Grafana は匿名アクセスが有効（admin ロール）のため、ログイン不要。

### 9.2 障害調査フロー

```
1. Service Overview を開く
   → Error Rate や Latency に異常がないか確認

2. 異常があるサービスを特定
   → Service 変数で絞り込み

3. Request Explorer にドリルダウン
   → Top Endpoints でどのエンドポイントが問題か特定
   → Slow DB Queries で DB ボトルネックをチェック

4. Trace Search で個別トレースを調査
   → スパンの階層構造でボトルネックの箇所を特定

5. Logs パネルでエラー詳細を確認
   → トレース ID でフィルターして前後のコンテキストを把握
```

### 9.3 Grafana で使える主要クエリ

**PromQL（メトリクス）:**

```promql
# 特定サービスのリクエストレート
sum(rate(http_server_request_duration_seconds_count{job="task-service"}[5m]))

# 全サービスの 5xx エラー率
sum(rate(http_server_request_duration_seconds_count{http_response_status_code=~"5.."}[5m]))
/ sum(rate(http_server_request_duration_seconds_count[5m]))

# エンドポイント別 p95 レイテンシ
histogram_quantile(0.95,
  sum by (le, http_route)(
    rate(http_server_request_duration_seconds_bucket{job="task-service"}[5m])
  )
)
```

**TraceQL（トレース）:**

```
# 特定サービスの全トレース
{resource.service.name = "task-service"}

# 500ms 超のリクエスト
{resource.service.name = "task-service" && duration > 500ms}

# スロー DB クエリ
{resource.service.name =~ ".*" && name =~ "SELECT|INSERT|UPDATE|DELETE" && duration > 100ms}
```

**LogQL（ログ）:**

```logql
# 特定サービスのエラーログ
{job="task-service"} | json | level = "error"

# トレース ID でフィルター
{job="kensan-ai"} | json | trace_id = "abc123..."

# 5xx レスポンスのログ
{job=~".+"} | json | status >= 500
```

### 9.4 新しいサービスを追加する場合

1. `bootstrap` パッケージを使ってサービスを初期化する（Go の場合）
   - `OTelTrace`, `Metrics`, `Logger` ミドルウェアが自動適用される
2. Docker Compose で環境変数を設定:
   ```yaml
   environment:
     OTEL_ENABLED: "true"
     OTEL_COLLECTOR_URL: "otel-collector:4318"
   ```
3. Grafana ダッシュボードは `job` ラベルで動的にサービスを検出するため、ダッシュボード側の変更は不要

### 9.5 Kubernetes 環境

`k8s/observability/otel-collector.yaml` に DaemonSet 構成が用意されている。

- 各ノードに OTel Collector が配置される
- `k8sattributes` プロセッサーで Pod 名、Namespace、Deployment 名が自動付与される
- Exporter は クラスタ内の `tempo`, `prometheus`, `loki` サービスに向ける

### 9.6 リテンション設定

| コンポーネント | 保持期間 | 設定場所 |
|---------------|---------|---------|
| Prometheus | 48時間 | `docker-compose.yml` (`--storage.tsdb.retention.time=48h`) |
| Tempo | 48時間 | `tempo.yaml` (`block_retention: 48h`) |
| Loki | 7日間 | `loki.yaml` (`retention_period: 168h`) |

ログは調査頻度が高く遡りたいケースが多いため、メトリクス・トレースより長めに設定している。
