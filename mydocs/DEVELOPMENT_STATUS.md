# Kensan 開発状況

**最終更新: 2026-01-21**

---

## 概要

Kensanは、エンジニアの自己研鑽を支援する統合プラットフォームです。時間トラッキング、タスク管理、学習記録、AI振り返り機能を提供します。

---

## 技術スタック

### フロントエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| React | 18.x | UIフレームワーク |
| TypeScript | 5.6 | 型安全性 |
| Vite | 6.x | ビルドツール |
| shadcn/ui | - | UIコンポーネント |
| Tailwind CSS | 4.x | スタイリング |
| Zustand | 5.x | 状態管理 |
| React Router | 7.x | ルーティング |
| Recharts | 3.x | グラフ表示 |
| date-fns | 4.x | 日付操作 |
| MSW | 2.x | 開発時モック |

### バックエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| Go | 1.24.0 | サーバーサイド |
| chi | v5 | HTTPルーター |
| PostgreSQL | 16 | データベース |
| pgx | v5 | DBドライバ |
| zerolog | - | ロギング |

### インフラ
| 技術 | 用途 |
|------|------|
| Docker | コンテナ化 |
| Docker Compose | ローカル開発環境 |

---

## プロジェクト構造

```
kensan-mockup/
├── src/                          # フロントエンド
│   ├── api/                      # APIクライアント層
│   │   ├── config.ts             # 環境変数設定
│   │   ├── client.ts             # HTTPクライアント（JWT認証対応）
│   │   └── services/             # 各サービスAPI
│   ├── mocks/                    # MSWモック（オプトイン）
│   │   ├── browser.ts            # MSWワーカー設定
│   │   ├── handlers.ts           # ハンドラー集約
│   │   ├── data.ts               # モックデータ
│   │   └── handlers/             # 各エンドポイントハンドラー
│   ├── components/
│   │   ├── ui/                   # shadcn/ui コンポーネント
│   │   ├── layout/               # レイアウト
│   │   ├── common/               # 共通コンポーネント
│   │   └── editor/               # エディタ（プレースホルダー）
│   ├── pages/                    # 画面コンポーネント
│   ├── stores/                   # Zustand ストア
│   ├── hooks/                    # カスタムフック
│   ├── lib/                      # ユーティリティ（timezone等）
│   └── types/                    # 型定義
├── backend/                      # バックエンド
│   ├── services/                 # 9つのマイクロサービス
│   ├── shared/                   # 共有パッケージ
│   ├── migrations/               # DBマイグレーション
│   ├── e2e/                      # E2Eテスト
│   └── Makefile
├── public/
│   └── mockServiceWorker.js      # MSWサービスワーカー
├── docker-compose.yml            # 統合Docker Compose
├── Dockerfile                    # フロントエンド用
└── Makefile                      # 開発コマンド
```

---

## 画面一覧と実装状況

| ID | 画面名 | パス | 状態 |
|----|--------|------|------|
| S01 | 設定画面 | `/settings` | ✅ 実装完了 |
| S02 | ダッシュボード | `/` | ✅ 実装完了 |
| M01 | 朝の画面 | `/morning` | ✅ 実装完了 |
| E01 | 夜の画面 | `/evening` | ✅ 実装完了 |
| L01 | 学習記録一覧 | `/learning-records` | ✅ 実装完了 |
| L02 | 学習記録編集 | `/learning-records/:id` | ✅ 実装完了 |
| D01 | 日記一覧 | `/diary` | ✅ 実装完了 |
| D02 | 日記編集 | `/diary/:id` | ✅ 実装完了 |
| T01 | タスク管理 | `/tasks` | ✅ 実装完了 |
| R01 | 定期タスク管理 | `/routines` | ✅ 実装完了 |
| A01 | 分析・レポート | `/analytics` | ✅ 実装完了 |
| A02 | AI振り返り | `/ai-review` | ✅ 実装完了 |
| - | ログイン画面 | `/login` | ✅ 実装完了 |

---

## バックエンドサービス一覧

