# Kensan（研鑽）

## エンジニアのための自己研鑽プラットフォーム

**企画書 Draft v0.4 | 2025年1月**

---

## 1. エグゼクティブサマリー

Kensanは、エンジニアの継続的な自己研鑽を支援する統合プラットフォームです。「目標→プロジェクト→タスク→時間」の階層構造を持ち、生成AIが振り返りと成長をサポートします。

**コアコンセプト**: ドラッカーの時間管理哲学に基づき、「何に時間を使ったか」を可視化し、目標達成に向けた行動改善を促進します。

**技術的特徴**: Golden Kubestronaut取得過程で学んだCloud Native技術を全面的に活用。Kubernetes、マイクロサービス、Observability、GitOps、Service Mesh等を実践的に組み合わせ、OSS公開を前提とした設計。

---

## 2. 背景と課題

### 2.1 現状の課題

現在、エンジニアの自己研鑽ツールは複数のサービスを組み合わせて使用する必要があります：

- **GitHub Projects**: タスク管理（親子関係は表現可能だが時間管理と非連携）
- **Clockify**: 時間トラッキング（プロジェクト階層の親子紐づけが困難）
- **Notion**: メモ・ドキュメント管理（タスク管理との連携が弱い）

これらのツールは主にチーム向けに設計されており、個人の自己研鑽に特化したものは存在しません。

### 2.2 具体的なペインポイント

- **目標とタスクの紐づけ困難**: 「Golden Kubestronaut取得」という目標に対し、ICA/PCA等の個別タスクの進捗・時間配分が把握しにくい
- **振り返りの分断**: 週次・月次の振り返り時に、複数ツールからデータを手動で集約する必要がある
- **定期タスク管理の不在**: 日常的な習慣（掃除、ジム、情報収集等）を既存ツールで管理しにくい
- **学習記録の散逸**: メモや図解がタスク・プロジェクトと紐づかず、後から参照しにくい

---

## 3. ターゲットユーザー

### 3.1 プライマリターゲット（自分自身）

- プラットフォームエンジニア、Cloud Native技術に精通
- 複数の技術資格取得を並行して進めている
- 育児と仕事の両立の中で効率的な自己研鑽を求めている
- 自分の成長を可視化し、次のアクションを明確にしたい

### 3.2 セカンダリターゲット（OSS利用者）

- 20〜30代のソフトウェアエンジニア
- 継続的な技術学習・資格取得に取り組んでいる
- 既存ツールの組み合わせに不満を感じている
- セルフホスト可能なOSSソリューションを好む

### 3.3 ターシャリターゲット（CNCF技術学習者）

Golden KubestronautやCNCF資格取得を目指すエンジニア、Cloud Native技術を実践的に学びたいエンジニア向けに、Kensanは**学習教材としての価値**も提供する。

**Kensanで学べるCNCF技術スタック**:

| 技術領域 | 採用技術 | 学べること |
|----------|----------|------------|
| **Observability** | Prometheus, Grafana, OpenTelemetry, Jaeger | メトリクス収集、分散トレーシング、テレメトリダッシュボード構築 |
| **Service Mesh** | Istio | mTLS、トラフィック管理、サービス間通信の可視化 |
| **CNI** | Cilium | eBPF、L7ポリシー、ネットワークセキュリティ |
| **Policy as Code** | Kyverno | Admission Control、安全なデプロイ戦略、ポリシー自動適用 |
| **GitOps** | ArgoCD | 宣言的デプロイ、Git駆動のCD、Sync戦略 |
| **Progressive Delivery** | Argo Rollouts | カナリアデプロイ、Blue-Green、自動ロールバック |
| **Event-Driven** | Argo Events, Argo Workflows | イベント駆動アーキテクチャ、ワークフロー自動化 |
| **Developer Portal** | Backstage | サービスカタログ、テンプレート、ドキュメント統合 |

**学習者向けの提供価値**:

