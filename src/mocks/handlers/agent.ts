import { http, HttpResponse } from 'msw'
import { tasks } from '../data'
import { generateId } from '../data'

const BASE_URL = 'http://localhost:8089/api/v1'

function sseEvent(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const agentHandlers = [
  // POST /agent/stream - SSE streaming endpoint
  http.post(`${BASE_URL}/agent/stream`, async ({ request }) => {
    const body = (await request.json()) as {
      message: string
      conversation_id?: string
      situation?: string
    }
    const message = body.message.toLowerCase()
    const conversationId = body.conversation_id || generateId('conv')

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        if (
          message.includes('タスク') &&
          (message.includes('見せて') || message.includes('確認') || message.includes('一覧'))
        ) {
          // Read-only: show tasks
          controller.enqueue(encoder.encode(sseEvent('text', { content: 'タスクを確認しますね。' })))
          await delay(300)

          const incompleteTasks = tasks.filter((t) => !t.completed).slice(0, 5)
          controller.enqueue(
            encoder.encode(
              sseEvent('tool_call', {
                id: 'tc_1',
                name: 'get_tasks',
                input: { completed: false },
              })
            )
          )
          await delay(500)

          controller.enqueue(
            encoder.encode(
              sseEvent('tool_result', {
                id: 'tc_1',
                name: 'get_tasks',
                result: incompleteTasks.map((t) => ({
                  id: t.id,
                  name: t.name,
                })),
              })
            )
          )
          await delay(300)

          const taskList = incompleteTasks.map((t) => `- ${t.name}`).join('\n')
          controller.enqueue(
            encoder.encode(
              sseEvent('text', {
                content: `未完了タスクが${incompleteTasks.length}件あります：\n\n${taskList}`,
              })
            )
          )
        } else if (
          message.includes('予定') &&
          (message.includes('立てて') || message.includes('作って') || message.includes('計画'))
        ) {
          // Write: propose time blocks
          controller.enqueue(
            encoder.encode(
              sseEvent('text', { content: 'タスクを確認して、今日のスケジュールを提案しますね。' })
            )
          )
          await delay(300)

          controller.enqueue(
            encoder.encode(
              sseEvent('tool_call', {
                id: 'tc_1',
                name: 'get_tasks',
                input: { completed: false },
              })
            )
          )
          await delay(500)

          const incompleteTasks = tasks.filter((t) => !t.completed).slice(0, 3)
          controller.enqueue(
            encoder.encode(
              sseEvent('tool_result', {
                id: 'tc_1',
                name: 'get_tasks',
                result: incompleteTasks.map((t) => ({ id: t.id, name: t.name })),
              })
            )
          )
          await delay(300)

          controller.enqueue(
            encoder.encode(sseEvent('text', { content: '以下のスケジュールを提案します：' }))
          )
          await delay(200)

          const actions = incompleteTasks.map((t, i) => ({
            id: `a${i + 1}`,
            type: 'create_time_block',
            description: `${9 + i * 2}:00-${10 + i * 2}:00 ${t.name}`,
            input: {
              date: new Date().toISOString().split('T')[0],
              startTime: `${String(9 + i * 2).padStart(2, '0')}:00`,
              endTime: `${String(10 + i * 2).padStart(2, '0')}:00`,
              taskId: t.id,
              title: t.name,
            },
          }))

          controller.enqueue(encoder.encode(sseEvent('action_proposal', { actions })))
        } else {
          // General chat
          controller.enqueue(
            encoder.encode(
              sseEvent('text', {
                content: `了解しました。「${body.message}」についてお手伝いします。\n\n現在の状況を確認しました。何か具体的に操作したいことがあれば教えてください。`,
              })
            )
          )
        }

        await delay(200)
        controller.enqueue(
          encoder.encode(
            sseEvent('done', {
              conversation_id: conversationId,
              tokens: { input: 500, output: 200 },
            })
          )
        )

        controller.close()
      },
    })

    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }),

  // POST /agent/approve - Execute approved actions
  http.post(`${BASE_URL}/agent/approve`, async ({ request }) => {
    const body = (await request.json()) as {
      conversation_id: string
      action_ids: string[]
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        for (const actionId of body.action_ids) {
          controller.enqueue(
            encoder.encode(
              sseEvent('tool_call', {
                id: `tc_${actionId}`,
                name: 'create_time_block',
                input: {},
              })
            )
          )
          await delay(300)

          const newBlock = {
            id: generateId('tb'),
            title: `提案されたブロック ${actionId}`,
          }
          controller.enqueue(
            encoder.encode(
              sseEvent('tool_result', {
                id: `tc_${actionId}`,
                name: 'create_time_block',
                result: newBlock,
              })
            )
          )
          await delay(200)
        }

        controller.enqueue(
          encoder.encode(
            sseEvent('text', {
              content: `${body.action_ids.length}件のタイムブロックを作成しました。`,
            })
          )
        )
        controller.enqueue(
          encoder.encode(
            sseEvent('done', {
              conversation_id: body.conversation_id,
              tokens: { input: 100, output: 50 },
            })
          )
        )
        controller.close()
      },
    })

    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }),
]
