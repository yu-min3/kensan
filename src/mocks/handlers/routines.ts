// Routine Tasks MSW handlers
import { routineTasks } from '../data'
import { createMockCrudHandlers, createToggleHandler } from '../createMockCrudHandlers'

const BASE_URL = 'http://localhost:8085/api/v1'

// Transform to API response format
const toRoutineResponse = (r: typeof routineTasks[0]) => ({
  id: r.id,
  userId: 'user-1',
  name: r.name,
  frequency: r.frequency,
  daysOfWeek: r.daysOfWeek,
  estimatedMinutes: r.estimatedMinutes,
  enabled: r.enabled,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

// Base CRUD handlers (no getById for routines)
const crudHandlers = createMockCrudHandlers(
  {
    baseUrl: BASE_URL,
    resourcePath: '/routines',
    transform: toRoutineResponse,
    data: routineTasks,
    getId: (r) => r.id,
    idPrefix: 'r',
    resourceName: 'Routine task',
    prependOnAdd: false,
  },
  {
    skipGetById: true,
    filters: [
      { paramName: 'enabled', fieldName: 'enabled', type: 'boolean' },
    ],
  }
)

// Toggle handler
const toggleHandler = createToggleHandler({
  baseUrl: BASE_URL,
  resourcePath: '/routines',
  data: routineTasks,
  getId: (r) => r.id,
  transform: toRoutineResponse,
  resourceName: 'Routine task',
  toggleField: 'enabled',
  toggleEndpoint: 'toggle',
})

export const routineHandlers = [
  ...crudHandlers,
  toggleHandler,
]