```
┌─────────────────────────────────────────────────────────────────┐
│  Kensan as a Learning Platform                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 Observability Dashboard                                     │
│     - Prometheus/Grafanaによるメトリクス可視化                    │
│     - OpenTelemetryによる分散トレーシング                         │
│     - Jaegerでのトレース分析                                     │
│                                                                 │
│  🔒 Security & Policy                                           │
│     - Kyvernoポリシーによるセキュアなデプロイ                      │
│     - Pod Security Standards適用例                              │
│     - Network Policy設計パターン                                 │
│                                                                 │
│  🚀 GitOps & Delivery                                           │
│     - ArgoCDによる宣言的デプロイメント                            │
│     - Argo Rolloutsによるカナリアリリース                         │
│     - Argo Events/Workflowsによるイベント駆動                    │
│                                                                 │
│  📚 Reference Implementation                                    │
│     - 本番レベルのKubernetesマニフェスト                          │
│     - Helm Chart / Kustomize構成例                              │
│     - CI/CDパイプライン設計                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**想定する学習者ペルソナ**:

- **資格取得者**: CKA/CKAD/CKS取得後、実践経験を積みたいエンジニア
- **Golden Kubestronaut志望者**: 複数のCNCF資格を目指し、統合的な学習環境を求める人
- **Platform Engineer志望者**: IDP構築やObservabilityを実践的に学びたい人
- **SRE/DevOps転職希望者**: ポートフォリオとして参照できる本番レベルの構成を学びたい人

---

## 4. プロダクトビジョン

### 4.1 ビジョンステートメント

> 「目標を持つエンジニアが、日々の行動と時間を可視化し、AIと共に成長を振り返る、自己研鑽のホームグラウンド」

### 4.2 プロダクト名: Kensan（研鑽）

- **意味**: 「学問や技芸を深く究めること」
- **響き**: ポジティブで楽しいイメージ、日本発OSSとしてのアイデンティティ
- **覚えやすさ**: 短く、発音しやすい

---

## 5. 機能概要

| 機能 | 概要 | 優先度 | フェーズ |
|------|------|--------|----------|
| 時間トラッキング | Clockify API連携、目標タグによるグループ化、時間配分可視化 | ★★★ | MVP |
| タスク管理 | 朝の画面（ToDo）、夜の画面（振り返り）、目標完了日管理 | ★★★ | MVP |
| 学習記録 | Markdown/drawio対応、プロジェクト紐づけ、全文検索 | ★★★ | MVP |
| 定期タスク | 毎日/曜日指定の習慣タスク、Done管理 | ★★☆ | Phase 2 |
| AI振り返り | 週次振り返り生成、成長アドバイス、目標達成支援 | ★★☆ | Phase 2 |
| ニュース通知 | 興味分野の自動収集、技術トレンド通知 | ★☆☆ | Phase 3 |

### 5.1 朝の画面・夜の画面

| 朝の画面（計画） | 夜の画面（振り返り） |
|------------------|----------------------|
| 今日やるタスク一覧 | 今日の時間記録（カレンダー表示） |
| 定期タスクの自動表示 | プロジェクト進捗状況 |
| 優先度・締切順ソート | 目標タグごとの時間配分 |
| 前日夜に選択したタスク | 学習記録の作成・編集 |
| その場での編集・追加 | 翌日タスクの選択 |

### 5.2 学習記録システム

**対応フォーマット**:
- **Markdown**: Milkdown（WYSIWYG）エディタ内蔵
- **drawio**: diagrams.net埋め込み、ノート的な図解作成に対応

**特徴**:
- Clockifyのプロジェクト・タスクとの紐づけ
- drawioからのテキスト自動抽出による全文検索
- pgvectorによるEmbedding検索（AI連携用）

---

## 6. 技術アーキテクチャ

### 6.1 技術スタック

| レイヤー | 技術 | 役割 |
|----------|------|------|
| Frontend | React, Milkdown, react-drawio | UI、エディタ |
| Client Storage | IndexedDB (Dexie.js) | キャッシュ、下書き保存 |
| Client Analytics | DuckDB-WASM | 時間記録の分析・集計 |
| Backend | Go / gRPC | マイクロサービス |
| Database | PostgreSQL + pgvector | メタデータ、全文検索、Embedding |
| Object Storage | MinIO (S3互換) | md/drawioファイル保存 |
| Observability | Prometheus, Grafana, Jaeger | メトリクス、トレース |
| Platform | Kubernetes, ArgoCD, Istio, Cilium | オーケストレーション、GitOps |
| Developer Portal | Backstage | サービスカタログ、ドキュメント |

### 6.2 マイクロサービス構成

- **Task Service**: Clockify API連携、プロジェクト・タスク管理
- **Record Service**: 学習記録CRUD、ファイル管理
- **Analytics Service**: 時間分析、レポート生成
- **Routine Service**: 定期タスク管理（独自DB）
- **AI Service**: 振り返り生成、アドバイス（Claude Agent SDK）
- **News Service**: RSS/API連携、通知
- **Sync Service**: Clockify同期、外部データ連携

### 6.3 AI Service 設計

**Claude API (Agent SDK) を使用**:
- サブスクリプションでは組み込み不可、**APIキー必須**（従量課金）
- Tool Use でカスタムツールを定義

**料金目安**:
| モデル | Input | Output | 用途 |
|--------|-------|--------|------|
| Sonnet 4.5 | $3/1M tokens | $15/1M tokens | 振り返り生成（推奨） |
| Haiku 4.5 | $0.80/1M | $4/1M | 軽量タスク |
| Opus 4.5 | $5/1M | $25/1M | 複雑な分析 |

**コスト試算**: 週次振り返り1回 ≈ 7円、月4回で約30円

### 6.4 データプライバシーとAPI連携

外部APIとの連携において、データプライバシーに関する留意点を整理する。

#### Clockify API利用に関する方針

- 各ユーザーが自身のClockify APIキーを使用（Kensanがキーを保持しない）
- KensanはClockifyデータを保持・再販しない
- ユーザー自身のデータをユーザー自身のために利用
- Clockify公式の「open API」ポリシーに準拠

#### AI機能（Claude API）利用時のデータフロー

AI振り返り機能では、ユーザーの時間記録データがClaude APIに送信される。以下の対策を実装する：

1. **オプトイン方式**: AI振り返り機能はデフォルトOFF、ユーザーが明示的に有効化
2. **同意取得**: 初回利用時に「データがClaude APIに送信される」旨を説明し同意を取得
3. **データ最小化**: 送信データは必要最小限に限定（プロジェクト名、時間、カテゴリ等）
4. **透明性**: Anthropic APIはビジネスデータをモデルトレーニングに使用しない旨を明記

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────>│   Kensan    │────>│ Claude API  │
│ (自分のデータ) │     │ (中継のみ)   │     │ (分析処理)   │
└─────────────┘     └─────────────┘     └─────────────┘
       ↑                                       │
       └───────────── 結果返却 ────────────────┘
```

