// Observability API: Direct Loki/Tempo queries for AI Interaction Explorer

const LOKI_BASE = '/loki'
// const TEMPO_BASE = '/tempo'  // Reserved for future trace detail fetching

// ============================================
// Types
// ============================================

/** Raw Loki log entry from query_range */
interface LokiStreamEntry {
  stream: Record<string, string>
  values: [string, string][] // [nanosecond timestamp, log line]
}

interface LokiQueryResponse {
  status: string
  data: {
    resultType: string
    result: LokiStreamEntry[]
  }
}

/** OTel envelope format from loki exporter */
interface OtelLogEnvelope {
  body: string
  traceid?: string
  spanid?: string
  severity?: string
  attributes?: Record<string, unknown>
  resources?: Record<string, unknown>
}

/** Parsed AI event from log body */
export type AiEventType = 'agent.prompt' | 'agent.turn' | 'agent.tool_call' | 'agent.complete'

export interface AiEventBase {
  event: AiEventType
  conversation_id?: string
  timestamp: Date
  traceId: string
}

export interface AiPromptEvent extends AiEventBase {
  event: 'agent.prompt'
  model: string
  user_message: string
  system_prompt_length?: number
}

export interface AiTurnEvent extends AiEventBase {
  event: 'agent.turn'
  turn_number: number
  input_tokens: number
  output_tokens: number
  tool_call_count: number
  response_text: string
}

export interface AiToolCallEvent extends AiEventBase {
  event: 'agent.tool_call'
  tool_name: string
  tool_input: string
  tool_output: string
  success: boolean
  error?: string
}

export interface AiCompleteEvent extends AiEventBase {
  event: 'agent.complete'
  outcome: string
  total_turns: number
  total_input_tokens: number
  total_output_tokens: number
  pending_action_count: number
}

export type AiEvent = AiPromptEvent | AiTurnEvent | AiToolCallEvent | AiCompleteEvent

/** Aggregated interaction (one agent execution = one trace) */
export interface Interaction {
  traceId: string
  timestamp: Date
  outcome: string
  model: string
  totalTurns: number
  totalInputTokens: number
  totalOutputTokens: number
  pendingActionCount: number
  userMessage: string
  events: AiEvent[]
}

// ============================================
// Loki query helper
// ============================================

async function queryLoki(logql: string, start: string, end: string, limit = 1000): Promise<LokiStreamEntry[]> {
  const params = new URLSearchParams({
    query: logql,
    start,
    end,
    limit: String(limit),
    direction: 'forward',
  })

  const res = await fetch(`${LOKI_BASE}/loki/api/v1/query_range?${params}`)
  if (!res.ok) {
    throw new Error(`Loki query failed: ${res.status} ${res.statusText}`)
  }

  const data: LokiQueryResponse = await res.json()
  return data.data.result
}

/** Parse a single Loki log line through OTel envelope → inner JSON */
function parseLogLine(nanosTs: string, line: string): { timestamp: Date; traceId: string; body: Record<string, unknown> } | null {
  try {
    const envelope: OtelLogEnvelope = JSON.parse(line)
    const body = JSON.parse(envelope.body)
    const timestamp = new Date(Number(BigInt(nanosTs) / 1000000n))
    return {
      timestamp,
      traceId: envelope.traceid || '',
      body,
    }
  } catch {
    return null
  }
}

