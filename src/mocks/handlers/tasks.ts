// Goals, Milestones, Tags, Tasks MSW handlers
import { goals, milestones, tags, tasks } from '../data'
import { createMockCrudHandlers, createToggleHandler } from '../createMockCrudHandlers'

const BASE_URL = 'http://localhost:8082/api/v1'

// Transform to API response format
const toGoalResponse = (g: (typeof goals)[0]) => ({
  id: g.id,
  name: g.name,
  description: g.description,
  color: g.color,
  isArchived: g.isArchived,
  createdAt: g.createdAt.toISOString(),
  updatedAt: g.updatedAt.toISOString(),
})

const toMilestoneResponse = (m: (typeof milestones)[0]) => ({
  id: m.id,
  goalId: m.goalId,
  name: m.name,
  description: m.description,
  targetDate: m.targetDate,
  status: m.status,
  createdAt: m.createdAt.toISOString(),
  updatedAt: m.updatedAt.toISOString(),
})

const toTagResponse = (t: (typeof tags)[0]) => ({
  id: t.id,
  name: t.name,
  color: t.color,
  createdAt: t.createdAt.toISOString(),
})

const toTaskResponse = (t: (typeof tasks)[0]) => ({
  id: t.id,
  name: t.name,
  milestoneId: t.milestoneId,
  parentTaskId: t.parentTaskId,
  tagIds: t.tagIds,
  estimatedMinutes: t.estimatedMinutes,
  completed: t.completed,
  dueDate: t.dueDate,
  createdAt: t.createdAt.toISOString(),
  updatedAt: t.updatedAt.toISOString(),
})

// Goal CRUD handlers
const goalHandlers = createMockCrudHandlers(
  {
    baseUrl: BASE_URL,
    resourcePath: '/goals',
    transform: toGoalResponse,
    data: goals,
    getId: (g) => g.id,
    idPrefix: 'goal-',
    resourceName: 'Goal',
    prependOnAdd: false,
  },
  {
    filters: [
      { paramName: 'archived', fieldName: 'isArchived', type: 'boolean' },
    ],
  }
)

// Milestone CRUD handlers
const milestoneHandlers = createMockCrudHandlers(
  {
    baseUrl: BASE_URL,
    resourcePath: '/milestones',
    transform: toMilestoneResponse,
    data: milestones,
    getId: (m) => m.id,
    idPrefix: 'ms-',
    resourceName: 'Milestone',
    prependOnAdd: false,
  },
  {
    filters: [
      { paramName: 'goal_id', fieldName: 'goalId', type: 'equals' },
      { paramName: 'status', fieldName: 'status', type: 'equals' },
    ],
  }
)

// Tag CRUD handlers
const tagHandlers = createMockCrudHandlers(
  {
    baseUrl: BASE_URL,
    resourcePath: '/tags',
    transform: toTagResponse,
    data: tags,
    getId: (t) => t.id,
    idPrefix: 'tag-',
    resourceName: 'Tag',
    prependOnAdd: false,
  },
  {}
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
      { paramName: 'milestone_id', fieldName: 'milestoneId', type: 'equals' },
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
  ...goalHandlers,
  ...milestoneHandlers,
  ...tagHandlers,
  ...taskCrudHandlers,
  taskToggleHandler,
]
