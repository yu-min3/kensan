# Claude Code 設定ガイド

Kensan プロジェクトにおける Claude Code の設定構成と、各ファイルの役割・効果をまとめたドキュメント。

[Everything Claude Code](https://github.com/affaan-m/everything-claude-code) および [Anthropic 公式ベストプラクティス](https://www.anthropic.com/engineering/claude-code-best-practices) を参考に構築。

---

## 全体構成

```
.claude/
├── settings.json                          # パーミッション設定
├── rules/                                 # コンテキスト依存ルール（7ファイル）
│   ├── workflow.md                        # 自動テスト・自動ドキュメント更新
│   ├── backend-go.md                      # Go コーディング規約
│   ├── frontend-react.md                  # React/TS 規約
│   ├── database.md                        # DB スキーマ規約
│   ├── api-design.md                      # API 設計規約
│   ├── testing.md                         # テスト規約
│   └── security.md                        # セキュリティルール
└── skills/                                # Slash Command スキル（6スキル）
    ├── new-service/SKILL.md               # /new-service
    ├── new-page/SKILL.md                  # /new-page
    ├── new-endpoint/SKILL.md              # /new-endpoint
    ├── code-review/SKILL.md               # /code-review
    ├── go-test/SKILL.md                   # /go-test
    └── build-check/SKILL.md               # /build-check

CLAUDE.md                                  # エントリポイント（86行に圧縮）
```

---

## 設計思想

### Before: 静的な百科事典

以前の `CLAUDE.md`（413行）は、アーキテクチャ詳細、環境変数、DB スキーマ、トラブルシューティングまで全てを含んでいた。これは毎セッションの初期ロードで大量のトークンを消費していた。

### After: ガードレール＋ポインター＋オンデマンド

| レイヤー | ロードタイミング | 内容 |
|---------|---------------|------|
| `CLAUDE.md` | 毎セッション | 最小限のコマンド集＋参照先ポインター |
| `.claude/rules/` | 該当ファイル編集時 | パスに応じた詳細規約 |
| `ARCHITECTURE.md` | Claude が必要に応じて参照 | 完全なアーキテクチャ情報 |
| `.claude/skills/` | `/` コマンド実行時のみ | ワークフロー定義 |

この階層構造により、「必要な情報を、必要な時だけ」ロードする。

---

## CLAUDE.md（86行）

**役割**: 全セッションで最初に読み込まれる「憲法」。

**含まれるもの**:
- プロジェクト概要（1行）
- 開発コマンド一覧（dev/build/test/docker）
- ARCHITECTURE.md への参照テーブル
- サービス一覧（名前・ポート・ドメイン）
- 利用可能な Skills の一覧
- テストユーザー情報
- 仕様書への参照

**含まないもの（rules/skills/ARCHITECTURE.md に移動済み）**:
- コーディング規約の詳細
- DB スキーマ・ER 図
- 環境変数の全リスト
- 新機能追加手順
- トラブルシューティング
- API レスポンス形式の詳細

**効果**: 毎セッションのベーストークン消費を約 80% 削減。

---

## Rules（7ファイル）

Rules は `.claude/rules/` に配置する Markdown ファイル。YAML フロントマターの `globs` でパスパターンを指定すると、**該当ファイルの編集時にのみ自動ロード**される。`globs` なしのルールは全セッションで有効。

### workflow.md

```yaml
globs: (なし = 常に有効)
```

**最も重要なルール**。以下を「指示がなくても自動で」実行するよう Claude に指示する:

| トリガー | 自動アクション |
|---------|-------------|
| Go コード変更 | `cd backend && make test` 実行。失敗したら修正ループ。 |
| フロントエンド変更 | `npm run build` で型チェック。 |
| 新サービス/エンドポイント追加 | `backend/ARCHITECTURE.md` 更新 |
| 新コンポーネント/ページ追加 | `src/ARCHITECTURE.md` 更新 |
| DB スキーマ変更 | `backend/ARCHITECTURE.md` DB セクション更新 |

また、`main` ブランチでの直接編集を禁止するルールも含む。

### backend-go.md

```yaml
globs: backend/**/*.go
```

Go ファイル編集時にロードされる。Layered Architecture（Handler → Service → Repository）の遵守、bootstrap パターン、エラーハンドリング、依存パッケージ一覧を含む。Claude が Go コードを書く際に、既存のパターンから逸脱しないことを保証する。

### frontend-react.md

```yaml
globs: src/**/*.{ts,tsx}
```

フロントエンドファイル編集時にロードされる。コンポーネント階層、ページ命名規則（S/D/N/T/R/A/O プレフィックス）、Zustand パターン、タイムゾーン変換の方針を含む。

### database.md

```yaml
globs: backend/migrations/**
```

マイグレーションファイル作成時にロードされる。マルチテナンシー（`user_id` 必須）、UUID 主キー、タイムスタンプ自動更新トリガー、非正規化パターン、インデックス戦略を含む。DB 設計ミスの予防が目的。

### api-design.md

```yaml
globs: backend/**/handler/*.go, src/api/**
```

API 関連ファイル編集時にロードされる。レスポンスエンベロープ形式、エラーコードマッピング、URL パターン、タイムスタンプ規約を含む。バックエンドとフロントエンド間の一貫性を保証する。

### testing.md

```yaml
globs: **/*_test.go, **/*.test.{ts,tsx}
```

テストファイル編集時にロードされる。テーブルドリブンテスト、マルチテナンシーテストケース、モック戦略を含む。

### security.md

```yaml
globs: (なし = 常に有効)
```

全セッションで有効。JWT 認証フロー、データ分離ルール（`WHERE user_id = $1`）、禁止パターン（ハードコード秘密鍵、SQL 文字列結合、eval 等）を含む。

---

## Skills（6スキル）

Skills は `.claude/skills/<name>/SKILL.md` に配置するワークフロー定義。`/name` で手動実行する。全て `disable-model-invocation: true` に設定しており、Claude が勝手に実行することはない。

### 開発スキャフォルド系

#### /new-service `<service-name>`

新しい Go マイクロサービスをゼロからスキャフォルドする。

- 標準ディレクトリ構成（cmd, handler, service, repository）を全て生成
- bootstrap パターンでの初期化コード
- Dockerfile, Makefile 生成
- DB マイグレーションファイル（必要時）
- docker-compose.yml への追加
- **自動で** `make test` 実行 + `backend/ARCHITECTURE.md` 更新

**使いどころ**: 新しいドメインのマイクロサービスを追加する時。

#### /new-page `<PageName>` `<prefix>`

フロントエンドの新ページをフルセットで追加する。

- ページ命名規約に従ったコンポーネント作成
- `App.tsx` へのルート追加
- サイドバーナビゲーション追加
- Zustand ストア（必要時）
- API サービス（必要時）
- MSW ハンドラ（必要時）
- **自動で** `npm run build` + `src/ARCHITECTURE.md` 更新

**使いどころ**: 新しい画面を追加する時。

#### /new-endpoint `<service>` `<method>` `<path>` `<description>`

既存サービスに新しい API エンドポイントをフルスタックで追加する。

- Backend: Repository interface → 実装 → Service interface → 実装 → Handler → ルート登録
- Frontend: API service メソッド → Store action → MSW handler
- **自動で** `make test` + `npm run build`

**使いどころ**: 既存サービスに機能を追加する時。

### 品質保証系

#### /code-review

未コミットの変更を 4 段階でレビューする。Fork された別コンテキスト（subagent）で実行されるため、メインの会話コンテキストを消費しない。

| 段階 | 観点 |
|-----|------|
| Security (CRITICAL) | 秘密鍵、SQL injection、マルチテナンシー違反、XSS |
| Architecture (HIGH) | レイヤー違反、エラーハンドリング漏れ、レスポンス形式 |
| Code Quality (MEDIUM) | 長い関数、深いネスト、未使用変数 |
| Kensan-specific | タイムゾーン、命名規則、Zustand パターン |

**使いどころ**: コミット前のセルフレビュー。

#### /go-test

Go バックエンドテストの実行＋自動修正ループ。

- `cd backend && make test` を実行
- 失敗時: エラー解析 → ソースコード修正 → 再テスト（最大 3 回）
- コンパイルエラーも対応
- テストを削除/スキップして通すことは禁止

**使いどころ**: バックエンドの変更後に確実にテストを通したい時。

#### /build-check

フロントエンドとバックエンドの同時ビルド確認。

- `npm run build`（TypeScript チェック + Vite ビルド）
- `cd backend && make build`（全 Go サービスのコンパイル）
- 失敗時: 自動修正 → 再ビルド（最大 3 回）

**使いどころ**: 大きな変更の後にフルスタックの整合性を確認したい時。

---

## 動作確認方法

### 1. 新セッションを開始

既存セッションには旧コンテキストが残っているため、`claude` を新しく起動する。

### 2. Skills の確認

`/` を入力して、6 つのスキルが候補に表示されることを確認。
`/build-check` が最も安全なテスト（何も変更しない）。

### 3. Rules の確認

Go ファイルに軽い変更を加えた時に、自動でテストが走るか観察する。

### 4. コンテキスト使用量の確認

`/context` コマンドで、CLAUDE.md のトークン消費が以前より減っていることを確認。

---

## カスタマイズ

### Rules の追加

```markdown
<!-- .claude/rules/my-rule.md -->
---
description: What this rule does
globs: path/pattern/**/*.ext
---

Rule content here...
```

### Skills の追加

```
.claude/skills/my-skill/
└── SKILL.md
```

```yaml
---
name: my-skill
description: What this skill does
disable-model-invocation: true  # 手動実行のみ
---

Skill instructions...
```

### 参考資料

- [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) - Anthropic ハッカソン優勝者の設定集
- [Claude Code Skills 公式ドキュメント](https://code.claude.com/docs/en/skills)
- [Claude Code Best Practices - Anthropic](https://www.anthropic.com/engineering/claude-code-best-practices)
- [How I Use Every Claude Code Feature](https://blog.sshh.io/p/how-i-use-every-claude-code-feature)
