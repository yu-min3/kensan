# Kensan コードレビューレポート

**レビュー日**: 2026-01-21
**レビュー対象**: フロントエンド (React/TypeScript) + バックエンド (Go マイクロサービス)
**観点**: SOLID原則、DRY原則、ドメインモデルの一貫性

---

## 1. エグゼクティブサマリー

Kensanアプリケーションは、全体的に良く設計されたアーキテクチャを持っています。フロントエンドはZustandによる状態管理、API層の分離、型安全性が確保されており、バックエンドはHandler → Service → Repositoryの明確なレイヤー分離とインターフェースによる依存性逆転が実現されています。

しかし、いくつかの改善点が見つかりました：

| 優先度 | カテゴリ | 問題 |
|--------|----------|------|
| 高 | DRY | GoalTag型が3箇所で重複定義（バックエンド） |
| 高 | DRY | Zustandストアの非同期処理パターンが重複（フロントエンド） |
| 中 | SRP | M01_Morning.tsxが500行超で複数責務を持つ（フロントエンド） |
| 中 | DRY | Repository層の動的SQLクエリビルダーが重複（バックエンド） |
| 低 | 一貫性 | 時刻フォーマットの不整合（HH:mm vs HH:mm:ss） |

---

## 2. フロントエンドレビュー

### 2.1 良い点

1. **API層の分離** (`src/api/`)
   - HTTPクライアントがシングルトンで認証トークンを一元管理
   - サービスごとにAPI関数を分離（tasks.ts, timeblocks.ts等）
   - レスポンス型とフロントエンド型を明確に分離し、変換関数で橋渡し

2. **型安全性** (`src/types/index.ts`)
   - 全ドメインモデルがTypeScriptで定義
   - GoalTagがUnion型で制約

3. **状態管理** (`src/stores/`)
   - Zustandによるシンプルな状態管理
   - 永続化（persist middleware）の適切な使用

### 2.2 DRY原則違反

#### 問題1: ストアの非同期処理パターン重複

`useTaskStore.ts`, `useTimeBlockStore.ts`, `useRoutineStore.ts` で同じパターンが繰り返されています：

```typescript
// このパターンが全ストアで重複
fetchXxx: async () => {
  set({ isLoading: true, error: null })
  try {
    const data = await xxxApi.list()
    set({ xxx: data, isLoading: false })
  } catch (error) {
    set({ error: (error as Error).message, isLoading: false })
  }
}
```

**改善案**: カスタムフックまたはミドルウェアで非同期処理を抽象化

```typescript
// 案1: ヘルパー関数
const createAsyncAction = <T>(
  set: SetState,
  apiCall: () => Promise<T>,
  onSuccess: (data: T) => Partial<State>
) => async () => {
  set({ isLoading: true, error: null })
  try {
    const data = await apiCall()
    set({ ...onSuccess(data), isLoading: false })
  } catch (error) {
    set({ error: (error as Error).message, isLoading: false })
  }
}
```

#### 問題2: 時間フォーマット関数の重複

`M01_Morning.tsx:180-184` で `formatMinutes` が定義されていますが、これは他のページでも必要になる可能性が高いです。

```typescript
// M01_Morning.tsx内
const formatMinutes = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}
```

**改善案**: `src/lib/utils.ts` または `src/lib/time.ts` に移動

### 2.3 SRP（単一責任原則）違反

#### 問題: M01_Morning.tsx の責務過多

**ファイル**: `src/pages/M01_Morning.tsx` (561行)

このコンポーネントは以下の責務を持っています：
1. タイムブロック一覧表示
2. タイムブロック追加/編集ダイアログ
3. タイマー機能（開始/停止）
4. タイマー選択ダイアログ
5. 定期タスク表示
6. 週次進捗表示

**改善案**: コンポーネント分割

```
src/pages/M01_Morning.tsx (メイン)
├── src/components/morning/TimeBlockSection.tsx
├── src/components/morning/TimeBlockDialog.tsx
├── src/components/morning/TimerSection.tsx
├── src/components/morning/TimerDialog.tsx
├── src/components/morning/RoutineTaskList.tsx
└── src/components/morning/WeeklyProgressCard.tsx
```

または、タイマー機能をカスタムフック化：