| サービス | ポート | 状態 | 概要 |
|----------|--------|------|------|
| user-service | 8081 | ✅ 実装済 | ユーザー認証・設定 |
| task-service | 8082 | ✅ 実装済 | プロジェクト・タスク管理 |
| sync-service | 8083 | ✅ 実装済 | Clockify同期 |
| timeblock-service | 8084 | ✅ 実装済 | タイムブロック管理（タイムゾーン対応） |
| routine-service | 8085 | ✅ 実装済 | 定期タスク管理 |
| record-service | 8086 | ✅ 実装済 | 学習記録管理 |
| diary-service | 8087 | ✅ 実装済 | 日記管理 |
| analytics-service | 8088 | ✅ 実装済 | 分析・レポート |
| ai-service | 8089 | ✅ 実装済 | AI振り返り |

---

## API連携状況

### アーキテクチャ

```
開発環境（MSW有効時）:
  Component → Store → API Service → fetch() → [MSW] → モックレスポンス

開発環境（MSW無効時）/ 本番環境:
  Component → Store → API Service → fetch() → 実際のバックエンド
```

- MSWはオプトイン（`VITE_ENABLE_MSW=true`で有効化）
- デフォルトでは実際のバックエンドに接続
- 本番ビルドにはモックコードは含まれない

### フロントエンド ↔ バックエンド連携状況

| 機能 | MSWモック | APIモード | 備考 |
|------|-----------|----------|------|
| 認証（JWT） | ✅ | ✅ 実装済 | ログイン/登録/トークン更新 |
| プロジェクト一覧/CRUD | ✅ | ✅ 実装済 | |
| タスク一覧/CRUD | ✅ | ✅ 実装済 | 階層構造対応 |
| タイムブロック（計画） | ✅ | ✅ 実装済 | |
| 時間記録（実績） | ✅ | ✅ 実装済 | Clockify同期対応 |
| 定期タスク | ✅ | ✅ 実装済 | |
| 学習記録 | ✅ | ✅ 実装済 | |
| 日記 | ✅ | ✅ 実装済 | |
| 分析データ | ✅ | ✅ 実装済 | |
| AI振り返り | ✅ | ✅ 実装済 | Claude API連携 |
| Clockify同期 | - | ✅ 実装済 | ワークスペース/プロジェクト/時間記録 |

---

## 最近の変更履歴

### 2026-01-21: タイムゾーン対応実装

フロントエンドとバックエンドでタイムゾーンを考慮したクエリ機能を実装。

**主な変更点:**
- `src/lib/timezone.ts`: タイムゾーン変換ユーティリティ追加
- `timeblock-service`: `start_timestamp`/`end_timestamp`パラメータ対応
- ストア: `fetchTimeBlocksForLocalDate`/`fetchTimeEntriesForLocalDate`メソッド追加
- 初期化フック: タイムゾーン考慮したデータ取得に変更

**技術詳細:**
- DBはUTC基準で保存
- フロントエンドがローカル日付をUTC範囲に変換
- バックエンドは`(date + start_time)`でタイムスタンプ範囲クエリ

### 2026-01-20: Clockify同期機能完成

Clockify APIとの連携機能が完成。

**主な変更点:**
- sync-service: API連携完成
- 時間記録のClockify同期
- プロジェクト自動同期
- 設定画面でのAPI Key/Workspace設定

### 2026-01-12: MSW移行完了

フロントエンドのモック戦略をMSW（Mock Service Worker）に移行。

**主な変更点:**
- `src/mocks/`: MSWハンドラー追加（約50エンドポイント）
- `dataProvider.ts`: 削除（約700行）
- ストア: API Service直接呼び出しに変更
- MSWはオプトイン方式に変更

---

## 環境変数

