import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useDiaryStore } from '@/stores/useDiaryStore'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { BookMarked, Plus, Search, Calendar } from 'lucide-react'

export function D01DiaryList() {
  const { entries } = useDiaryStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [tagFilter, setTagFilter] = useState<string>('')

  // すべてのタグを抽出
  const allTags = Array.from(
    new Set(entries.flatMap((e) => e.tags))
  ).sort()

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      searchQuery === '' ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTag =
      tagFilter === '' || entry.tags.includes(tagFilter)

    return matchesSearch && matchesTag
  })

  // 日付でグループ化
  const groupedByMonth = filteredEntries.reduce(
    (acc, entry) => {
      const month = format(new Date(entry.date), 'yyyy年M月', { locale: ja })
      if (!acc[month]) acc[month] = []
      acc[month].push(entry)
      return acc
    },
    {} as Record<string, typeof entries>
  )

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookMarked className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold">日記</h1>
            <p className="text-sm text-muted-foreground">Phase 2 機能</p>
          </div>
        </div>
        <Link to="/diary/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      {/* フィルター */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={tagFilter === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTagFilter('')}
          >
            すべて
          </Button>
          {allTags.map((tag) => (
            <Button
              key={tag}
              variant={tagFilter === tag ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTagFilter(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      </div>

      {/* 日記一覧 */}
      {Object.entries(groupedByMonth).map(([month, monthEntries]) => (
        <div key={month}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {month}
          </h2>
          <div className="space-y-3">
            {monthEntries.map((entry) => (
              <Link key={entry.id} to={`/diary/${entry.id}`}>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="text-center min-w-[50px]">
                        <div className="text-2xl font-bold">
                          {format(new Date(entry.date), 'd')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(entry.date), 'E', { locale: ja })}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium">{entry.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {entry.content.slice(0, 150)}...
                        </p>
                        <div className="flex gap-2 mt-2">
                          {entry.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {filteredEntries.length === 0 && (
        <div className="text-center py-12">
          <BookMarked className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">
            {searchQuery || tagFilter
              ? '該当する日記が見つかりません'
              : '日記がまだありません'}
          </p>
          <Link to="/diary/new">
            <Button variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              新規作成
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
