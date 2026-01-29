# 目標・マイルストーンのステータス統一設計

**Status**: 実装完了

## 概要

目標（Goal）とマイルストーン（Milestone）のステータス管理を統一し、削除ではなく完了できるようにする。

## 現状

| 項目 | 目標 (Goal) | マイルストーン (Milestone) |
|------|-------------|--------------------------|
| 状態フィールド | `is_archived` (boolean) | `status` ('active', 'completed', 'archived') |
| 完了の表現 | なし | あり |
| UIの完了ボタン | なし | あり（ホバー時表示） |

## 変更内容

### 1. データベース

**マイグレーション**: `backend/migrations/026_goal_status.sql`

```sql
-- 1. status カラムを追加
ALTER TABLE goals ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE goals ADD CONSTRAINT goals_status_check CHECK (status IN ('active', 'completed', 'archived'));

-- 2. 既存データを移行
UPDATE goals SET status = 'archived' WHERE is_archived = true;

-- 3. is_archived カラムを削除
ALTER TABLE goals DROP COLUMN is_archived;
```

### 2. バックエンド (Go)

**model.go**:
- `Goal` 構造体: `IsArchived bool` → `Status GoalStatus`
- `GoalStatus` 型を追加（MilestoneStatus と同様）
- `UpdateGoalInput`: `IsArchived *bool` → `Status *GoalStatus`
- `GoalFilter`: `IsArchived *bool` → `Status *GoalStatus`

**repository.go**:
- `ListGoals`: `is_archived` フィルター → `status` フィルター
- `CreateGoal`: デフォルト `status = 'active'`
- `UpdateGoal`: `status` フィールド対応

**handler.go**:
- クエリパラメータ: `archived` → `status`

### 3. フロントエンド (TypeScript)

**types/index.ts**:
```typescript
export type GoalStatus = 'active' | 'completed' | 'archived'

export interface Goal {
  id: string
  name: string
  description?: string
  color: string
  status: GoalStatus  // isArchived を置換
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}
```

**api/services/tasks.ts**:
- `UpdateGoalInput`: `isArchived` → `status`
- `GoalFilter`: `archived` → `status`

**stores/useGoalStore.ts**:
- フィルタリングロジック更新

### 4. UI変更

**T01_TaskManagement.tsx**:

1. **目標に完了ボタン追加**（マイルストーンと同様）
   - ホバー時に編集ボタンの隣に `CheckCircle2` アイコン表示
   - クリックで `status: 'completed'` に更新

2. **完了済み目標の表示**
   - `CheckCircle2` アイコン（緑）
   - 名前に取り消し線
   - `opacity-60` で薄く表示

3. **フィルタリング**
   - 既存の「完了済みを隠す」チェックボックスを活用
   - `hideCompleted` が true の場合、`status === 'completed'` の目標も非表示
   - `status === 'archived'` は常に非表示

**GoalDialog.tsx**:
- 編集時にステータスセレクター表示（マイルストーンダイアログと同様）

## 影響範囲

### ファイル変更一覧

**バックエンド**:
- `backend/migrations/026_goal_status.sql` (新規)
- `backend/services/task/internal/model.go`
- `backend/services/task/internal/repository/repository.go`
- `backend/services/task/internal/handler/handler.go`

**フロントエンド**:
- `src/types/index.ts`
- `src/api/services/tasks.ts`
- `src/stores/useTaskStore.ts`
- `src/pages/T01_TaskManagement.tsx`
- `src/components/task/GoalDialog.tsx`

## 互換性

- API: `archived` パラメータ → `status` パラメータに変更（破壊的変更）
- フロントエンド: `isArchived` → `status` に変更（破壊的変更）
- 既存データ: マイグレーションで自動移行
