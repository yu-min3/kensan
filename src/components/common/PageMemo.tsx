/**
 * ページ固有の常時表示メモ
 * - 各ページに配置して自由にメモを書ける
 * - localStorageに自動保存
 */
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { StickyNote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'

interface PageMemoProps {
  /** ページ識別子（localStorageのキーに使用） */
  pageId: string
  /** タイトル */
  title?: string
  /** プレースホルダー */
  placeholder?: string
  /** 追加のクラス名 */
  className?: string
  /** 最小高さ */
  minHeight?: string
}

const STORAGE_PREFIX = 'kensan-page-memo-'

export function PageMemo({
  pageId,
  title = 'メモ',
  placeholder = '自由にメモを書けます...',
  className,
  minHeight = '120px',
}: PageMemoProps) {
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const userId = useAuthStore((state) => state.user?.id)

  // localStorageキー（ユーザーごとに分離）
  const storageKey = userId ? `${STORAGE_PREFIX}${userId}-${pageId}` : `${STORAGE_PREFIX}${pageId}`

  // 初期読み込み
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      setContent(saved)
    }
  }, [storageKey])

  // 自動保存（デバウンス）
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(storageKey, content)
      setIsSaving(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [content, storageKey])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    setIsSaving(true)
  }, [])

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="py-2 px-3 border-b flex-shrink-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-yellow-500" />
          {title}
          {isSaving && (
            <span className="text-[10px] text-muted-foreground ml-auto">保存中...</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 flex-1">
        <Textarea
          value={content}
          onChange={handleChange}
          placeholder={placeholder}
          className="resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-1 text-sm"
          style={{ minHeight }}
        />
      </CardContent>
    </Card>
  )
}