#### プライバシー重視オプション（Phase 3以降）

プライバシーを重視するユーザー向けに、以下のオプションを将来的に提供予定：

| オプション | 内容 | フェーズ |
|------------|------|----------|
| ローカルLLM対応 | Ollama, llama.cpp等によるオンプレミス処理 | Phase 3 |
| データ匿名化 | プロジェクト名のハッシュ化オプション | Phase 3 |
| AI機能無効化 | AI振り返り機能の完全無効化 | Phase 2 |

#### 利用規約への明記事項

Kensan利用規約において、以下を明確に記載する：

- 外部API（Clockify, Claude API）へのデータ送信について
- データの保持・非保持ポリシー
- ユーザーによるデータ削除権
- 第三者へのデータ提供は行わない旨

---

## 7. Golden Kubestronaut 資格・技術マッピング

本プロジェクトでは、Golden Kubestronaut取得過程で学んだ全技術を実践的に活用します。

### 7.1 資格と活用技術の対応表

| 資格 | 技術領域 | Kensanでの活用 |
|------|----------|----------------|
| **CKA** | Kubernetes Administration | クラスタ構築・運用、ワークロード管理 |
| **CKAD** | Kubernetes App Development | マイクロサービスのデプロイメント設計 |
| **CKS** | Kubernetes Security | Pod Security Standards, RBAC, Network Policy |
| **KCNA** | Cloud Native Fundamentals | アーキテクチャ設計の基盤知識 |
| **KCSA** | Security Associate | セキュリティベストプラクティス適用 |
| **LFCS** | Linux System Admin | コンテナ基盤、トラブルシューティング |
| **ICA** | Istio Administration | Service Mesh（mTLS, Traffic Management） |
| **CCA** | Cilium Administration | CNI, eBPF, Network Policy |
| **KCA** | Kyverno Administration | Policy as Code, Admission Control |
| **PCA** | Prometheus Administration | メトリクス収集、アラート設計 |
| **OTCA** | OpenTelemetry Administration | 分散トレーシング、テレメトリー |
| **CgOA** | Argo GitOps Associate | GitOps基盤知識 |
| **ArgoCD** | ArgoCD | GitOpsデプロイメント |
| **CBA** | Backstage Associate | Developer Portal, サービスカタログ |

### 7.2 現時点で活用予定の技術

