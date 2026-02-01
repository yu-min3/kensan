# P2 リファクタリングタスク

作成日: 2026-01-21
更新日: 2026-01-21

## 概要

SOLID/DRY原則に基づくコードレビューで特定された改善タスク。
P0（bootstrap共通化）、P1（createApiService/createCrudStore/createMockCrudHandlers）は完了済み。

---

## フロントエンド

### FE-P0: 高優先度

#### FE-P0-1: timeblocks.ts を createApiService に統一
**現状**: 手書き実装、deprecated メソッドあり
**ファイル**: `src/api/services/timeblocks.ts`
**作業内容**:
- `timeblocksApi` を `createApiService` で生成
- `timeentriesApi` を `createApiService` で生成
- deprecated `listByDate()` を削除
- `useTimeBlockStore` の呼び出しを更新

#### FE-P0-2: memos.ts を createApiService に統一
**現状**: 手書き実装
**ファイル**: `src/api/services/memos.ts`
**作業内容**:
- `memosApi` を `createApiService` で生成
- archive, delete などの拡張メソッドは `extendApiService` で追加

#### FE-P0-3: timer.ts を createApiService に統一
**現状**: 手書き実装
**ファイル**: `src/api/services/timer.ts`
**作業内容**:
- Timer は CRUD ではないので、`createApiService` 不要かもしれない
- 現状維持 or シンプルな httpClient wrapper として整理

#### FE-P0-4: useTaskStore を createCrudStore に統一
**現状**: 手書き実装、projects と tasks が混在
**ファイル**: `src/stores/useTaskStore.ts`
**作業内容**:
- `useProjectStore` と `useTaskStore` に分割検討
- または createCrudStore で統一（2リソース対応）

#### FE-P0-5: useTimeBlockStore を createCrudStore に統一
**現状**: 手書き実装
**ファイル**: `src/stores/useTimeBlockStore.ts`
**作業内容**:
- TimeBlock と TimeEntry で2つの store に分割
- または createCrudStore ベースで拡張

---

### FE-P1: 中優先度

#### FE-P1-1: MSW timeblocks handlers を createMockCrudHandlers に統一
**現状**: 手書き実装
**ファイル**: `src/mocks/handlers/timeblocks.ts`
**作業内容**:
- TimeBlock handlers を factory で生成
- TimeEntry handlers を factory で生成
- カスタムフィルター（timestamp range）は override

#### FE-P1-2: 共有 Date/Time utility を作成
**現状**: 各ページで重複
**重複箇所**:
- `D01_DiaryList.tsx` L38: date format
- `L01_LearningRecordList.tsx` L91: date format
- `R01_RoutineTaskManagement.tsx` L82-89: formatMinutes()
**作業内容**:
- `src/lib/dateFormat.ts` 作成
- `formatDate()`, `formatMonth()`, `formatMinutes()` など共通化

#### FE-P1-3: T01_TaskManagement.tsx 分割
**現状**: 550行、複数責務
**ファイル**: `src/pages/T01_TaskManagement.tsx`
**作業内容**:
- `TaskDialog` コンポーネント抽出
- `ProjectDialog` コンポーネント抽出
- `TaskFilterPanel` コンポーネント抽出
- メインページは表示ロジックのみ

#### FE-P1-4: Dialog State をカスタムフック化
**現状**: T01, R01 で複数の useState
**作業内容**:
- `useDialogState<T>()` フック作成
- open/close/reset/data を一元管理

---

### FE-P2: 低優先度

#### FE-P2-1: Store インターフェース統一ドキュメント
**作業内容**:
- createCrudStore 使用の Store: `items`, `fetchAll`, `add`, `update`, `remove`
- 手書き Store の命名規則を文書化

#### FE-P2-2: 未使用コード削除
**対象**:
- useTaskStore の個別 `fetchProjects()`, `fetchTasks()` メソッド
- deprecated API メソッド

---

## バックエンド

### BE-P0: 高優先度