```typescript
// src/hooks/useTimer.ts
export function useTimer() {
  const [isRunning, setIsRunning] = useState(false)
  const [taskId, setTaskId] = useState<string>()
  const [startTime, setStartTime] = useState<Date | null>(null)

  const start = (taskId: string, taskName: string) => { ... }
  const stop = () => { ... }

  return { isRunning, taskId, startTime, start, stop }
}
```

### 2.4 その他の問題

#### useAuthStoreのbaseURL直接参照

`src/stores/useAuthStore.ts:40-41, 64-65` で環境変数を直接参照しています：

```typescript
const response = await httpClient.post<{ token: string; user: User }>(
  import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:8081',
  '/auth/login',
  { email, password }
)
```

**改善案**: `API_CONFIG.baseUrls.user` を使用（他のAPIサービスと統一）

---

## 3. バックエンドレビュー

### 3.1 良い点

1. **レイヤー分離**
   - Handler → Service → Repository の明確な責務分離
   - 各層がインターフェースで抽象化されている

2. **依存性逆転（DIP）**
   - Repository層はインターフェース（`interface.go`）を定義
   - `var _ Repository = (*PostgresRepository)(nil)` でコンパイル時チェック

3. **エラーハンドリング**
   - Service層で意味のあるエラー型を定義（`ErrProjectNotFound`等）
   - Handler層でHTTPステータスコードに適切に変換

4. **マルチテナント設計**
   - 全クエリが `user_id` でフィルタリング
   - JWTからのユーザーID取得が一元化

### 3.2 DRY原則違反

#### 問題1: GoalTag型の重複定義（優先度: 高）

以下の3ファイルで全く同じGoalTag型が定義されています：

- `services/task/internal/model.go:7-24`
- `services/timeblock/internal/model.go:7-24`
- `services/analytics/internal/model.go:3-20`

```go
// 3箇所で同一のコード
type GoalTag string

const (
	GoalTagGK     GoalTag = "GK"
	GoalTagOSS    GoalTag = "OSS"
	GoalTagOutput GoalTag = "Output"
	GoalTagOther  GoalTag = "Other"
)

func (g GoalTag) IsValid() bool { ... }
```

**改善案**: 共有パッケージに移動

```
backend/shared/domain/goaltag.go
```

```go
package domain

type GoalTag string

const (
	GoalTagGK     GoalTag = "GK"
	GoalTagOSS    GoalTag = "OSS"
	GoalTagOutput GoalTag = "Output"
	GoalTagOther  GoalTag = "Other"
)

func (g GoalTag) IsValid() bool { ... }
func AllGoalTags() []GoalTag { ... }
func (g GoalTag) WeeklyTargetMinutes() int { ... } // analyticsから移動
```

#### 問題2: 動的SQLクエリビルダーの重複（優先度: 中）

全てのRepository実装で同じパターンのUPDATE文構築ロジックが重複しています：

```go
// task/repository.go, timeblock/repository.go, diary/repository.go で同一パターン
var setClauses []string
var args []interface{}
argCount := 0

if input.Name != nil {
    argCount++
    setClauses = append(setClauses, fmt.Sprintf("name = $%d", argCount))
    args = append(args, *input.Name)
}
// ... 繰り返し

query := fmt.Sprintf(`
    UPDATE xxx
    SET %s
    WHERE id = $%d AND user_id = $%d
`, strings.Join(setClauses, ", "), argCount-1, argCount)
```

**改善案**: SQLビルダーヘルパーを共有パッケージに作成

```go
// backend/shared/database/builder.go
package database

type UpdateBuilder struct {
    clauses []string
    args    []interface{}
}

func NewUpdateBuilder() *UpdateBuilder {
    return &UpdateBuilder{}
}

func (b *UpdateBuilder) Set(column string, value interface{}) *UpdateBuilder {
    if value != nil {
        b.args = append(b.args, value)
        b.clauses = append(b.clauses, fmt.Sprintf("%s = $%d", column, len(b.args)))
    }
    return b
}

func (b *UpdateBuilder) SetIfNotNil(column string, value interface{}) *UpdateBuilder {
    // リフレクションでnilチェック
    ...
}

func (b *UpdateBuilder) Build(table, idCol, userIDCol string) (string, []interface{}) {
    // WHERE句を含むクエリを生成
    ...
}
```

#### 問題3: GoalTag文字列変換コードの重複

各Repositoryで同じ変換パターンが繰り返されています：

