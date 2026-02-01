import { useState } from 'react'
import {
  User,
  Bot,
  Wrench,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  AiEvent,
  AiPromptEvent,
  AiTurnEvent,
  AiToolCallEvent,
  AiCompleteEvent,
} from '@/api/services/observability'

interface ConversationFlowProps {
  events: AiEvent[]
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  } as Intl.DateTimeFormatOptions)
}

function ExpandableContent({
  content,
  label,
  maxPreviewLength = 200,
}: {
  content: string
  label: string
  maxPreviewLength?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const needsExpand = content.length > maxPreviewLength

  return (
    <div>
      <button
        onClick={() => needsExpand && setExpanded(!expanded)}
        className={cn(
          'text-left text-sm leading-relaxed',
          needsExpand && 'cursor-pointer'
        )}
      >
        {expanded ? (
          <div className="whitespace-pre-wrap break-words">{content}</div>
        ) : (
          <span>
            {content.substring(0, maxPreviewLength)}
            {needsExpand && (
              <span className="text-muted-foreground ml-1">
                … ({content.length} chars)
              </span>
            )}
          </span>
        )}
      </button>
      {needsExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground mt-1 hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronDown className="h-3 w-3" /> Hide {label}
            </>
          ) : (
            <>
              <ChevronRight className="h-3 w-3" /> Show full {label}
            </>
          )}
        </button>
      )}
    </div>
  )
}

function PromptEntry({ event }: { event: AiPromptEvent }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="rounded-full p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
          <User className="h-4 w-4" />
        </div>
        <div className="flex-1 w-px bg-border mt-2" />
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">USER</span>
          <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {event.model}
          </span>
        </div>
        <ExpandableContent content={event.user_message} label="message" />
      </div>
    </div>
  )
}

function TurnEntry({ event }: { event: AiTurnEvent }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="rounded-full p-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
          <Bot className="h-4 w-4" />
        </div>
        <div className="flex-1 w-px bg-border mt-2" />
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            AGENT (Turn {event.turn_number})
          </span>
          <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
          <span className="text-xs tabular-nums text-blue-600 dark:text-blue-400">
            in={event.input_tokens.toLocaleString()}
          </span>
          <span className="text-xs tabular-nums text-orange-600 dark:text-orange-400">
            out={event.output_tokens.toLocaleString()}
          </span>
          {event.tool_call_count > 0 && (
            <span className="text-xs text-muted-foreground">
              tools={event.tool_call_count}
            </span>
          )}
        </div>
        <ExpandableContent content={event.response_text} label="response" />
      </div>
    </div>
  )
}

function ToolCallEntry({ event }: { event: AiToolCallEvent }) {
  const [showDetail, setShowDetail] = useState(false)

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn(
          'rounded-full p-1.5',
          event.success
            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
            : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
        )}>
          <Wrench className="h-4 w-4" />
        </div>
        <div className="flex-1 w-px bg-border mt-2" />
      </div>
      <div className="flex-1 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            'text-xs font-medium',
            event.success
              ? 'text-amber-700 dark:text-amber-300'
              : 'text-red-700 dark:text-red-300'
          )}>
            TOOL
          </span>
          <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
            {event.tool_name}
          </code>
          {event.success ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-red-500" />
          )}
        </div>
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showDetail ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          {showDetail ? 'Hide' : 'Show'} input/output
        </button>
        {showDetail && (
          <div className="mt-2 space-y-2">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Input:</div>
              <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-40">
                {event.tool_input}
              </pre>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Output:</div>
              <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-40">
                {event.tool_output || (event.error ? `Error: ${event.error}` : '(empty)')}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CompleteEntry({ event }: { event: AiCompleteEvent }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn(
          'rounded-full p-1.5',
          event.outcome === 'success'
            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
            : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
        )}>
          {event.outcome === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-purple-700 dark:text-purple-300">COMPLETE</span>
          <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded',
            event.outcome === 'success'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
          )}>
            {event.outcome}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {event.total_turns} turns |
            {' '}{event.total_input_tokens.toLocaleString()} + {event.total_output_tokens.toLocaleString()} tokens
          </span>
        </div>
      </div>
    </div>
  )
}

export function ConversationFlow({ events }: ConversationFlowProps) {
  if (events.length === 0) {
    return <div className="text-sm text-muted-foreground">No events found</div>
  }

  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        switch (event.event) {
          case 'agent.prompt':
            return <PromptEntry key={i} event={event} />
          case 'agent.turn':
            return <TurnEntry key={i} event={event} />
          case 'agent.tool_call':
            return <ToolCallEntry key={i} event={event} />
          case 'agent.complete':
            return <CompleteEntry key={i} event={event} />
          default:
            return null
        }
      })}
    </div>
  )
}
