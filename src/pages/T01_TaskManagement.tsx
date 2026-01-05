import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { TagBadge } from '@/components/common/TagBadge'
import { useTaskStore } from '@/stores/useTaskStore'
import {
  FolderKanban,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Folder,
} from 'lucide-react'

export function T01TaskManagement() {
  const { projects, tasks, toggleTaskComplete, getTasksByProject, getChildTasks } = useTaskStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(projects.map((p) => p.id))
  )
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedProjects(newExpanded)
  }

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedTasks(newExpanded)
  }

  const filteredProjects = projects.filter((p) => !p.isArchived)

  const filterTasks = (projectTasks: typeof tasks) => {
    return projectTasks.filter((task) => {
      const matchesSearch =
        searchQuery === '' ||
        task.name.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesActive = !showActiveOnly || !task.completed

      return matchesSearch && matchesActive
    })
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-8 w-8 text-red-500" />
          <h1 className="text-2xl font-bold">タスク管理</h1>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          タスク追加
        </Button>
      </div>

      {/* フィルター */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={showActiveOnly}
            onCheckedChange={(checked) => setShowActiveOnly(checked === true)}
          />
          <span className="text-sm">アクティブのみ</span>
        </label>
      </div>

      {/* プロジェクト・タスク一覧 */}
      <div className="space-y-4">
        {filteredProjects.map((project) => {
          const projectTasks = getTasksByProject(project.id)
          const filteredProjectTasks = filterTasks(projectTasks)
          const isExpanded = expandedProjects.has(project.id)

          return (
            <Card key={project.id}>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <button
                    onClick={() => toggleProject(project.id)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <Folder className="h-4 w-4" style={{ color: project.color }} />
                  <span>{project.name}</span>
                  {project.goalTag && (
                    <TagBadge tag={project.goalTag} size="sm" />
                  )}
                  <span className="text-sm text-muted-foreground ml-auto">
                    {filteredProjectTasks.length}タスク
                  </span>
                </CardTitle>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {filteredProjectTasks.map((task) => {
                      const childTasks = getChildTasks(task.id)
                      const filteredChildTasks = filterTasks(childTasks)
                      const hasChildren = filteredChildTasks.length > 0
                      const isTaskExpanded = expandedTasks.has(task.id)

                      return (
                        <div key={task.id}>
                          <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/50">
                            {hasChildren ? (
                              <button
                                onClick={() => toggleTask(task.id)}
                                className="p-1 hover:bg-muted rounded"
                              >
                                {isTaskExpanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </button>
                            ) : (
                              <div className="w-6" />
                            )}
                            <Checkbox
                              checked={task.completed}
                              onCheckedChange={() => toggleTaskComplete(task.id)}
                            />
                            <span
                              className={`flex-1 text-sm ${
                                task.completed
                                  ? 'line-through text-muted-foreground'
                                  : ''
                              }`}
                            >
                              {task.name}
                            </span>
                          </div>

                          {/* 子タスク */}
                          {hasChildren && isTaskExpanded && (
                            <div className="ml-8 space-y-1">
                              {filteredChildTasks.map((childTask) => (
                                <div
                                  key={childTask.id}
                                  className="flex items-center gap-2 p-2 rounded hover:bg-muted/50"
                                >
                                  <div className="w-6" />
                                  <Checkbox
                                    checked={childTask.completed}
                                    onCheckedChange={() =>
                                      toggleTaskComplete(childTask.id)
                                    }
                                  />
                                  <span
                                    className={`flex-1 text-sm ${
                                      childTask.completed
                                        ? 'line-through text-muted-foreground'
                                        : ''
                                    }`}
                                  >
                                    {childTask.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {filteredProjectTasks.length === 0 && (
                      <p className="text-sm text-muted-foreground py-2 text-center">
                        タスクがありません
                      </p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