```go
// 読み取り時（10箇所以上で重複）
var goalTag *string
// ... Scan ...
if goalTag != nil {
    gt := task.GoalTag(*goalTag)
    p.GoalTag = &gt
}

// 書き込み時
var goalTag *string
if input.GoalTag != nil {
    s := string(*input.GoalTag)
    goalTag = &s
}
```

**改善案**: ヘルパー関数を作成

```go
// backend/shared/database/goaltag.go
func ScanGoalTag(src *string) *domain.GoalTag {
    if src == nil {
        return nil
    }
    gt := domain.GoalTag(*src)
    return &gt
}

func GoalTagToString(gt *domain.GoalTag) *string {
    if gt == nil {
        return nil
    }
    s := string(*gt)
    return &s
}
```

### 3.3 SRP違反

#### 問題: Repository層の複数エンティティ管理

- `task/repository.go` (613行): Project + Task
- `timeblock/repository.go` (681行): TimeBlock + TimeEntry

これらは関連が強いため許容範囲内ですが、ファイルが大きくなっています。

**改善案（オプション）**: 同一パッケージ内でファイル分割

```
services/task/internal/repository/
├── interface.go
├── project_repository.go
└── task_repository.go
```

---

## 4. ドメインモデルの一貫性

### 4.1 時刻フォーマットの不整合

フロントエンドとバックエンド間で時刻フォーマットが一致していません：

| 場所 | 期待値 | 実際 |
|------|--------|------|
| フロントエンド types/index.ts | HH:mm | - |
| バックエンド model.go コメント | HH:mm | - |
| PostgreSQL time型 | HH:mm:ss | - |
| API レスポンス | 混在 | HH:mm または HH:mm:ss |

**影響箇所**: `M01_Morning.tsx:86` でスライス処理を行っています：

```typescript
// バックエンドがHH:mm:ss形式で返す場合の対応
setBlockStartTime(block.startTime.slice(0, 5))
setBlockEndTime(block.endTime.slice(0, 5))
```

**改善案**:
1. PostgreSQLで `time::text` を `to_char(start_time, 'HH24:MI')` に変更
2. または、バックエンドでレスポンス生成時にフォーマット統一

### 4.2 フロントエンド・バックエンド型の対応

全体的によく対応していますが、APIレスポンス型（`*Response`）とフロントエンド型の変換関数（`transformXxx`）が各サービスファイルで定義されており、一貫性が保たれています。これは良いパターンです。

---

## 5. 改善提案まとめ（優先度順）

### 優先度: 高

| # | 問題 | 影響範囲 | 改善案 |
|---|------|----------|--------|
| 1 | GoalTag型の3重定義（バックエンド） | 3サービス | `shared/domain/` に統合 |
| 2 | ストア非同期処理パターン重複（フロントエンド） | 7ストア | ヘルパー関数またはミドルウェア作成 |

### 優先度: 中

| # | 問題 | 影響範囲 | 改善案 |
|---|------|----------|--------|
| 3 | M01_Morning.tsx の肥大化 | 1ファイル | コンポーネント分割 |
| 4 | SQLクエリビルダーの重複 | 4+ リポジトリ | 共有ヘルパー作成 |
| 5 | useAuthStoreのbaseURL直接参照 | 1ファイル | API_CONFIG使用に統一 |

### 優先度: 低

| # | 問題 | 影響範囲 | 改善案 |
|---|------|----------|--------|
| 6 | 時刻フォーマット不整合 | API境界 | PostgreSQL/バックエンドで統一 |
| 7 | formatMinutes関数の重複可能性 | ページ間 | 共通ユーティリティに移動 |
| 8 | GoalTag文字列変換コード重複 | リポジトリ | ヘルパー関数作成 |

---

## 6. 結論

Kensanアプリケーションは、マイクロサービスアーキテクチャとしてよく設計されており、特に以下の点が優れています：

- **バックエンド**: レイヤー分離、インターフェース抽象化、マルチテナント対応
- **フロントエンド**: 型安全性、API層分離、状態管理

主な改善点は **GoalTag型の統合** と **フロントエンドのパターン重複解消** です。これらは機能追加ではなくリファクタリングですが、コードの保守性を大幅に向上させます。

優先度「高」の2項目は、今後の機能追加時にバグの温床になりやすいため、早めの対応を推奨します。
