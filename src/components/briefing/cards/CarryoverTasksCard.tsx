import { AlertTriangle } from 'lucide-react'
import type { CarryoverTask } from '@/hooks/useBriefingData'

export function CarryoverTasksCard({ tasks }: { tasks: CarryoverTask[] }) {
  return (
    <div className="space-y-2">
      {tasks.length > 0 ? (
        tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-2 text-sm">
            {task.daysOverdue > 0 ? (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
            ) : (
              <span
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{ backgroundColor: task.goalColor ?? '#94a3b8' }}
              />
            )}
            <div className="flex-1 min-w-0">
              <span className="truncate block">{task.name}</span>
              {task.daysOverdue > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  {task.daysOverdue}日超過
                </span>
              )}
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">持ち越しタスクはありません</p>
      )}
    </div>
  )
}
