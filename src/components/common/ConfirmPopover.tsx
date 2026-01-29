import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmPopoverProps {
  children: React.ReactNode
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  variant?: 'default' | 'destructive'
  disabled?: boolean
}

export function ConfirmPopover({
  children,
  message,
  confirmLabel = '確認',
  cancelLabel = 'キャンセル',
  onConfirm,
  variant = 'default',
  disabled = false,
}: ConfirmPopoverProps) {
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-auto max-w-[280px] p-3"
        align="end"
        side="top"
        sideOffset={8}
      >
        <div className="flex items-start gap-2">
          <AlertTriangle
            className={cn(
              'h-4 w-4 mt-0.5 shrink-0',
              variant === 'destructive' ? 'text-destructive' : 'text-amber-500'
            )}
          />
          <p className="text-sm">{message}</p>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            size="sm"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? '処理中...' : confirmLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
