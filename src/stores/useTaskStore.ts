import { create } from 'zustand'
import type { Project, Task, GoalTag } from '@/types'
import { projectsApi, tasksApi } from '@/api/services/tasks'

interface TaskState {
  projects: Project[]
  tasks: Task[]
  isLoading: boolean
  error: string | null

  // データ取得
  fetchAll: () => Promise<void>

  // プロジェクト操作
  addProject: (project: { name: string; goalTag?: GoalTag; color?: string }) => Promise<void>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  // タスク操作
  addTask: (task: { name: string; projectId: string; parentTaskId?: string; goalTag?: GoalTag }) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleTaskComplete: (id: string) => Promise<void>

  // 取得（同期）
  getProjectById: (id: string) => Project | undefined
  getTaskById: (id: string) => Task | undefined
  getTasksByProject: (projectId: string) => Task[]
  getChildTasks: (parentTaskId: string) => Task[]
}

export const useTaskStore = create<TaskState>((set, get) => ({
  projects: [],
  tasks: [],
  isLoading: false,
  error: null,

  fetchAll: async () => {
    set({ isLoading: true, error: null })
    try {
      const [projects, tasks] = await Promise.all([
        projectsApi.list(),
        tasksApi.list(),
      ])
      set({ projects, tasks, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  addProject: async (project) => {
    try {
      const newProject = await projectsApi.create(project)
      set((state) => ({ projects: [...state.projects, newProject] }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  updateProject: async (id, updates) => {
    try {
      const updatedProject = await projectsApi.update(id, updates)
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? updatedProject : p
        ),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  deleteProject: async (id) => {
    try {
      await projectsApi.delete(id)
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        tasks: state.tasks.filter((t) => t.projectId !== id),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  addTask: async (task) => {
    try {
      const newTask = await tasksApi.create(task)
      set((state) => ({ tasks: [...state.tasks, newTask] }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  updateTask: async (id, updates) => {
    try {
      const updatedTask = await tasksApi.update(id, updates)
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? updatedTask : t
        ),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  deleteTask: async (id) => {
    try {
      await tasksApi.delete(id)
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id && t.parentTaskId !== id),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  toggleTaskComplete: async (id) => {
    try {
      const updatedTask = await tasksApi.toggleComplete(id)
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? updatedTask : t
        ),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  getProjectById: (id) => get().projects.find((p) => p.id === id),

  getTaskById: (id) => get().tasks.find((t) => t.id === id),

  getTasksByProject: (projectId) =>
    get().tasks.filter((t) => t.projectId === projectId && !t.parentTaskId),

  getChildTasks: (parentTaskId) =>
    get().tasks.filter((t) => t.parentTaskId === parentTaskId),
}))