```
┌─────────────────────────────────────────────────────────────────┐
│  Platform Layer (CKA, CKAD, CKS, KCNA, KCSA, LFCS)             │
│  ├─ Kubernetes Cluster                                         │
│  ├─ Pod Security Standards                                     │
│  └─ RBAC, Network Policy                                       │
├─────────────────────────────────────────────────────────────────┤
│  Networking (ICA, CCA)                                          │
│  ├─ Istio Service Mesh (mTLS, Traffic Management)              │
│  └─ Cilium CNI (eBPF, L7 Policy)                               │
├─────────────────────────────────────────────────────────────────┤
│  Policy & Security (KCA)                                        │
│  └─ Kyverno (Policy as Code, Admission Control)                │
├─────────────────────────────────────────────────────────────────┤
│  Observability (PCA, OTCA)                                      │
│  ├─ Prometheus (Metrics, Alerting)                             │
│  ├─ Grafana (Dashboard)                                        │
│  ├─ OpenTelemetry (Tracing)                                    │
│  └─ Jaeger (Trace Visualization)                               │
├─────────────────────────────────────────────────────────────────┤
│  GitOps & Deployment (CgOA, ArgoCD)                             │
│  └─ ArgoCD (Application Deployment)                            │
├─────────────────────────────────────────────────────────────────┤
│  Developer Portal (CBA)                                         │
│  └─ Backstage (Service Catalog, Docs, Templates)               │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 追加活用予定: Argo Workflow / Events / Rollouts

現時点で未活用のArgo技術を以下の機能で活用予定：

#### 7.3.1 Argo Events + Argo Workflows 活用案

**ユースケース1: Clockify同期パイプライン**

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Clockify   │────>│ Argo Events  │────>│ Argo Workflows  │
│  Webhook    │     │ EventSource  │     │                 │
└─────────────┘     └──────────────┘     │ 1. データ取得   │
                                         │ 2. 変換処理     │
                                         │ 3. DB更新       │
                                         │ 4. キャッシュ   │
                                         └─────────────────┘
```

- **EventSource**: Clockify Webhook受信（タイマー開始/停止、時間記録更新）
- **Sensor**: イベントフィルタリング、Workflow起動条件定義
- **Workflow**: データ変換、PostgreSQL更新、Redis キャッシュ更新

**ユースケース2: 技術ニュース収集パイプライン**

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────────┐
│  Cron       │────>│ Argo Events  │────>│ Argo Workflows          │
│  (定期実行)  │     │ Calendar     │     │                         │
└─────────────┘     └──────────────┘     │ 1. RSS/API取得          │
                                         │ 2. コンテンツ解析       │
                                         │ 3. AI要約生成           │
                                         │ 4. フィルタリング       │
                                         │ 5. 通知送信             │
                                         └─────────────────────────┘
```

- **EventSource**: Calendar（Cron式で定期実行、例: 毎朝7時）
- **Workflow Template**: 再利用可能なニュース収集テンプレート
- **DAG**: 並列でRSS取得 → 集約 → AI要約 → 通知

**ユースケース3: 週次振り返りレポート自動生成**

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────────┐
│  Cron       │────>│ Argo Events  │────>│ Argo Workflows          │
│  (毎週日曜) │     │ Calendar     │     │                         │
└─────────────┘     └──────────────┘     │ 1. 週間データ集計       │
                                         │ 2. Claude API呼び出し   │
                                         │ 3. レポート生成         │
                                         │ 4. 通知/保存            │
                                         └─────────────────────────┘
```

#### 7.3.2 Argo Rollouts 活用案

**Progressive Delivery for Microservices**

```yaml
# 各マイクロサービスのカナリアデプロイ
strategy:
  canary:
    steps:
    - setWeight: 10
    - pause: {duration: 5m}
    - setWeight: 30
    - pause: {duration: 5m}
    - setWeight: 50
    - pause: {duration: 5m}
    analysis:
      templates:
      - templateName: success-rate
      - templateName: latency-p99
```

- **Task Service**: Clockify連携の安定性が重要、カナリアで段階的リリース
- **AI Service**: Claude API呼び出しの成功率・レイテンシを監視
- **Istio連携**: トラフィック分割とAnalysisRunの組み合わせ

### 7.4 Argo技術の活用まとめ

| Argo技術 | 活用場所 | 具体的な用途 |
|----------|----------|--------------|
| **Argo Events** | Sync Service | Clockify Webhook受信、Cron起動 |
| **Argo Workflows** | News Service, Analytics | ニュース収集パイプライン、週次レポート生成 |
| **Argo Workflows** | Sync Service | Clockifyデータ同期処理 |
| **Argo Rollouts** | 全マイクロサービス | カナリアデプロイ、Progressive Delivery |
| **ArgoCD** | Platform | GitOpsデプロイメント（既存） |