/** Convert parsed log body to typed AiEvent */
function toAiEvent(timestamp: Date, traceId: string, body: Record<string, unknown>): AiEvent | null {
  const event = body.event as string
  const base = { timestamp, traceId, conversation_id: body.conversation_id as string | undefined }

  switch (event) {
    case 'agent.prompt':
      return {
        ...base,
        event: 'agent.prompt',
        model: (body.model as string) || '',
        user_message: (body.user_message as string) || '',
        system_prompt_length: body.system_prompt_length as number | undefined,
      }
    case 'agent.turn':
      return {
        ...base,
        event: 'agent.turn',
        turn_number: Number(body.turn_number) || 0,
        input_tokens: Number(body.input_tokens) || 0,
        output_tokens: Number(body.output_tokens) || 0,
        tool_call_count: Number(body.tool_call_count) || 0,
        response_text: (body.response_text as string) || '',
      }
    case 'agent.tool_call':
      return {
        ...base,
        event: 'agent.tool_call',
        tool_name: (body.tool_name as string) || '',
        tool_input: (body.tool_input as string) || '',
        tool_output: (body.tool_output as string) || '',
        success: body.success === true || body.success === 'true',
        error: body.error as string | undefined,
      }
    case 'agent.complete':
      return {
        ...base,
        event: 'agent.complete',
        outcome: (body.outcome as string) || '',
        total_turns: Number(body.total_turns) || 0,
        total_input_tokens: Number(body.total_input_tokens) || 0,
        total_output_tokens: Number(body.total_output_tokens) || 0,
        pending_action_count: Number(body.pending_action_count) || 0,
      }
    default:
      return null
  }
}

// ============================================
// Public API
// ============================================

/** Fetch all AI events in a time range */
export async function fetchAiEvents(start: Date, end: Date): Promise<AiEvent[]> {
  const startStr = (start.getTime() / 1000).toFixed(0)
  const endStr = (end.getTime() / 1000).toFixed(0)

  const streams = await queryLoki(
    '{job="kensan-ai"} | json | line_format `{{.body}}` | json | event =~ `agent\\\\..+`',
    startStr,
    endStr,
  )

  const events: AiEvent[] = []
  for (const stream of streams) {
    for (const [ts, line] of stream.values) {
      const parsed = parseLogLine(ts, line)
      if (!parsed) continue
      const ev = toAiEvent(parsed.timestamp, parsed.traceId, parsed.body)
      if (ev) events.push(ev)
    }
  }

  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  return events
}

/** Fetch all events and group into Interactions by traceId */
export async function fetchInteractions(start: Date, end: Date): Promise<Interaction[]> {
  const events = await fetchAiEvents(start, end)

  const byTrace = new Map<string, AiEvent[]>()
  for (const ev of events) {
    if (!ev.traceId) continue
    const list = byTrace.get(ev.traceId) || []
    list.push(ev)
    byTrace.set(ev.traceId, list)
  }

  const interactions: Interaction[] = []

  for (const [traceId, traceEvents] of byTrace) {
    const complete = traceEvents.find((e): e is AiCompleteEvent => e.event === 'agent.complete')
    const prompt = traceEvents.find((e): e is AiPromptEvent => e.event === 'agent.prompt')

    interactions.push({
      traceId,
      timestamp: traceEvents[0].timestamp,
      outcome: complete?.outcome || 'in_progress',
      model: prompt?.model || '',
      totalTurns: complete?.total_turns || 0,
      totalInputTokens: complete?.total_input_tokens || 0,
      totalOutputTokens: complete?.total_output_tokens || 0,
      pendingActionCount: complete?.pending_action_count || 0,
      userMessage: prompt?.user_message || '',
      events: traceEvents,
    })
  }

  // Most recent first
  interactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  return interactions
}

/** Fetch events for a single trace */
export async function fetchTraceEvents(traceId: string, start: Date, end: Date): Promise<AiEvent[]> {
  const startStr = (start.getTime() / 1000).toFixed(0)
  const endStr = (end.getTime() / 1000).toFixed(0)

  // Query all AI events, then filter by traceId client-side
  // (Loki can't filter by traceid in the outer envelope directly with label matchers)
  const streams = await queryLoki(
    '{job="kensan-ai"} | json | line_format `{{.body}}` | json | event =~ `agent\\\\..+`',
    startStr,
    endStr,
  )

  const events: AiEvent[] = []
  for (const stream of streams) {
    for (const [ts, line] of stream.values) {
      const parsed = parseLogLine(ts, line)
      if (!parsed || parsed.traceId !== traceId) continue
      const ev = toAiEvent(parsed.timestamp, parsed.traceId, parsed.body)
      if (ev) events.push(ev)
    }
  }

  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  return events
}