#### BE-P0-1: JSON デコード共有ヘルパー追加
**現状**: 全ハンドラーで同一パターン（30+箇所）
**ファイル**: `backend/shared/middleware/middleware.go`
**作業内容**:
```go
// DecodeJSONBody(w, r, v interface{}) bool
// 失敗時は自動でエラーレスポンス、false を返す
func DecodeJSONBody(w http.ResponseWriter, r *http.Request, v interface{}) bool {
    if err := json.NewDecoder(r.Body).Decode(v); err != nil {
        Error(w, r, http.StatusBadRequest, "INVALID_JSON", "Invalid JSON body")
        return false
    }
    return true
}
```
全ハンドラーを更新:
- task, diary, record, memo, timeblock, routine, ai, sync, user, analytics

#### BE-P0-2: URL パラメータ取得共有ヘルパー追加
**現状**: 全ハンドラーで null チェック繰り返し
**ファイル**: `backend/shared/middleware/middleware.go`
**作業内容**:
```go
// RequireURLParam(w, r, paramName string) (string, bool)
// 空の場合は自動でエラーレスポンス、false を返す
func RequireURLParam(w http.ResponseWriter, r *http.Request, paramName string) (string, bool) {
    value := chi.URLParam(r, paramName)
    if value == "" {
        Error(w, r, http.StatusBadRequest, "INVALID_REQUEST", paramName+" is required")
        return "", false
    }
    return value, true
}
```

#### BE-P0-3: 共有 errors パッケージの活用
**現状**: `shared/errors/errors.go` に定義済みだが未使用
**作業内容**:
- 各サービスの独自エラー定義を削除
- `shared/errors` のエラーを使用するよう更新
- 対象サービス: diary, record, memo, task, user, routine, timeblock

---

### BE-P1: 中優先度

#### BE-P1-1: ハンドラーエラー処理メソッドの統一
**現状**: diary, record, user のみ `handleError()` メソッドあり
**作業内容**:
- 全ハンドラーに `handleError()` メソッド追加
- または `shared/middleware` にエラーマッピング機能追加

#### BE-P1-2: バリデーション処理の共有化
**現状**: 各ハンドラーで手動バリデーション
**作業内容**:
```go
// middleware.ValidateRequired(w, r, fields map[string]string) bool
// fields: フィールド名 -> 値
// 空の値があればエラーレスポンスを返す
```

#### BE-P1-3: sync-service の言語統一（英語化）
**現状**: 日本語と英語が混在
**ファイル**: `backend/services/sync/internal/handler/handler.go`
**対象行**: L44, L50, L60, L67, L85, L115, L123, L130, L141, L143, L145
**作業内容**:
- すべてのエラーメッセージを英語に統一

---

### BE-P2: 低優先度

#### BE-P2-1: 重複した正規表現の削除
**現状**: `dateRegex` が複数箇所で定義
**対象**:
- `diary/service.go` L22
- `timeblock/service.go`
**作業内容**:
- `shared/errors.go` の定義を使用

#### BE-P2-2: リポジトリクエリビルダー検討
**現状**: timeblock repository が883行、手動クエリ構築
**ファイル**: `backend/services/timeblock/internal/repository/repository.go`
**作業内容**:
- 複雑なクエリ構築ロジックの簡潔化
- （優先度低：動作しているため）

---

## 完了済みタスク

### P0（完了）
- [x] backend bootstrap パッケージ作成
- [x] backend 全サービスの main.go 簡略化
- [x] backend constructor 命名統一 (NewHandler, NewService)

### P1（完了）
- [x] frontend createApiService ファクトリ作成
- [x] frontend createCrudStore ファクトリ作成
- [x] frontend createMockCrudHandlers ファクトリ作成
- [x] frontend diaries, records, routines, tasks を factory に移行
- [x] frontend useDiaryStore, useLearningRecordStore, useRoutineStore を factory に移行
- [x] frontend diaries, records, routines, tasks MSW handlers を factory に移行

### P1（スキップ）
- [ ] ~~timeblock repository ISP違反~~ → 凝集度が高いため現状維持

---

## 優先順位ガイド

| 優先度 | 意味 | 作業タイミング |
|--------|------|---------------|
| P0 | 即座に対応すべき | 次の作業セッション |
| P1 | 近いうちに対応 | 1-2週間以内 |
| P2 | 余裕があれば対応 | 月次レビュー時 |

---

## 次のアクション

1. **FE-P0-1~5**: API services と Stores の統一
2. **BE-P0-1~3**: middleware ヘルパーと errors 統一
3. その後 P1 タスクへ
