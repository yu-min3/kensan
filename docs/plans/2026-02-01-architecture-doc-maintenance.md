# ドキュメント整備タスク

## 目的

Kensan プロジェクトの backend マイクロサービスにおいて、
コードを読みやすくするための ARCHITECTURE.md を未整備のサービスに追加する。

## 対象

以下の3サービスに ARCHITECTURE.md が存在しない:

1. `backend/services/diary/` - 日記サービス（※note-serviceに統合済みの可能性あり。コードを確認し、実際に稼働するサービスなら作成、廃止予定なら DEPRECATED である旨を1ファイルで記載）
2. `backend/services/record/` - 学習記録サービス（※同上）
3. `backend/services/routine/` - ルーティンタスクサービス

## フォーマット仕様

既存の ARCHITECTURE.md と完全に同じ構成・フォーマットに従うこと。
テンプレートとして `backend/services/timeblock/ARCHITECTURE.md` を参照。

### 必須セクション（この順序で記載）

1. **見出し**: `# {service-name}` + 1行の日本語説明
2. **目次**: 番号付きリンク
3. **概要**: ポート番号・ベースパス・責務のテーブル + 主な機能リスト
4. **エンティティ**: Mermaid ER図 + Go struct のコード定義
5. **API仕様**: エンドポイント一覧テーブル + クエリパラメータ + リクエスト/レスポンスJSON例
6. **ビジネスロジック**: 主要フローの Mermaid sequence diagram + バリデーションルール
7. **リポジトリ**: Go interface 定義 + 主要SQLクエリ
8. **エラー定義**: Go の error 変数一覧

### 記載ルール

- 言語: 日本語（Go コードやJSON例はそのまま）
- 情報源: **実際のコードのみ**を参照すること。推測で書かない
- ER図の情報は `backend/migrations/` のSQLマイグレーションと `internal/model.go` から取得
- API エンドポイントは `internal/handler/handler.go` のルーティング定義から取得
- リポジトリインターフェースは `internal/repository/interface.go` から取得
- SQL クエリは `internal/repository/repository.go` から取得
- ビジネスロジックは `internal/service/service.go` から取得
- ポート番号は `cmd/main.go` または `docker-compose.yml` から確認

## 作業手順

1. まず3サービスそれぞれの `cmd/main.go`, `internal/model.go`, `internal/handler/handler.go`, `internal/service/service.go`, `internal/repository/` を全て読む
2. `diary` と `record` については、`note-service` に統合されて廃止予定かどうかをコードの内容から判断する
3. 各サービスの ARCHITECTURE.md を作成（廃止サービスの場合は短い DEPRECATED ドキュメントのみ）
4. 作成後、既存の `backend/ARCHITECTURE.md` のサービス一覧テーブルに diary/record/routine の情報が正しく反映されているか確認し、必要なら更新

## 品質チェック

- [ ] 全セクションが既存ドキュメントと同じ構造か
- [ ] ER図が実際のDBスキーマと一致しているか
- [ ] APIエンドポイントがhandlerのルーティングと一致しているか
- [ ] Go struct がmodel.goと一致しているか
- [ ] エラー変数がservice.goと一致しているか
