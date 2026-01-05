import { create } from 'zustand'
import type { Project, Task } from '@/types'
import { mockProjects, mockTasks } from '@/data/mockData'

interface TaskState {
  projects: Project[]
  tasks: Task[]

  // プロジェクト操作
  addProject: (project: Omit<Project, 'id'>) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void

  // タスク操作
  addTask: (task: Omit<Task, 'id'>) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  toggleTaskComplete: (id: string) => void

  // 取得
  getProjectById: (id: string) => Project | undefined
  getTaskById: (id: string) => Task | undefined
  getTasksByProject: (projectId: string) => Task[]
  getChildTasks: (parentTaskId: string) => Task[]
}

export const useTaskStore = create<TaskState>((set, get) => ({
  projects: mockProjects,
  tasks: mockTasks,

  addProject: (project) =>
    set((state) => ({
      projects: [...state.projects, { ...project, id: `p${Date.now()}` }],
    })),

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  deleteProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      tasks: state.tasks.filter((t) => t.projectId !== id),
    })),

  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, { ...task, id: `t${Date.now()}` }],
    })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id && t.parentTaskId !== id),
    })),

  toggleTaskComplete: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      ),
    })),

  getProjectById: (id) => get().projects.find((p) => p.id === id),

  getTaskById: (id) => get().tasks.find((t) => t.id === id),

  getTasksByProject: (projectId) =>
    get().tasks.filter((t) => t.projectId === projectId && !t.parentTaskId),

  getChildTasks: (parentTaskId) =>
    get().tasks.filter((t) => t.parentTaskId === parentTaskId),
}))
