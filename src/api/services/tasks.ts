// Tasks & Projects API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'
import type { Project, Task, GoalTag } from '@/types'

// API Response types (may differ slightly from frontend types)
interface ProjectResponse {
  id: string
  name: string
  goalTag?: GoalTag
  color?: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

interface TaskResponse {
  id: string
  name: string
  projectId: string
  parentTaskId?: string
  estimatedMinutes?: number
  completed: boolean
  dueDate?: string
  createdAt: string
  updatedAt: string
}

// Transform API response to frontend type
const transformProject = (p: ProjectResponse): Project => ({
  id: p.id,
  name: p.name,
  goalTag: p.goalTag,
  color: p.color,
  isArchived: p.isArchived,
})

const transformTask = (t: TaskResponse): Task => ({
  id: t.id,
  name: t.name,
  projectId: t.projectId,
  parentTaskId: t.parentTaskId,
  estimatedMinutes: t.estimatedMinutes,
  completed: t.completed,
  dueDate: t.dueDate,
})

export const projectsApi = {
  async list(filters?: { archived?: boolean; goalTag?: GoalTag }): Promise<Project[]> {
    const params = new URLSearchParams()
    if (filters?.archived !== undefined) params.set('archived', String(filters.archived))
    if (filters?.goalTag) params.set('goal_tag', filters.goalTag)

    const query = params.toString()
    const endpoint = `/projects${query ? `?${query}` : ''}`

    const response = await httpClient.get<ProjectResponse[]>(
      API_CONFIG.baseUrls.task,
      endpoint
    )
    return response.map(transformProject)
  },

  async get(id: string): Promise<Project> {
    const response = await httpClient.get<ProjectResponse>(
      API_CONFIG.baseUrls.task,
      `/projects/${id}`
    )
    return transformProject(response)
  },

  async create(data: { name: string; goalTag?: GoalTag; color?: string }): Promise<Project> {
    const response = await httpClient.post<ProjectResponse>(
      API_CONFIG.baseUrls.task,
      '/projects',
      data
    )
    return transformProject(response)
  },

  async update(id: string, data: Partial<{ name: string; goalTag?: GoalTag; color?: string; isArchived?: boolean }>): Promise<Project> {
    const response = await httpClient.put<ProjectResponse>(
      API_CONFIG.baseUrls.task,
      `/projects/${id}`,
      data
    )
    return transformProject(response)
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(API_CONFIG.baseUrls.task, `/projects/${id}`)
  },
}

export const tasksApi = {
  async list(filters?: { projectId?: string; completed?: boolean; parentId?: string }): Promise<Task[]> {
    const params = new URLSearchParams()
    if (filters?.projectId) params.set('project_id', filters.projectId)
    if (filters?.completed !== undefined) params.set('completed', String(filters.completed))
    if (filters?.parentId) params.set('parent_id', filters.parentId)

    const query = params.toString()
    const endpoint = `/tasks${query ? `?${query}` : ''}`

    const response = await httpClient.get<TaskResponse[]>(
      API_CONFIG.baseUrls.task,
      endpoint
    )
    return response.map(transformTask)
  },

  async get(id: string): Promise<Task> {
    const response = await httpClient.get<TaskResponse>(
      API_CONFIG.baseUrls.task,
      `/tasks/${id}`
    )
    return transformTask(response)
  },

  async create(data: { name: string; projectId: string; parentTaskId?: string; estimatedMinutes?: number; dueDate?: string }): Promise<Task> {
    const response = await httpClient.post<TaskResponse>(
      API_CONFIG.baseUrls.task,
      '/tasks',
      data
    )
    return transformTask(response)
  },

  async update(id: string, data: Partial<{ name: string; projectId?: string; parentTaskId?: string | null; estimatedMinutes?: number; dueDate?: string | null }>): Promise<Task> {
    const response = await httpClient.put<TaskResponse>(
      API_CONFIG.baseUrls.task,
      `/tasks/${id}`,
      data
    )
    return transformTask(response)
  },

  async toggleComplete(id: string): Promise<Task> {
    const response = await httpClient.patch<TaskResponse>(
      API_CONFIG.baseUrls.task,
      `/tasks/${id}/complete`
    )
    return transformTask(response)
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(API_CONFIG.baseUrls.task, `/tasks/${id}`)
  },
}
