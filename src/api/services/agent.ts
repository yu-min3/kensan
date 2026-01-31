// Agent API Service - SSE streaming for AI agent interactions
import { API_CONFIG } from '../config'
import { httpClient } from '../client'

// Types
export interface AgentStreamEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'action_proposal' | 'done' | 'error'
  data: Record<string, unknown>
}

export interface AgentStreamRequest {
  message: string
  conversation_id?: string | null
  situation?: 'auto' | 'morning' | 'evening' | 'weekly' | 'chat'
}

export interface AgentApproveRequest {
  conversation_id: string
  action_ids: string[]
}

/**
 * Parse SSE-formatted text into AgentStreamEvent array.
 * SSE format: `event: <type>\ndata: <json>\n\n`
 */
export function parseSSEEvents(text: string): AgentStreamEvent[] {
  const events: AgentStreamEvent[] = []
  const blocks = text.split('\n\n')

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue

    let eventType: string | undefined
    let eventData: string | undefined

    const lines = trimmed.split('\n')
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice('event: '.length).trim()
      } else if (line.startsWith('data: ')) {
        eventData = line.slice('data: '.length)
      }
    }

    if (eventType && eventData !== undefined) {
      try {
        const parsed = JSON.parse(eventData) as Record<string, unknown>
        events.push({
          type: eventType as AgentStreamEvent['type'],
          data: parsed,
        })
      } catch {
        // Skip malformed JSON data
      }
    }
  }

  return events
}

/**
 * Stream agent chat responses via SSE.
 * Uses raw fetch (not httpClient) to access ReadableStream on the response body.
 */
export async function* streamAgentChat(
  request: AgentStreamRequest,
  signal?: AbortSignal
): AsyncGenerator<AgentStreamEvent> {
  const url = `${API_CONFIG.baseUrls.ai}/api/v1/agent/stream`
  const authToken = httpClient.getAuthToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    signal,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Agent stream request failed [${response.status}]: ${errorText}`)
  }

  if (!response.body) {
    throw new Error('Response body is not available for streaming')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // Process any remaining data in the buffer
        if (buffer.trim()) {
          const events = parseSSEEvents(buffer)
          for (const event of events) {
            yield event
          }
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })

      // Split on double newline boundaries, keeping incomplete parts in buffer
      const parts = buffer.split('\n\n')
      // The last part may be incomplete, keep it in the buffer
      buffer = parts.pop() ?? ''

      // Process all complete blocks
      const completePart = parts.join('\n\n')
      if (completePart.trim()) {
        const events = parseSSEEvents(completePart)
        for (const event of events) {
          yield event
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Approve proposed agent actions.
 */
export async function approveActions(request: AgentApproveRequest): Promise<void> {
  await httpClient.post<void>(API_CONFIG.baseUrls.ai, '/agent/approve', request)
}
