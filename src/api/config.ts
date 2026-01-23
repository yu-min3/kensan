// API Configuration

export const API_CONFIG = {
  // Backend service base URLs
  baseUrls: {
    user: import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:8081',
    task: import.meta.env.VITE_TASK_SERVICE_URL || 'http://localhost:8082',
    timeblock: import.meta.env.VITE_TIMEBLOCK_SERVICE_URL || 'http://localhost:8084',
    routine: import.meta.env.VITE_ROUTINE_SERVICE_URL || 'http://localhost:8085',
    record: import.meta.env.VITE_RECORD_SERVICE_URL || 'http://localhost:8086',
    diary: import.meta.env.VITE_DIARY_SERVICE_URL || 'http://localhost:8087',
    analytics: import.meta.env.VITE_ANALYTICS_SERVICE_URL || 'http://localhost:8088',
    ai: import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8089',
    memo: import.meta.env.VITE_MEMO_SERVICE_URL || 'http://localhost:8090',
    note: import.meta.env.VITE_NOTE_SERVICE_URL || 'http://localhost:8091',
  },
} as const
