import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { TagBadge } from '@/components/common/TagBadge'
import { useTaskStore } from '@/stores/useTaskStore'
import type { GoalTag } from '@/types'
import {
  FolderKanban,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Folder,
  Edit,
  Trash2,
} from 'lucide-react'

const goalTagOptions: { value: GoalTag; label: string }[] = [
  { value: 'GK', label: 'GK (Golden Kubestronaut)' },
  { value: 'OSS', label: 'OSS' },
  { value: 'Output', label: 'Output' },
  { value: 'Other', label: 'Other' },
]

export function T01TaskManagement() {
  const {
    projects,
    tasks,
    toggleTaskComplete,
    getTasksByProject,
    getChildTasks,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
  } = useTaskStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(projects.map((p) => p.id))
  )
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  // Task Dialog State
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [taskName, setTaskName] = useState('')
  const [taskProjectId, setTaskProjectId] = useState('')
  const [taskParentId, setTaskParentId] = useState<string | undefined>(undefined)
  const [taskGoalTag, setTaskGoalTag] = useState<GoalTag | ''>('')

  // Project Dialog State
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [projectName, setProjectName] = useState('')
  const [projectGoalTag, setProjectGoalTag] = useState<GoalTag | ''>('')
  const [projectColor, setProjectColor] = useState('#6366f1')

  // Task Dialog Handlers
  const openNewTaskDialog = (projectId?: string, parentId?: string) => {
    setEditingTaskId(null)
    setTaskName('')
    setTaskProjectId(projectId || projects[0]?.id || '')
    setTaskParentId(parentId)
    setTaskGoalTag('')
    setIsTaskDialogOpen(true)
  }

  const openEditTaskDialog = (task: typeof tasks[0]) => {
    setEditingTaskId(task.id)
    setTaskName(task.name)
    setTaskProjectId(task.projectId)
    setTaskParentId(task.parentTaskId)
    setTaskGoalTag(task.goalTag || '')
    setIsTaskDialogOpen(true)
  }

  const handleSaveTask = async () => {
    if (!taskName || !taskProjectId) return

    if (editingTaskId) {
      await updateTask(editingTaskId, { name: taskName, projectId: taskProjectId, parentTaskId: taskParentId, goalTag: taskGoalTag || undefined })
    } else {
      await addTask({ name: taskName, projectId: taskProjectId, parentTaskId: taskParentId, goalTag: taskGoalTag || undefined })
    }
    setIsTaskDialogOpen(false)
  }

  const handleDeleteTask = async (id: string) => {
    if (window.confirm('このタスクを削除しますか？')) {
      await deleteTask(id)
    }
  }

  // Project Dialog Handlers
  const openNewProjectDialog = () => {
    setEditingProjectId(null)
    setProjectName('')
    setProjectGoalTag('')
    setProjectColor('#6366f1')
    setIsProjectDialogOpen(true)
  }

  const openEditProjectDialog = (project: typeof projects[0]) => {
    setEditingProjectId(project.id)
    setProjectName(project.name)
    setProjectGoalTag(project.goalTag || '')
    setProjectColor(project.color || '#6366f1')
    setIsProjectDialogOpen(true)
  }

  const handleSaveProject = async () => {
    if (!projectName) return

    if (editingProjectId) {
      await updateProject(editingProjectId, {
        name: projectName,
        goalTag: projectGoalTag || undefined,
        color: projectColor,
      })
    } else {
      await addProject({
        name: projectName,
        goalTag: projectGoalTag || undefined,
        color: projectColor,
      })
    }
    setIsProjectDialogOpen(false)
  }

  const handleDeleteProject = async (id: string) => {
    if (window.confirm('このプロジェクトと配下のタスクを削除しますか？')) {
      await deleteProject(id)
    }
  }

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
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={openNewProjectDialog}>
            <Plus className="h-4 w-4" />
            プロジェクト追加
          </Button>
          <Button className="gap-2" onClick={() => openNewTaskDialog()}>
            <Plus className="h-4 w-4" />
            タスク追加
          </Button>
        </div>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => openNewTaskDialog(project.id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => openEditProjectDialog(project)}
                    title="プロジェクトを編集"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleDeleteProject(project.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
                          <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 group">
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
                            {task.goalTag && <TagBadge tag={task.goalTag} size="sm" />}
                            <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => openNewTaskDialog(task.projectId, task.id)}
                                title="サブタスク追加"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => openEditTaskDialog(task)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* 子タスク */}
                          {hasChildren && isTaskExpanded && (
                            <div className="ml-8 space-y-1">
                              {filteredChildTasks.map((childTask) => (
                                <div
                                  key={childTask.id}
                                  className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 group"
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
                                  {childTask.goalTag && <TagBadge tag={childTask.goalTag} size="sm" />}
                                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => openEditTaskDialog(childTask)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleDeleteTask(childTask.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
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

      {/* タスク追加/編集ダイアログ */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTaskId ? 'タスクを編集' : 'タスクを追加'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="taskName">タスク名</Label>
              <Input
                id="taskName"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="例: ドキュメント作成"
                className="mt-1"
              />
            </div>

            <div>
              <Label>プロジェクト</Label>
              <Select value={taskProjectId} onValueChange={setTaskProjectId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="プロジェクトを選択" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>目標タグ</Label>
              <Select value={taskGoalTag} onValueChange={(v) => setTaskGoalTag(v as GoalTag)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="タグを選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  {goalTagOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {taskParentId && (
              <div>
                <Label className="text-muted-foreground">
                  親タスク: {tasks.find((t) => t.id === taskParentId)?.name}
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveTask} disabled={!taskName || !taskProjectId}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* プロジェクト追加/編集ダイアログ */}
      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProjectId ? 'プロジェクトを編集' : 'プロジェクトを追加'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="projectName">プロジェクト名</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="例: 新規プロジェクト"
                className="mt-1"
              />
            </div>

            <div>
              <Label>目標タグ</Label>
              <Select value={projectGoalTag} onValueChange={(v) => setProjectGoalTag(v as GoalTag)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="タグを選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  {goalTagOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="projectColor">カラー</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="projectColor"
                  type="color"
                  value={projectColor}
                  onChange={(e) => setProjectColor(e.target.value)}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={projectColor}
                  onChange={(e) => setProjectColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProjectDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveProject} disabled={!projectName}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