---

## 8. 差別化ポイント

### 8.1 競合比較

| 機能 | Kensan | Clockify | Notion | Obsidian |
|------|--------|----------|--------|----------|
| 目標階層 | ◎ | △ | ○ | △ |
| 時間トラッキング | ◎ | ◎ | △ | × |
| 学習記録 | ◎ | × | ○ | ◎ |
| AI振り返り | ◎ | × | ○ | △ |
| セルフホスト | ◎ | × | × | ◎ |
| 個人特化 | ◎ | △ | △ | ○ |

### 8.2 Kensanの強み

- **統合性**: 目標・時間・記録・AIを一つのプラットフォームで完結
- **個人最適化**: チーム機能を排除し、自己研鑽に特化したUX
- **技術的透明性**: OSS公開、セルフホスト可能、カスタマイズ自由
- **Cloud Native**: 現代的な技術スタックによる拡張性とObservability
- **ポートフォリオ価値**: Golden Kubestronaut全技術の実践証明

### 8.3 CNCF技術学習プラットフォームとしての価値

Kensanは単なる自己研鑽ツールではなく、**Cloud Native技術の実践的リファレンス実装**としての価値を提供する。

**提供するObservability Stack**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Kensan Observability Dashboard               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Prometheus │  │   Grafana   │  │   Jaeger    │            │
│  │  (Metrics)  │  │ (Dashboard) │  │  (Tracing)  │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                │                    │
│         └────────────────┴────────────────┘                    │
│                          │                                     │
│              ┌───────────┴───────────┐                         │
│              │    OpenTelemetry      │                         │
│              │  (Unified Telemetry)  │                         │
│              └───────────────────────┘                         │
│                          │                                     │
│    ┌─────────┬───────────┼───────────┬─────────┐              │
│    ▼         ▼           ▼           ▼         ▼              │
│ ┌─────┐  ┌─────┐    ┌─────┐    ┌─────┐   ┌─────┐            │
│ │Task │  │Record│    │ AI  │    │News │   │Sync │            │
│ │ Svc │  │ Svc │    │ Svc │    │ Svc │   │ Svc │            │
│ └─────┘  └─────┘    └─────┘    └─────┘   └─────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Kyvernoによる安全なデプロイ戦略**:

```yaml
# Kensanで実装するKyvernoポリシー例
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: kensan-security-baseline
spec:
  rules:
    # Pod Security Standards (Restricted)
    - name: require-non-root
      match:
        resources:
          kinds: ["Pod"]
      validate:
        message: "Running as root is not allowed"
        pattern:
          spec:
            securityContext:
              runAsNonRoot: true
    
    # Resource制限の強制
    - name: require-resource-limits
      match:
        resources:
          kinds: ["Pod"]
      validate:
        message: "Resource limits are required"
        pattern:
          spec:
            containers:
              - resources:
                  limits:
                    memory: "?*"
                    cpu: "?*"
    
    # イメージ署名検証
    - name: verify-image-signature
      match:
        resources:
          kinds: ["Pod"]
      verifyImages:
        - imageReferences: ["ghcr.io/kensan/*"]
          attestors:
            - entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      ...
                      -----END PUBLIC KEY-----
```

**ArgoCDによるGitOps実現**:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Kensan GitOps Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Developer                                                      │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────┐    PR/Merge    ┌─────────────┐                    │
│  │  Code   │ ─────────────> │   GitHub    │                    │
│  │ Change  │                │ Repository  │                    │
│  └─────────┘                └──────┬──────┘                    │
│                                    │                            │
│                                    │ Webhook                    │
│                                    ▼                            │
│                             ┌─────────────┐                    │
│                             │   ArgoCD    │                    │
│                             │  (GitOps)   │                    │
│                             └──────┬──────┘                    │
│                                    │                            │
│                    ┌───────────────┼───────────────┐           │
│                    ▼               ▼               ▼           │
│              ┌─────────┐    ┌─────────┐    ┌─────────┐        │
│              │ Kyverno │    │  Argo   │    │  Istio  │        │
│              │ Policy  │    │Rollouts │    │ Config  │        │
│              │  Check  │    │(Canary) │    │  Sync   │        │
│              └─────────┘    └─────────┘    └─────────┘        │
│                                                                 │
│  ✓ 宣言的な構成管理                                             │
│  ✓ Git = Single Source of Truth                                │
│  ✓ 自動Sync & Self-Healing                                     │
│  ✓ Rollback対応                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**学習者が得られるスキル**:

