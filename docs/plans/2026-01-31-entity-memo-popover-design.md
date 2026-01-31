# Entity Memo Popover Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** タスク名の横にメモアイコンを表示し、クリックでポップオーバーを開いてEntity Memoの閲覧・追加・編集・ピン留め・削除を全て完結できるようにする。

**Architecture:** 新しい`EntityMemoPopover`コンポーネントを作成し、shadcn/uiのPopoverを使用。既存の`useEntityMemos`フックをそのまま再利用。デイリーページのTaskListWidgetとタスク管理ページ(T01)のタスク行にアイコンを配置。

**Tech Stack:** React, shadcn/ui Popover, Zustand (既存), lucide-react icons, date-fns

---

### Task 1: EntityMemoPopover コンポーネント作成

**Files:**
- Create: `src/components/common/EntityMemoPopover.tsx`

**Step 1: コンポーネントファイルを作成**

`EntityMemoPopover`は以下の構造:
- Props: `entityType`, `entityId`, `className?`
- トリガー: メモありの場合 `MessageSquareText`(amber-500) + 件数バッジ、ピン留めメモがある場合は小さなピンドット追加。メモなしの場合はアイコン非表示、ホバー時に`MessageSquarePlus`(muted)が現れる
- Popoverの中身:
  - ピン留めメモ(amber背景、上部に表示)
  - 通常メモ一覧(ScrollArea、max-height 250px)
  - 各メモ: 内容 + タイムスタンプ + ホバーアクション(編集/ピン/削除)
  - 入力欄(下部固定、Textarea + Ctrl+Enter)
- 幅320px、最大高さ400px
- `useEntityMemos`フックを使用
- 既存の`ConfirmPopover`を削除確認に使用
- インライン編集: 編集アイコンクリック → Textarea表示 → Ctrl+Enter保存 / Escape キャンセル
- `handleSubmitOrCancel`を再利用

```tsx
import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ConfirmPopover } from './ConfirmPopover'
import { useEntityMemos } from '@/hooks/useEntityMemos'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  MessageSquareText,
  MessageSquarePlus,
  Pin,
  PinOff,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  Send,
} from 'lucide-react'
import type { EntityType, EntityMemo } from '@/types'
import { handleSubmitOrCancel } from '@/lib/keyboardHandlers'

interface EntityMemoPopoverProps {
  entityType: EntityType
  entityId: string
  className?: string
}

export function EntityMemoPopover({ entityType, entityId, className }: EntityMemoPopoverProps) {
  const [open, setOpen] = useState(false)
  const { memos, isLoading, addMemo, updateMemo, deleteMemo, togglePin } = useEntityMemos({
    entityType,
    entityId,
    enabled: open, // ポップオーバーが開いたときだけfetch
  })

  const [newContent, setNewContent] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')

  const pinnedMemos = memos.filter(m => m.pinned)
  const normalMemos = memos.filter(m => !m.pinned)
  const hasPinned = pinnedMemos.length > 0

  const handleAdd = async () => {
    if (!newContent.trim()) return
    setIsAdding(true)
    try {
      await addMemo(newContent.trim())
      setNewContent('')
    } finally {
      setIsAdding(false)
    }
  }

  const handleStartEdit = (memo: EntityMemo) => {
    setEditingMemoId(memo.id)
    setEditingContent(memo.content)
  }

  const handleSaveEdit = async () => {
    if (!editingMemoId || !editingContent.trim()) return
    await updateMemo(editingMemoId, { content: editingContent.trim() })
    setEditingMemoId(null)
    setEditingContent('')
  }

  const handleCancelEdit = () => {
    setEditingMemoId(null)
    setEditingContent('')
  }

  // メモアイテムのレンダリング (ピン留め・通常で共有)
  const renderMemoItem = (memo: EntityMemo) => (
    <div
      key={memo.id}
      className={cn(
        'group/memo relative p-2 text-sm',
        memo.pinned && 'bg-amber-50 dark:bg-amber-950/20'
      )}
    >
      {editingMemoId === memo.id ? (
        <div className="space-y-1.5">
          <Textarea
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            onKeyDown={handleSubmitOrCancel(handleSaveEdit, handleCancelEdit)}
            className="min-h-[50px] text-sm resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleCancelEdit}>
              <X className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleSaveEdit}>
              <Check className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="whitespace-pre-wrap text-sm pr-14 break-words">{memo.content}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {formatDistanceToNow(memo.createdAt, { addSuffix: true, locale: ja })}
          </p>
          <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover/memo:opacity-100 transition-opacity">
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => togglePin(memo.id)} title={memo.pinned ? 'ピン解除' : 'ピン留め'}>
              {memo.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => handleStartEdit(memo)} title="編集">
              <Edit2 className="h-3 w-3" />
            </Button>
            <ConfirmPopover message="このメモを削除しますか？" confirmLabel="削除" onConfirm={() => deleteMemo(memo.id)} variant="destructive">
              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive hover:text-destructive" title="削除">
                <Trash2 className="h-3 w-3" />
              </Button>
            </ConfirmPopover>
          </div>
        </>
      )}
    </div>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-0.5 rounded p-0.5 transition-opacity',
            memos.length > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {memos.length > 0 ? (
            <>
              <MessageSquareText className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[10px] text-amber-600 font-medium">{memos.length}</span>
              {hasPinned && <span className="w-1 h-1 rounded-full bg-amber-500 -mt-2" />}
            </>
          ) : (
            <MessageSquarePlus className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="bottom">
        {/* Header */}
        <div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <MessageSquareText className="h-3.5 w-3.5" />
          メモ ({memos.length})
        </div>

        {/* Memo list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : memos.length > 0 ? (
          <ScrollArea className="max-h-[250px]">
            {/* ピン留めメモ */}
            {pinnedMemos.length > 0 && (
              <div className="border-b">
                {pinnedMemos.map(renderMemoItem)}
              </div>
            )}
            {/* 通常メモ */}
            <div className="divide-y">
              {normalMemos.map(renderMemoItem)}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">メモはありません</p>
        )}

        {/* 入力欄 */}
        <div className="border-t p-2">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={handleSubmitOrCancel(handleAdd, () => setNewContent(''))}
            placeholder="メモを追加... (Ctrl+Enter)"
            className="min-h-[50px] text-sm resize-none"
          />
          <div className="flex justify-end mt-1.5">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newContent.trim() || isAdding}
              className="h-7 gap-1 text-xs"
            >
              {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              追加
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

**Step 2: ビルドが通ることを確認**

Run: `cd /home/yu-min/Repositories/kensan-mockup && npm run build`
Expected: コンポーネントが未使用なので警告は出るかもしれないが、型エラーなくビルド成功

**Step 3: コミット**

```bash
git add src/components/common/EntityMemoPopover.tsx
git commit -m "feat: add EntityMemoPopover component"
```

---

### Task 2: TaskListWidget にメモアイコンを追加（デイリーページ）

**Files:**
- Modify: `src/components/daily/TaskListWidget.tsx`

**Step 1: DraggableTaskCardにEntityMemoPopoverを追加**

`TaskListWidget.tsx`の`DraggableTaskCard`コンポーネント内、タスク名(`{task.name}`)の直後にEntityMemoPopoverを配置する。

変更箇所 (line 188付近):
```tsx
// Before:
<span className="text-sm font-medium flex-1 leading-tight">{task.name}</span>

