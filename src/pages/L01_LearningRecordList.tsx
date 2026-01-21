import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagBadge } from '@/components/common/TagBadge'
import { useLearningRecordStore } from '@/stores/useLearningRecordStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { format } from 'date-fns'
import { BookOpen, Plus, Search, FileText, Shapes } from 'lucide-react'

export function L01LearningRecordList() {
  const { items: records } = useLearningRecordStore()
  const { projects } = useTaskStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      searchQuery === '' ||
      record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.content.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesProject =
      projectFilter === 'all' || record.projectId === projectFilter

    return matchesSearch && matchesProject
  })

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-green-500" />
          <h1 className="text-2xl font-bold">学習記録</h1>
        </div>
        <Link to="/learning-records/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      {/* フィルター */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="プロジェクト" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 記録一覧 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredRecords.map((record) => (
          <Link key={record.id} to={`/learning-records/${record.id}`}>
            <Card className="h-full hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    {record.format === 'markdown' ? (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Shapes className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{record.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(record.createdAt, 'yyyy-MM-dd')}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {record.goalTag && (
                        <TagBadge tag={record.goalTag} size="sm" />
                      )}
                      {record.projectName && (
                        <span className="text-xs text-muted-foreground">
                          {record.projectName}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {record.format === 'markdown'
                        ? (record.content || '').slice(0, 100) + '...'
                        : 'drawio図解'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredRecords.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">
            {searchQuery || projectFilter !== 'all'
              ? '該当する記録が見つかりません'
              : '学習記録がまだありません'}
          </p>
          <Link to="/learning-records/new">
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
