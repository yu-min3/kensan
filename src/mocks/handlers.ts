// Aggregate all MSW handlers
import { authHandlers } from './handlers/auth'
import { taskHandlers } from './handlers/tasks'
import { timeblockHandlers } from './handlers/timeblocks'
import { timerHandlers } from './handlers/timer'
import { syncHandlers } from './handlers/sync'
import { routineHandlers } from './handlers/routines'
import { recordHandlers } from './handlers/records'
import { diaryHandlers } from './handlers/diaries'
import { analyticsHandlers } from './handlers/analytics'
import { aiHandlers } from './handlers/ai'

export const handlers = [
  ...authHandlers,
  ...taskHandlers,
  ...timeblockHandlers,
  ...timerHandlers,
  ...syncHandlers,
  ...routineHandlers,
  ...recordHandlers,
  ...diaryHandlers,
  ...analyticsHandlers,
  ...aiHandlers,
]