// After:
<span className="text-sm font-medium flex-1 leading-tight">{task.name}</span>
<EntityMemoPopover entityType="task" entityId={task.id} />
```

importに追加:
```tsx
import { EntityMemoPopover } from '@/components/common/EntityMemoPopover'
```

注意: DraggableTaskCardにはdrag listeners がある。EntityMemoPopoverのトリガーで`e.stopPropagation()`しているのでドラッグと競合しない。

**Step 2: ビルド確認**

Run: `cd /home/yu-min/Repositories/kensan-mockup && npm run build`
Expected: ビルド成功

**Step 3: コミット**

```bash
git add src/components/daily/TaskListWidget.tsx
git commit -m "feat: add memo popover to TaskListWidget on daily page"
```

---

### Task 3: T01_TaskManagement にメモアイコンを追加

**Files:**
- Modify: `src/pages/T01_TaskManagement.tsx`

**Step 1: SortableTaskItemのタスク名横にEntityMemoPopoverを追加**

変更箇所1 - 親タスク (line 291付近):
```tsx
// Before:
        >
          {task.name}
        </span>

// After:
        >
          {task.name}
        </span>
        <EntityMemoPopover entityType="task" entityId={task.id} />
```

変更箇所2 - 子タスク (line 1251付近):
```tsx
// Before:
                                  >
                                    {childTask.name}
                                  </span>

// After:
                                  >
                                    {childTask.name}
                                  </span>
                                  <EntityMemoPopover entityType="task" entityId={childTask.id} />
```

importに追加:
```tsx
import { EntityMemoPopover } from '@/components/common/EntityMemoPopover'
```

**Step 2: ビルド確認**

Run: `cd /home/yu-min/Repositories/kensan-mockup && npm run build`
Expected: ビルド成功

**Step 3: コミット**

```bash
git add src/pages/T01_TaskManagement.tsx
git commit -m "feat: add memo popover to task management page"
```

---

### Task 4: 動作確認 & 微調整

**Step 1: dev serverを起動して動作確認**

Run: `cd /home/yu-min/Repositories/kensan-mockup && npm run dev`

確認項目:
- [ ] デイリーページでタスクカードにメモアイコンが表示される
- [ ] メモなしタスク: ホバー時にうっすらアイコンが現れる
- [ ] メモありタスク: amber色アイコン+件数が常時表示
- [ ] クリックでポップオーバーが開く
- [ ] メモ追加(Ctrl+Enter)が動作する
- [ ] インライン編集が動作する
- [ ] ピン留めトグルが動作する
- [ ] 削除(確認ポップオーバー付き)が動作する
- [ ] ドラッグ&ドロップと干渉しない
- [ ] T01タスク管理でも同様に動作する

**Step 2: 問題があれば修正してコミット**
