# Store インターフェースガイド

作成日: 2026-01-22

## 概要

Kensan フロントエンドでは Zustand を使用した状態管理を行っています。
Store は2つのパターンに分類されます。

---

## パターン1: Factory Store（単一リソース）

`createCrudStore` ファクトリで生成される標準的な CRUD Store。

### インターフェース

```typescript
interface CrudStore<T> {
  // State
  items: T[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchAll(): Promise<void>
  add(data: CreateInput): Promise<T>
  update(id: string, data: UpdateInput): Promise<T>
  remove(id: string): Promise<void>
  getById(id: string): T | undefined
  clearError(): void
}
```

### 対象 Store

| Store | リソース | 拡張メソッド |
|-------|----------|-------------|
| `useDiaryStore` | DiaryEntry | `getByDate()` |
| `useLearningRecordStore` | LearningRecord | なし |
| `useRoutineStore` | RoutineTask | `getByFrequency()` |

### 使用例

```typescript
// Store の利用
const { items, fetchAll, add, remove } = useDiaryStore()

// 初期化
useEffect(() => {
  fetchAll()
}, [fetchAll])

// 追加
const newEntry = await add({ date: '2026-01-22', content: '...' })

// 削除
await remove(id)
```

### 拡張方法

```typescript
const useDiaryStore = createCrudStore<DiaryEntry, CreateInput, UpdateInput, Filter, Extensions>(
  {
    api: diariesApi,
    getId: (d) => d.id,
  },
  (set, get, base) => ({
    // 拡張メソッド
    getByDate: (date) => get().items.find((e) => e.date === date),
  })
)
```

---

## パターン2: Composite Store（複合リソース）

関連する複数リソースを1つの Store で管理。手書き実装。

### 対象 Store

| Store | リソース | 理由 |
|-------|----------|------|
| `useTaskStore` | Project + Task | 親子関係、連動削除 |
| `useTimeBlockStore` | TimeBlock + TimeEntry | 同一ドメイン、タイムゾーン処理 |

### useTaskStore インターフェース

```typescript
interface TaskState {
  // State（2配列）
  projects: Project[]
  tasks: Task[]
  isLoading: boolean
  error: string | null

  // Project Actions
  fetchAll(): Promise<void>        // 両方取得
  addProject(data): Promise<void>
  updateProject(id, data): Promise<void>
  deleteProject(id): Promise<void> // 関連 Task も削除

  // Task Actions
  addTask(data): Promise<void>
  updateTask(id, data): Promise<void>
  deleteTask(id): Promise<void>    // 子 Task も削除
  toggleTaskComplete(id): Promise<void>

  // Getters
  getProjectById(id): Project | undefined
  getTaskById(id): Task | undefined
  getTasksByProject(projectId): Task[]
  getChildTasks(parentTaskId): Task[]
}
```

### useTimeBlockStore インターフェース

```typescript
interface TimeBlockState {
  // State（2配列）
  timeBlocks: TimeBlock[]
  timeEntries: TimeEntry[]
  isLoading: boolean
  error: string | null

  // Timezone-aware Fetch
  fetchTimeBlocksForLocalDate(localDate, timezone): Promise<void>
  fetchTimeEntriesForLocalDate(localDate, timezone): Promise<void>
  fetchTimeBlocksRange(startDate, endDate): Promise<void>
  fetchTimeEntriesRange(startDate, endDate): Promise<void>

  // TimeBlock CRUD
  addTimeBlock(block): Promise<void>
  updateTimeBlock(id, updates): Promise<void>
  deleteTimeBlock(id): Promise<void>

  // TimeEntry CRUD
  addTimeEntry(entry): Promise<void>
  updateTimeEntry(id, updates): Promise<void>
  deleteTimeEntry(id): Promise<void>

  // Getters
  getTimeBlocksByDate(date): TimeBlock[]
  getTimeEntriesByDate(date): TimeEntry[]
  getTodayTimeBlocks(): TimeBlock[]
  getTodayTimeEntries(): TimeEntry[]
}
```

### なぜ Composite Store を使うか

1. **連動操作**: Project 削除時に関連 Task も自動削除
2. **凝集度**: 関連データが1箇所にまとまる
3. **トランザクション的整合性**: 2リソース間の状態が常に同期

Factory Store に分割すると、連動ロジックを外部（ページやカスタムフック）に書く必要があり、複雑化する。

---

## 命名規則

### State プロパティ

| パターン | 命名 | 例 |
|----------|------|-----|
| Factory | `items` | `items: DiaryEntry[]` |
| Composite | リソース名（複数形） | `projects`, `tasks` |

### Actions

| 操作 | Factory | Composite |
|------|---------|-----------|
| 全件取得 | `fetchAll()` | `fetchAll()` |
| 追加 | `add(data)` | `addProject(data)`, `addTask(data)` |
| 更新 | `update(id, data)` | `updateProject(id, data)` |
| 削除 | `remove(id)` | `deleteProject(id)` |
| ID検索 | `getById(id)` | `getProjectById(id)` |

---

## 新規 Store 作成ガイドライン

### 判断フロー

```
リソースは単一か？
  ├─ Yes → createCrudStore を使用（パターン1）
  └─ No → 複数リソースの関係は？
           ├─ 連動操作が必要 → 手書き Composite Store（パターン2）
           └─ 独立している → 別々の Factory Store を作成
```

### チェックリスト

- [ ] 単一リソースなら `createCrudStore` を使う
- [ ] 複合リソースは連動操作の有無で判断
- [ ] 拡張メソッドは `createCrudStore` の第2引数で追加
- [ ] 命名規則に従う

---

## 関連ファイル

- `src/stores/createCrudStore.ts` - Factory 実装
- `src/stores/useTaskStore.ts` - Composite Store 例
- `src/stores/useTimeBlockStore.ts` - Composite Store 例
- `src/stores/useDiaryStore.ts` - Factory Store 例
