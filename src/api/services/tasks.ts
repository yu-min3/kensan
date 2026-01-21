// Tasks & Projects API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'
import { createApiService, extendApiService } from '../createApiService'
import type { Project, Task, GoalTag } from '@/types'

// API Response types
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
  goalTag?: GoalTag
  estimatedMinutes?: number
  completed: boolean
  dueDate?: string
  createdAt: string
  updatedAt: string
}

// Transform functions
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
  goalTag: t.goalTag,
  estimatedMinutes: t.estimatedMinutes,
  completed: t.completed,
  dueDate: t.dueDate,
})

// Project input types
export interface CreateProjectInput {
  name: string
  goalTag?: GoalTag
  color?: string
}

export interface UpdateProjectInput {
  name?: string
  goalTag?: GoalTag
  color?: string
  isArchived?: boolean
}

export interface ProjectFilter {
  archived?: boolean
  goalTag?: GoalTag
}

// Task input types
export interface CreateTaskInput {
  name: string
  projectId: string
  parentTaskId?: string
  goalTag?: GoalTag
  estimatedMinutes?: number
  dueDate?: string
}

export interface UpdateTaskInput {
  name?: string
  projectId?: string
  parentTaskId?: string | null
  goalTag?: GoalTag | null
  estimatedMinutes?: number
  dueDate?: string | null
}

export interface TaskFilter {
  projectId?: string
  completed?: boolean
  parentId?: string
}

// Projects API
export const projectsApi = createApiService<
  ProjectResponse,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectFilter
>(
  {
    baseUrl: API_CONFIG.baseUrls.task,
    resourcePath: '/projects',
    transform: transformProject,
  },
  {
    filterMappings: {
      goalTag: 'goal_tag',
    },
  }
)

// Tasks API - base CRUD
const baseTasksApi = createApiService<
  TaskResponse,
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter
>(
  {
    baseUrl: API_CONFIG.baseUrls.task,
    resourcePath: '/tasks',
    transform: transformTask,
  },
  {
    filterMappings: {
      projectId: 'project_id',
      parentId: 'parent_id',
    },
  }
)

// Tasks API with toggle complete
export const tasksApi = extendApiService(baseTasksApi, () => ({
  async toggleComplete(id: string): Promise<Task> {
    const response = await httpClient.patch<TaskResponse>(
      API_CONFIG.baseUrls.task,
      `/tasks/${id}/complete`
    )
    return transformTask(response)
  },
}))
