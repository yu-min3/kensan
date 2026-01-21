import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { TagBadge } from '@/components/common/TagBadge'
import { TaskDialog, type TaskFormData } from '@/components/task/TaskDialog'
import { ProjectDialog, type ProjectFormData } from '@/components/task/ProjectDialog'
import { useDialogState } from '@/hooks/useDialogState'
import { useTaskStore } from '@/stores/useTaskStore'
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

const initialTaskFormData: TaskFormData = {
  name: '',
  projectId: '',
  parentTaskId: undefined,
  goalTag: '',
}

const initialProjectFormData: ProjectFormData = {
  name: '',
  goalTag: '',
  color: '#6366f1',
}

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

  const taskDialog = useDialogState<TaskFormData>(initialTaskFormData)
  const projectDialog = useDialogState<ProjectFormData>(initialProjectFormData)

  // Task Dialog Handlers
  const openNewTaskDialog = (projectId?: string, parentId?: string) => {
    taskDialog.open({
      projectId: projectId || projects[0]?.id || '',
      parentTaskId: parentId,
    })
  }

  const openEditTaskDialog = (task: typeof tasks[0]) => {
    taskDialog.openEdit(task.id, {
      name: task.name,
      projectId: task.projectId,
      parentTaskId: task.parentTaskId,
      goalTag: task.goalTag || '',
    })
  }

  const handleSaveTask = async (data: TaskFormData, editingId: string | null) => {
    if (editingId) {
      await updateTask(editingId, {
        name: data.name,
        projectId: data.projectId,
        parentTaskId: data.parentTaskId,
        goalTag: data.goalTag || undefined,
      })
    } else {
      await addTask({
        name: data.name,
        projectId: data.projectId,
        parentTaskId: data.parentTaskId,
        goalTag: data.goalTag || undefined,
      })
    }
  }

  const handleDeleteTask = async (id: string) => {
    if (window.confirm('このタスクを削除しますか？')) {
      await deleteTask(id)
    }
  }

  // Project Dialog Handlers
  const openEditProjectDialog = (project: typeof projects[0]) => {
    projectDialog.openEdit(project.id, {
      name: project.name,
      goalTag: project.goalTag || '',
      color: project.color || '#6366f1',
    })
  }

  const handleSaveProject = async (data: ProjectFormData, editingId: string | null) => {
    if (editingId) {
      await updateProject(editingId, {
        name: data.name,
        goalTag: data.goalTag || undefined,
        color: data.color,
      })
    } else {
      await addProject({
        name: data.name,
        goalTag: data.goalTag || undefined,
        color: data.color,
      })
    }
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
          <Button variant="outline" className="gap-2" onClick={() => projectDialog.open()}>
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

      {/* Dialogs */}
      <TaskDialog
        dialog={taskDialog}
        projects={projects}
        tasks={tasks}
        onSave={handleSaveTask}
      />

      <ProjectDialog
        dialog={projectDialog}
        onSave={handleSaveProject}
      />
    </div>
  )
}
