// Tasks & Projects MSW handlers
import { projects, tasks } from '../data'
import { createMockCrudHandlers, createToggleHandler } from '../createMockCrudHandlers'

const BASE_URL = 'http://localhost:8082/api/v1'

// Transform to API response format
const toProjectResponse = (p: typeof projects[0]) => ({
  id: p.id,
  name: p.name,
  goalTag: p.goalTag,
  color: p.color,
  isArchived: p.isArchived,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

const toTaskResponse = (t: typeof tasks[0]) => ({
  id: t.id,
  name: t.name,
  projectId: t.projectId,
  parentTaskId: t.parentTaskId,
  estimatedMinutes: t.estimatedMinutes,
  completed: t.completed,
  dueDate: t.dueDate,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

// Project CRUD handlers
const projectHandlers = createMockCrudHandlers(
  {
    baseUrl: BASE_URL,
    resourcePath: '/projects',
    transform: toProjectResponse,
    data: projects,
    getId: (p) => p.id,
    idPrefix: 'p',
    resourceName: 'Project',
    prependOnAdd: false,
  },
  {
    filters: [
      { paramName: 'archived', fieldName: 'isArchived', type: 'boolean' },
      { paramName: 'goal_tag', fieldName: 'goalTag', type: 'equals' },
    ],
  }
)

// Task CRUD handlers
const taskCrudHandlers = createMockCrudHandlers(
  {
    baseUrl: BASE_URL,
    resourcePath: '/tasks',
    transform: toTaskResponse,
    data: tasks,
    getId: (t) => t.id,
    idPrefix: 't',
    resourceName: 'Task',
    prependOnAdd: false,
  },
  {
    filters: [
      { paramName: 'project_id', fieldName: 'projectId', type: 'equals' },
      { paramName: 'completed', fieldName: 'completed', type: 'boolean' },
      { paramName: 'parent_id', fieldName: 'parentTaskId', type: 'equals' },
    ],
  }
)

// Task toggle complete handler
const taskToggleHandler = createToggleHandler({
  baseUrl: BASE_URL,
  resourcePath: '/tasks',
  data: tasks,
  getId: (t) => t.id,
  transform: toTaskResponse,
  resourceName: 'Task',
  toggleField: 'completed',
  toggleEndpoint: 'complete',
})

export const taskHandlers = [
  ...projectHandlers,
  ...taskCrudHandlers,
  taskToggleHandler,
]
