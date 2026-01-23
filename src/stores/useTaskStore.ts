import { create } from 'zustand'
import type { Goal, Milestone, Tag, Task } from '@/types'
import { goalsApi, milestonesApi, tagsApi, tasksApi } from '@/api/services/tasks'

interface TaskState {
  goals: Goal[]
  milestones: Milestone[]
  tags: Tag[]
  tasks: Task[]
  isLoading: boolean
  error: string | null

  // データ取得
  fetchAll: () => Promise<void>

  // Goal操作
  addGoal: (goal: { name: string; description?: string; color: string }) => Promise<void>
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>

  // Milestone操作
  addMilestone: (milestone: { goalId: string; name: string; description?: string; targetDate?: string }) => Promise<void>
  updateMilestone: (id: string, updates: Partial<Milestone>) => Promise<void>
  deleteMilestone: (id: string) => Promise<void>

  // Tag操作
  addTag: (tag: { name: string; color: string }) => Promise<void>
  updateTag: (id: string, updates: Partial<Tag>) => Promise<void>
  deleteTag: (id: string) => Promise<void>

  // Task操作
  addTask: (task: { name: string; milestoneId?: string; parentTaskId?: string; tagIds?: string[]; estimatedMinutes?: number; dueDate?: string }) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleTaskComplete: (id: string) => Promise<void>
  reorderTasks: (taskIds: string[]) => Promise<void>
  bulkDeleteTasks: (taskIds: string[]) => Promise<void>
  bulkCompleteTasks: (taskIds: string[], completed: boolean) => Promise<void>

  // 取得（同期）
  getGoalById: (id: string) => Goal | undefined
  getMilestoneById: (id: string) => Milestone | undefined
  getTagById: (id: string) => Tag | undefined
  getTagsByIds: (ids: string[]) => Tag[]
  getTaskById: (id: string) => Task | undefined
  getMilestonesByGoal: (goalId: string) => Milestone[]
  getTasksByMilestone: (milestoneId: string) => Task[]
  getChildTasks: (parentTaskId: string) => Task[]
  getStandaloneTasks: () => Task[]

  // 後方互換性 (移行期間中)
  /** @deprecated Use goals instead */
  projects: Goal[]
}

export const useTaskStore = create<TaskState>((set, get) => ({
  goals: [],
  milestones: [],
  tags: [],
  tasks: [],
  isLoading: false,
  error: null,

  // 後方互換性
  get projects() {
    return get().goals
  },

  fetchAll: async () => {
    set({ isLoading: true, error: null })
    try {
      const [goals, milestones, tags, tasks] = await Promise.all([
        goalsApi.list(),
        milestonesApi.list(),
        tagsApi.list(),
        tasksApi.list(),
      ])
      set({ goals, milestones, tags, tasks, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  // Goal操作
  addGoal: async (goal) => {
    try {
      const newGoal = await goalsApi.create(goal)
      set((state) => ({ goals: [...state.goals, newGoal] }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  updateGoal: async (id, updates) => {
    try {
      const updatedGoal = await goalsApi.update(id, updates)
      set((state) => ({
        goals: state.goals.map((g) => (g.id === id ? updatedGoal : g)),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  deleteGoal: async (id) => {
    try {
      await goalsApi.delete(id)
      set((state) => ({
        goals: state.goals.filter((g) => g.id !== id),
        milestones: state.milestones.filter((m) => m.goalId !== id),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  // Milestone操作
  addMilestone: async (milestone) => {
    try {
      const newMilestone = await milestonesApi.create(milestone)
      set((state) => ({ milestones: [...state.milestones, newMilestone] }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  updateMilestone: async (id, updates) => {
    try {
      const updatedMilestone = await milestonesApi.update(id, updates)
      set((state) => ({
        milestones: state.milestones.map((m) => (m.id === id ? updatedMilestone : m)),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  deleteMilestone: async (id) => {
    try {
      await milestonesApi.delete(id)
      set((state) => ({
        milestones: state.milestones.filter((m) => m.id !== id),
        tasks: state.tasks.filter((t) => t.milestoneId !== id),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  // Tag操作
  addTag: async (tag) => {
    try {
      const newTag = await tagsApi.create(tag)
      set((state) => ({ tags: [...state.tags, newTag] }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  updateTag: async (id, updates) => {
    try {
      const updatedTag = await tagsApi.update(id, updates)
      set((state) => ({
        tags: state.tags.map((t) => (t.id === id ? updatedTag : t)),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  deleteTag: async (id) => {
    try {
      await tagsApi.delete(id)
      set((state) => ({ tags: state.tags.filter((t) => t.id !== id) }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  // Task操作
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
        tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
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
        tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  reorderTasks: async (taskIds) => {
    try {
      const updatedTasks = await tasksApi.reorder(taskIds)
      set((state) => ({
        tasks: state.tasks.map((t) => {
          const updated = updatedTasks.find((u) => u.id === t.id)
          return updated || t
        }),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  bulkDeleteTasks: async (taskIds) => {
    try {
      await tasksApi.bulkDelete(taskIds)
      const idsToDelete = new Set(taskIds)
      set((state) => ({
        tasks: state.tasks.filter((t) => !idsToDelete.has(t.id) && !idsToDelete.has(t.parentTaskId || '')),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  bulkCompleteTasks: async (taskIds, completed) => {
    try {
      const updatedTasks = await tasksApi.bulkComplete(taskIds, completed)
      set((state) => ({
        tasks: state.tasks.map((t) => {
          const updated = updatedTasks.find((u) => u.id === t.id)
          return updated || t
        }),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  // 取得（同期）
  getGoalById: (id) => get().goals.find((g) => g.id === id),
  getMilestoneById: (id) => get().milestones.find((m) => m.id === id),
  getTagById: (id) => get().tags.find((t) => t.id === id),
  getTagsByIds: (ids) => get().tags.filter((t) => ids.includes(t.id)),
  getTaskById: (id) => get().tasks.find((t) => t.id === id),
  getMilestonesByGoal: (goalId) => get().milestones.filter((m) => m.goalId === goalId),
  getTasksByMilestone: (milestoneId) =>
    get().tasks.filter((t) => t.milestoneId === milestoneId && !t.parentTaskId),
  getChildTasks: (parentTaskId) =>
    get().tasks.filter((t) => t.parentTaskId === parentTaskId),
  getStandaloneTasks: () =>
    get().tasks.filter((t) => !t.milestoneId && !t.parentTaskId),
}))