### フロントエンド

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `VITE_USER_SERVICE_URL` | `http://localhost:8081` | ユーザーサービスURL |
| `VITE_TASK_SERVICE_URL` | `http://localhost:8082` | タスクサービスURL |
| `VITE_SYNC_SERVICE_URL` | `http://localhost:8083` | 同期サービスURL |
| `VITE_TIMEBLOCK_SERVICE_URL` | `http://localhost:8084` | タイムブロックサービスURL |
| `VITE_ROUTINE_SERVICE_URL` | `http://localhost:8085` | 定期タスクサービスURL |
| `VITE_RECORD_SERVICE_URL` | `http://localhost:8086` | 学習記録サービスURL |
| `VITE_DIARY_SERVICE_URL` | `http://localhost:8087` | 日記サービスURL |
| `VITE_ANALYTICS_SERVICE_URL` | `http://localhost:8088` | 分析サービスURL |
| `VITE_AI_SERVICE_URL` | `http://localhost:8089` | AIサービスURL |
| `VITE_ENABLE_MSW` | `false` | MSWモック有効化 |

---

## 開発コマンド

### 起動

```bash
# 全サービス起動（フロント + バックエンド + DB）
make up

# フロントエンドのみ（ローカル、実バックエンド接続）
npm run dev

# フロントエンドのみ（MSWモック有効）
VITE_ENABLE_MSW=true npm run dev

# バックエンドのみ（DB + 全サービス）
make dev-backend
```

### 停止・その他

```bash
make down      # 全停止
make logs      # ログ表示
make health    # ヘルスチェック
make clean     # 全削除（ボリューム含む）
```

### テスト

```bash
# バックエンドユニットテスト
cd backend && make test

# バックエンドE2Eテスト
cd backend && go test ./e2e/... -v
```

---

## テストデータ

### テストユーザー

| 項目 | 値 |
|------|-----|
| Email | `test@kensan.dev` |
| Password | `password123` |
| Name | `Yu` |

### シードデータ内容

- **プロジェクト**: Certification (GK), Kensan (OSS), ブログ執筆 (Output), 読書 (Other)
- **タスク**: 各プロジェクトに複数のタスク（親子関係あり）
- **定期タスク**: 技術ニュースチェック、英語学習、筋トレ、週次振り返り
- **学習記録**: Istio, Kensan, Cilium, Prometheus関連
- **日記**: サンプルエントリー
- **AI振り返りレポート**: サンプルレポート

> **Note**: タイムブロックと時間記録はシードデータには含まれていません。
> - タイムブロック: ユーザーが手動作成または定期タスクから生成
> - 時間記録: Clockifyから同期

---

## 今後の作業

### 優先度高
- [ ] エラーハンドリングの改善（エラーバウンダリ追加）
- [ ] フロントエンドテストの追加（Vitest + React Testing Library）
- [ ] リクエストキャンセル機能（AbortController）

### 優先度中
- [ ] Markdownエディタの統合（Milkdown or similar）
- [ ] drawioエディタの統合
- [ ] レスポンシブ対応の改善
- [ ] バリデーション共通化（フロント/バック）

### 優先度低
- [ ] OpenAPI仕様書生成
- [ ] パフォーマンス最適化（メモ化、コード分割）
- [ ] E2Eテストの拡充（Playwright）

---

## アーキテクチャ上の特記事項

### タイムゾーン処理

- **DB**: 全てUTCで保存
- **Clockify**: UTCで同期
- **フロントエンド**: ユーザーのタイムゾーンで表示、クエリ時にUTC変換
- **設定**: `user_settings.timezone`で管理（デフォルト: Asia/Tokyo）

### マルチテナンシー

- 全テーブルに`user_id`カラム
- バックエンドはJWTから`user_id`を抽出
- 全クエリで`user_id`フィルタリング
- データ漏洩リスクなし

### 認証フロー

1. `/api/v1/auth/login`でJWTトークン取得
2. Zustand persist middlewareでlocalStorageに保存
3. アプリ起動時に自動復元
4. `httpClient`が全リクエストに`Authorization`ヘッダー付与

---

## 参照ドキュメント

- 企画書: `mydocs/kensan_proposal_v0.5.md`
- 画面要件: `mydocs/kensan_screen_requirements.md`
- API仕様: `mydocs/api_specification.md`
- 実装概要: `mydocs/implementation_overview.md`
- 実装詳細: `mydocs/implementation_details.md`
- アーキテクチャガイド: `mydocs/architecture_guide_for_beginners.md`
- ADR: `mydocs/adr/`