| 領域 | 具体的なスキル | 関連資格 |
|------|----------------|----------|
| Observability | メトリクス設計、SLI/SLO定義、ダッシュボード構築 | PCA, OTCA |
| Security | Policy as Code、Admission Control、イメージ署名 | CKS, KCA |
| GitOps | 宣言的デプロイ、Sync戦略、マルチ環境管理 | CgOA |
| Service Mesh | mTLS、トラフィック制御、Observability統合 | ICA |
| Progressive Delivery | カナリア分析、自動ロールバック、Feature Flag | - |

---

## 9. ロードマップ

### Phase 1: MVP（3ヶ月）
- Clockify API連携による時間トラッキング
- 朝の画面・夜の画面の基本実装
- 学習記録（Markdown/drawio）の作成・保存
- 基本的なプロジェクト・タスク紐づけ
- ArgoCD によるGitOpsデプロイ
- 基本的なObservability（Prometheus + Grafana）

### Phase 2: コア機能拡充（2ヶ月）
- 定期タスク管理
- AI振り返り機能（Claude Agent SDK）
- 全文検索・Embedding検索
- 時間分析ダッシュボード
- Argo Rollouts によるカナリアデプロイ導入

### Phase 3: 高度機能（2ヶ月）
- ニュース通知機能（**Argo Events + Workflows**）
- Clockify Webhook同期（**Argo Events + Workflows**）
- 高度なAIアドバイス（目標達成予測等）
- DuckDB-WASMによるクライアント分析

### Phase 4: Platform統合（2ヶ月）
- Backstage統合（サービスカタログ、Docs）
- 完全なObservability実装（OpenTelemetry）
- Kyverno によるPolicy as Code
- OSS公開準備（ドキュメント、Helm Chart等）

---

## 10. 成功指標

### 10.1 ポートフォリオとしての評価軸

- Cloud Native技術の実践的活用（Golden Kubestronautの証明）
- マイクロサービス設計・実装能力の可視化
- Observability・Platform Engineering知見の実証
- OSS公開によるコミュニティへの貢献
- **Argo Workflow/Events/Rolloutsの実践経験**

### 10.2 OSSとしての指標

- GitHub Stars: 100+ (6ヶ月目標)
- Zenn/技術ブログでの記事公開: 10本以上
- 外部コントリビューター: 3名以上

### 10.3 個人利用としての指標

- 日次アクティブ利用の継続
- 学習記録の蓄積: 100件以上
- 目標達成率の可視化と改善

### 10.4 CNCF学習プラットフォームとしての指標

- Kensanを参考にCNCF資格を取得した報告: 5件以上
- 技術ブログでのKensanアーキテクチャ解説記事: 5本以上
- Observabilityダッシュボードのカスタマイズ例共有: 3件以上
- Kyvernoポリシーのコミュニティ貢献: 2件以上

---

## 付録A: 用語集

| 用語 | 説明 |
|------|------|
| Kensan（研鑽） | 本プロダクトの名称。学問や技芸を深く究めることを意味する |
| 目標タグ | 複数のプロジェクトをグループ化するためのタグ（例：Golden Kubestronaut） |
| 朝の画面 | 1日の計画を立てるためのタスク一覧画面 |
| 夜の画面 | 1日の振り返りを行うための時間記録・分析画面 |
| 学習記録 | Markdown/drawio形式で保存される学習メモ・図解 |

---

## 付録B: 資格略称一覧

| 略称 | 正式名称 | 発行元 |
|------|----------|--------|
| CKA | Certified Kubernetes Administrator | CNCF |
| CKAD | Certified Kubernetes Application Developer | CNCF |
| CKS | Certified Kubernetes Security Specialist | CNCF |
| KCNA | Kubernetes and Cloud Native Associate | CNCF |
| KCSA | Kubernetes and Cloud Native Security Associate | CNCF |
| LFCS | Linux Foundation Certified System Administrator | LF |
| ICA | Istio Certified Associate | CNCF |
| CCA | Cilium Certified Associate | CNCF |
| KCA | Kyverno Certified Associate | CNCF |
| PCA | Prometheus Certified Associate | CNCF |
| OTCA | OpenTelemetry Certified Associate | CNCF |
| CgOA | Certified GitOps Associate | CNCF |
| CBA | Certified Backstage Associate | CNCF |

---

*Last Updated: 2025-01-05*
