import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GoalBadge } from '@/components/common/GoalBadge'
import { Badge } from '@/components/ui/badge'
import { useNoteStore } from '@/stores/useNoteStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { formatDateIso } from '@/lib/dateFormat'
import type { NoteType } from '@/types'
import {
  FileText,
  Shapes,
  Plus,
  Search,
  StickyNote,
  BookOpen,
  CalendarDays,
  Archive,
} from 'lucide-react'

const NOTE_TYPE_ICONS: Record<NoteType, React.ComponentType<{ className?: string }>> = {
  diary: CalendarDays,
  learning: BookOpen,
}

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  diary: '日記',
  learning: '学習記録',
}

export function N01NoteList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { items, isLoading, fetchNotes, search, searchResults, clearSearchResults } = useNoteStore()
  const { goals, tags } = useTaskStore()

  // Get initial filter from URL
  const initialType = searchParams.get('type') as NoteType | null
  const initialGoalId = searchParams.get('goalId')
  const initialArchived = searchParams.get('archived') === 'true'

  const [typeFilter, setTypeFilter] = useState<NoteType | 'all'>(initialType || 'all')
  const [goalFilter, setGoalFilter] = useState<string>(initialGoalId || 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(initialArchived)

  // Fetch notes on mount and when filters change
  useEffect(() => {
    const filter: { types?: NoteType[]; goalId?: string; archived?: boolean } = {}

    if (typeFilter !== 'all') {
      filter.types = [typeFilter]
    }
    if (goalFilter !== 'all') {
      filter.goalId = goalFilter
    }
    filter.archived = showArchived

    fetchNotes(filter)
  }, [typeFilter, goalFilter, showArchived, fetchNotes])

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      const filter: { types?: NoteType[]; archived?: boolean } = {}
      if (typeFilter !== 'all') {
        filter.types = [typeFilter]
      }
      filter.archived = showArchived
      search(searchQuery, filter)
    } else {
      clearSearchResults()
    }
  }, [searchQuery, typeFilter, showArchived, search, clearSearchResults])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (goalFilter !== 'all') params.set('goalId', goalFilter)
    if (showArchived) params.set('archived', 'true')
    setSearchParams(params, { replace: true })
  }, [typeFilter, goalFilter, showArchived, setSearchParams])

  // Display search results if searching, otherwise show filtered items
  const displayItems = searchQuery.trim()
    ? searchResults.map((r) => r.note)
    : items

  const getCreateLink = () => {
    if (typeFilter === 'all') return '/notes/new'
    return `/notes/new?type=${typeFilter}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StickyNote className="h-8 w-8 text-slate-500" />
          <h1 className="text-2xl font-bold">ノート</h1>
        </div>
        <Link to={getCreateLink()}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      {/* Type tabs */}
      <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as NoteType | 'all')}>
        <TabsList>
          <TabsTrigger value="all">すべて</TabsTrigger>
          <TabsTrigger value="diary" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            日記
          </TabsTrigger>
          <TabsTrigger value="learning" className="gap-2">
            <BookOpen className="h-4 w-4" />
            学習記録
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
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
        <Select value={goalFilter} onValueChange={setGoalFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="目標" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべての目標</SelectItem>
            {goals
              .filter((g) => !g.isArchived)
              .map((goal) => (
                <SelectItem key={goal.id} value={goal.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: goal.color }}
                    />
                    {goal.name}
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Button
          variant={showArchived ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
          className="gap-2"
        >
          <Archive className="h-4 w-4" />
          {showArchived ? 'アーカイブ済み' : 'アーカイブ'}
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground mt-4">読み込み中...</p>
        </div>
      )}

      {/* Notes grid */}
      {!isLoading && displayItems.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayItems.map((note) => {
            const TypeIcon = NOTE_TYPE_ICONS[note.type]
            const FormatIcon = note.format === 'markdown' ? FileText : Shapes

            return (
              <Link key={note.id} to={`/notes/${note.id}`}>
                <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/30">
                        <FormatIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs gap-1">
                            <TypeIcon className="h-3 w-3" />
                            {NOTE_TYPE_LABELS[note.type]}
                          </Badge>
                          {note.archived && (
                            <Badge variant="outline" className="text-xs">
                              アーカイブ済み
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium truncate">
                          {note.title || '無題'}
                        </h3>
                        {note.date && (
                          <p className="text-sm text-muted-foreground">
                            {note.date}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          作成: {formatDateIso(note.createdAt)}
                        </p>
                        {(note.goalName || note.milestoneName) && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {note.goalName && note.goalColor && (
                              <GoalBadge name={note.goalName} color={note.goalColor} size="sm" />
                            )}
                            {note.milestoneName && (
                              <span className="text-xs text-muted-foreground">
                                {note.milestoneName}
                              </span>
                            )}
                          </div>
                        )}
                        {note.tagIds && note.tagIds.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {note.tagIds.slice(0, 3).map((tagId) => {
                              const tag = tags.find((t) => t.id === tagId)
                              return tag ? (
                                <Badge
                                  key={tagId}
                                  variant="outline"
                                  className="text-xs"
                                  style={{ borderColor: tag.color, color: tag.color }}
                                >
                                  {tag.name}
                                </Badge>
                              ) : null
                            })}
                            {note.tagIds.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{note.tagIds.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && displayItems.length === 0 && (
        <div className="text-center py-12">
          <StickyNote className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">
            {searchQuery
              ? '該当するノートが見つかりません'
              : showArchived
              ? 'アーカイブされたノートはありません'
              : 'ノートがまだありません'}
          </p>
          <Link to={getCreateLink()}>
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
