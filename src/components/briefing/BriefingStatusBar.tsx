import { cn } from '@/lib/utils'
import { Check, Loader2 } from 'lucide-react'
import type { BriefingStep } from '@/types/briefing'

interface BriefingStatusBarProps {
  steps: BriefingStep[]
}

export function BriefingStatusBar({ steps }: BriefingStatusBarProps) {
  const completedCount = steps.filter((s) => s.status === 'completed').length
  const total = steps.length

  if (total === 0) return null

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-brand transition-all duration-500 ease-out rounded-full"
          style={{ width: `${(completedCount / total) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-3 flex-wrap">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              'flex items-center gap-1.5 text-xs transition-colors',
              step.status === 'completed' && 'text-emerald-600 dark:text-emerald-400',
              step.status === 'active' && 'text-brand font-medium',
              step.status === 'pending' && 'text-muted-foreground',
            )}
          >
            {step.status === 'completed' && <Check className="h-3 w-3" />}
            {step.status === 'active' && <Loader2 className="h-3 w-3 animate-spin" />}
            {step.status === 'pending' && <span className="h-3 w-3 rounded-full border border-muted-foreground/40 inline-block" />}
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
