// Aggregate all MSW handlers
import { authHandlers } from './handlers/auth'
import { taskHandlers } from './handlers/tasks'
import { timeblockHandlers } from './handlers/timeblocks'
import { timerHandlers } from './handlers/timer'
import { routineHandlers } from './handlers/routines'
import { recordHandlers } from './handlers/records'
import { diaryHandlers } from './handlers/diaries'
import { analyticsHandlers } from './handlers/analytics'
import { aiHandlers } from './handlers/ai'
import { memoHandlers } from './handlers/memos'
import { noteHandlers } from './handlers/notes'

export const handlers = [
  ...authHandlers,
  ...taskHandlers,
  ...timeblockHandlers,
  ...timerHandlers,
  ...routineHandlers,
  ...recordHandlers,
  ...diaryHandlers,
  ...analyticsHandlers,
  ...aiHandlers,
  ...memoHandlers,
  ...noteHandlers,
]
